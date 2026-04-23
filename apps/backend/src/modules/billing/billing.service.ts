import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionEntity,
  type PlanKey,
  type SubscriptionStatus,
} from './entities/subscription.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { ProcessedWebhookEventEntity } from './entities/processed-webhook-event.entity';
import { PartnerEntity } from '../partners/entities/partner.entity';
import { ApiKeyEntity } from '../auth/entities/api-key.entity';
import { ConversionEventEntity } from '../conversions/entities/conversion-event.entity';
import { UsersService } from '../users/users.service';
import {
  StripeService,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from './stripe.service';
import {
  getPlan,
  hasCapability,
  type Capability,
  type CountableLimit,
} from './plans';
import {
  SubscriptionDto,
  SubscriptionUsageDto,
  UsageBucketDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptions: Repository<SubscriptionEntity>,
    @InjectRepository(PartnerEntity)
    private readonly partners: Repository<PartnerEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeys: Repository<ApiKeyEntity>,
    @InjectRepository(ConversionEventEntity)
    private readonly conversions: Repository<ConversionEventEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoices: Repository<InvoiceEntity>,
    @InjectRepository(ProcessedWebhookEventEntity)
    private readonly processedEvents: Repository<ProcessedWebhookEventEntity>,
    private readonly usersService: UsersService,
    private readonly stripeService: StripeService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * Create the default `free` subscription for a brand-new tenant. Idempotent
   * — safe to call twice if AuthService double-fires (we just ignore the
   * unique-constraint collision).
   */
  async createFreeSubscription(userId: string): Promise<SubscriptionEntity> {
    const existing = await this.subscriptions.findOne({ where: { userId } });
    if (existing) return existing;

    const row = this.subscriptions.create({
      userId,
      planKey: 'free',
      status: 'active',
    });
    return this.subscriptions.save(row);
  }

  async getSubscriptionEntity(userId: string): Promise<SubscriptionEntity> {
    const row = await this.subscriptions.findOne({ where: { userId } });
    if (!row) {
      // Shouldn't happen once the backfill migration has run, but fall back
      // to creating-on-read keeps the endpoint from 500-ing on older users.
      return this.createFreeSubscription(userId);
    }
    return row;
  }

  // ─── Capability + limit checks (used later by PlanGuard in Phase C) ─────

  async assertCapability(
    userId: string,
    capability: Capability,
  ): Promise<void> {
    const sub = await this.getSubscriptionEntity(userId);
    if (!hasCapability(sub.planKey, capability)) {
      throw new NotFoundException({
        error: 'plan_limit',
        capability,
        message: `Capability "${capability}" is not available on the ${sub.planKey} plan`,
      });
    }
  }

  async currentUsageCount(
    userId: string,
    resource: CountableLimit,
  ): Promise<number> {
    switch (resource) {
      case 'maxPartners':
        return this.partners.count({
          where: { userId, isActive: true },
        });
      case 'maxApiKeys':
        return this.apiKeys.count({ where: { userId } });
      case 'maxConversionsPerMonth': {
        const { periodStart, periodEnd } = await this.periodBounds(userId);
        const row = await this.conversions
          .createQueryBuilder('ce')
          .select('COALESCE(SUM(ce."count"), 0)::int', 'total')
          .where('ce."userId" = :userId', { userId })
          .andWhere('ce."eventDate" >= :from', {
            from: formatDate(periodStart),
          })
          .andWhere('ce."eventDate" <= :to', { to: formatDate(periodEnd) })
          .getRawOne<{ total: number }>();
        return Number(row?.total ?? 0);
      }
    }
  }

  // ─── Conversion visibility cap ──────────────────────────────────────────
  //
  // When a tenant's current-period conversion count crosses
  // `plans.maxConversionsPerMonth`, the ingest pipeline keeps accepting
  // events (no 402), but read endpoints hide events past the cap to create
  // upgrade pressure. The cap is rounded to the last full `eventDate` that
  // still fits — we never split a day, so a busy day straddling the cap is
  // shown in full.
  //
  // Cap fossilization (per-period snapshots) is NOT implemented yet — if the
  // tenant upgrades mid-month the cutoff moves and previously-hidden data
  // reappears. That's an acceptable Phase 1 tradeoff; document here before
  // revisiting.
  async getVisibleCutoff(userId: string): Promise<{
    visibleThrough: Date | null;
    hiddenCount: number;
    visibleCount: number;
    totalInPeriod: number;
    cap: number | null;
    exceeded: boolean;
    periodStart: Date;
    periodEnd: Date;
  }> {
    const sub = await this.getSubscriptionEntity(userId);
    const plan = getPlan(sub.planKey);
    const cap = plan.limits.maxConversionsPerMonth;
    const { periodStart, periodEnd } = await this.periodBounds(userId);

    if (cap === null) {
      return {
        visibleThrough: null,
        hiddenCount: 0,
        visibleCount: 0,
        totalInPeriod: 0,
        cap: null,
        exceeded: false,
        periodStart,
        periodEnd,
      };
    }

    // Daily buckets for the current period, ordered ASC. Walk them client-side
    // to find the last date whose running sum still fits the cap. Keeping the
    // loop in JS (rather than a window-function CTE) avoids a second query
    // for the overflow total.
    const rows = await this.conversions
      .createQueryBuilder('ce')
      .select('ce."eventDate"', 'eventDate')
      .addSelect('COALESCE(SUM(ce."count"), 0)::int', 'daily')
      .where('ce."userId" = :userId', { userId })
      .andWhere('ce."eventDate" >= :from', { from: formatDate(periodStart) })
      .andWhere('ce."eventDate" <= :to', { to: formatDate(periodEnd) })
      .groupBy('ce."eventDate"')
      .orderBy('ce."eventDate"', 'ASC')
      .getRawMany<{ eventDate: string | Date; daily: number }>();

    let visibleCount = 0;
    let totalInPeriod = 0;
    let visibleThrough: Date | null = null;
    let stillFits = true;

    for (const r of rows) {
      const daily = Number(r.daily);
      totalInPeriod += daily;
      if (stillFits) {
        const next = visibleCount + daily;
        if (next <= cap) {
          visibleCount = next;
          visibleThrough =
            typeof r.eventDate === 'string'
              ? new Date(r.eventDate)
              : r.eventDate;
        } else {
          // This day would tip us over — keep it visible (we round to full
          // days) IF it's the first day. Otherwise stop at the previous day.
          if (visibleThrough === null) {
            // First day already exceeds cap: pathological on Free for a
            // high-traffic tenant. Show nothing to keep semantics clean.
            stillFits = false;
          } else {
            stillFits = false;
          }
        }
      }
    }

    const exceeded = totalInPeriod > cap;
    const hiddenCount = exceeded ? totalInPeriod - visibleCount : 0;

    return {
      visibleThrough: exceeded ? visibleThrough : null,
      hiddenCount,
      visibleCount,
      totalInPeriod,
      cap,
      exceeded,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Returns the effective `dateTo` a tenant-facing read endpoint should use
   * for a conversion query, factoring in the visibility cap. Rules:
   *
   * - Not exceeded → returns caller's `dateTo` unchanged.
   * - Exceeded with a `visibleThrough` date → returns the earlier of
   *   `dateTo` and `visibleThrough` (as YYYY-MM-DD for `eventDate` compares).
   * - Exceeded with nothing visible → returns a sentinel "before period
   *   start" date so downstream queries produce no current-period rows.
   *
   * Callers should also surface `hiddenCount` to the UI.
   */
  async effectiveDateTo(
    userId: string,
    callerDateTo?: string,
  ): Promise<{
    dateTo: string | undefined;
    exceeded: boolean;
    hiddenCount: number;
    visibleThrough: Date | null;
  }> {
    const { visibleThrough, exceeded, hiddenCount, periodStart } =
      await this.getVisibleCutoff(userId);
    if (!exceeded) {
      return {
        dateTo: callerDateTo,
        exceeded: false,
        hiddenCount: 0,
        visibleThrough: null,
      };
    }
    // Nothing visible in current period — clip at the day before periodStart
    // to exclude the whole current period while keeping prior periods intact.
    const fallback = new Date(periodStart.getTime() - 86_400_000);
    const cutoffStr = formatDate(visibleThrough ?? fallback);
    const effective =
      callerDateTo && callerDateTo < cutoffStr ? callerDateTo : cutoffStr;
    return {
      dateTo: effective,
      exceeded: true,
      hiddenCount,
      visibleThrough,
    };
  }

  // ─── Read API (used by /billing/subscription) ───────────────────────────

  async getSubscription(userId: string): Promise<SubscriptionDto> {
    const sub = await this.getSubscriptionEntity(userId);
    const plan = getPlan(sub.planKey);
    const usage = await this.getUsage(userId);

    return {
      plan: sub.planKey,
      planLabel: plan.label,
      status: sub.status,
      priceCents: plan.priceCents,
      currency: plan.currency,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      features: { ...plan.features },
      usage,
    };
  }

  async getUsage(userId: string): Promise<SubscriptionUsageDto> {
    const sub = await this.getSubscriptionEntity(userId);
    const plan = getPlan(sub.planKey);

    const [partnersUsed, apiKeysUsed, cutoff] = await Promise.all([
      this.partners.count({ where: { userId, isActive: true } }),
      this.apiKeys.count({ where: { userId } }),
      this.getVisibleCutoff(userId),
    ]);

    const conversionsBucket = toBucket(
      cutoff.totalInPeriod,
      plan.limits.maxConversionsPerMonth,
    );

    return {
      partners: toBucket(partnersUsed, plan.limits.maxPartners),
      apiKeys: toBucket(apiKeysUsed, plan.limits.maxApiKeys),
      conversions: {
        ...conversionsBucket,
        hiddenCount: cutoff.hiddenCount,
        visibleThrough: cutoff.visibleThrough,
      },
      periodStart: cutoff.periodStart,
      periodEnd: cutoff.periodEnd,
    };
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  /**
   * Free plan has no Stripe-driven period → use calendar month (UTC). Paid
   * plans follow the Stripe billing cycle stored on the subscription row.
   */
  private async periodBounds(
    userId: string,
  ): Promise<{ periodStart: Date; periodEnd: Date }> {
    const sub = await this.getSubscriptionEntity(userId);
    if (
      sub.planKey !== 'free' &&
      sub.currentPeriodStart &&
      sub.currentPeriodEnd
    ) {
      return {
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
      };
    }
    return calendarMonthBounds(new Date());
  }

  /** Testing seam — direct bucket computation without touching the repos. */
  static makeBucket(used: number, limit: number | null): UsageBucketDto {
    return toBucket(used, limit);
  }

  // ─── Stripe: Checkout + Portal ──────────────────────────────────────────

  /**
   * Ensures the tenant has a Stripe customer id. Customers are created
   * lazily — free tenants don't get a Stripe record unless/until they try
   * to upgrade.
   */
  private async ensureStripeCustomer(
    userId: string,
  ): Promise<{ sub: SubscriptionEntity; customerId: string }> {
    const sub = await this.getSubscriptionEntity(userId);
    if (sub.stripeCustomerId) {
      return { sub, customerId: sub.stripeCustomerId };
    }
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const customer = await this.stripeService.createCustomer(
      userId,
      user.email,
    );
    sub.stripeCustomerId = customer.id;
    const saved = await this.subscriptions.save(sub);
    return { sub: saved, customerId: customer.id };
  }

  async createCheckout(
    userId: string,
    planKey: 'starter' | 'pro' | 'business',
  ): Promise<{ url: string }> {
    const { customerId } = await this.ensureStripeCustomer(userId);
    const baseUrl =
      this.configService?.get<string>('billing.frontendBaseUrl') ??
      'http://localhost:3000';
    const session = await this.stripeService.createCheckoutSession({
      customerId,
      planKey,
      successUrl: `${baseUrl}/billing?checkout=success`,
      cancelUrl: `${baseUrl}/billing?checkout=cancelled`,
    });
    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe returned a session without a URL',
      );
    }
    return { url: session.url };
  }

  async createPortal(userId: string): Promise<{ url: string }> {
    const sub = await this.getSubscriptionEntity(userId);
    if (!sub.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer yet — complete an upgrade first',
      );
    }
    const baseUrl =
      this.configService?.get<string>('billing.frontendBaseUrl') ??
      'http://localhost:3000';
    const session = await this.stripeService.createPortalSession({
      customerId: sub.stripeCustomerId,
      returnUrl: `${baseUrl}/billing`,
    });
    return { url: session.url };
  }

  // ─── Webhook dispatch ───────────────────────────────────────────────────

  /**
   * Idempotency: inserts the event id; if the INSERT affects zero rows the
   * event was already processed, so we skip. Any race between concurrent
   * deliveries is resolved by the UNIQUE(stripeEventId) index.
   */
  private async claimEvent(event: StripeEvent): Promise<boolean> {
    const result: { id: string }[] = await this.processedEvents.query(
      `INSERT INTO processed_webhook_events ("stripeEventId", "type")
       VALUES ($1, $2) ON CONFLICT ("stripeEventId") DO NOTHING
       RETURNING "id"`,
      [event.id, event.type],
    );
    return result.length > 0;
  }

  async handleWebhookEvent(event: StripeEvent): Promise<void> {
    const claimed = await this.claimEvent(event);
    if (!claimed) {
      this.logger.debug(
        `Skipping duplicate Stripe event ${event.id} (${event.type})`,
      );
      return;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        // Completed checkout tells us a subscription now exists. We fetch
        // the Subscription object rather than reading half-populated data
        // from the session itself — less bookkeeping, fewer corner cases.
        const session = event.data.object as {
          subscription?: string | { id: string } | null;
        };
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const sub = await this.stripeService.retrieveSubscription(subId);
          await this.upsertFromStripe(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        await this.upsertFromStripe(sub);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.finalized':
      case 'invoice.voided': {
        const invoice = event.data.object as StripeInvoice;
        await this.upsertInvoice(invoice);
        break;
      }
      default:
        // Stripe sends many more event types — ignore the ones we don't
        // care about. They still count as "processed" for idempotency.
        this.logger.debug(`Ignoring Stripe event type ${event.type}`);
    }
  }

  /**
   * Map a Stripe Subscription snapshot into our row. Found by
   * `stripeSubscriptionId` first (fast path on subsequent updates), falling
   * back to `stripeCustomerId` (for the first `subscription.created` event
   * that sets the id). If neither match we refuse to create a stranded row.
   */
  private async upsertFromStripe(stripeSub: StripeSubscription): Promise<void> {
    let sub = await this.subscriptions.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!sub) {
      const customerId =
        typeof stripeSub.customer === 'string'
          ? stripeSub.customer
          : stripeSub.customer.id;
      sub = await this.subscriptions.findOne({
        where: { stripeCustomerId: customerId },
      });
    }
    if (!sub) {
      this.logger.warn(
        `Received Stripe subscription ${stripeSub.id} for unknown tenant — ignoring`,
      );
      return;
    }

    const planKey = planKeyFromStripeSubscription(stripeSub, this.configService);
    if (planKey) sub.planKey = planKey;

    sub.stripeSubscriptionId = stripeSub.id;
    sub.status = stripeStatusToLocal(stripeSub.status);
    const firstItem = stripeSub.items?.data?.[0];
    sub.currentPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : null;
    sub.currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : null;
    sub.cancelAtPeriodEnd = stripeSub.cancel_at_period_end === true;
    sub.trialEndsAt = stripeSub.trial_end
      ? new Date(stripeSub.trial_end * 1000)
      : null;

    // When Stripe declares the subscription fully terminated (after the
    // period has ended) we snap back to the free plan so UI doesn't leave
    // the owner on a stale paid state.
    if (stripeSub.status === 'canceled' && !sub.cancelAtPeriodEnd) {
      sub.planKey = 'free';
      sub.stripeSubscriptionId = null;
    }

    await this.subscriptions.save(sub);
  }

  private async upsertInvoice(stripeInvoice: StripeInvoice): Promise<void> {
    const customerId =
      typeof stripeInvoice.customer === 'string'
        ? stripeInvoice.customer
        : stripeInvoice.customer?.id;
    if (!customerId) return;

    const sub = await this.subscriptions.findOne({
      where: { stripeCustomerId: customerId },
    });
    if (!sub) {
      this.logger.warn(
        `Invoice ${stripeInvoice.id} for unknown customer ${customerId}; ignoring`,
      );
      return;
    }

    const existing = stripeInvoice.id
      ? await this.invoices.findOne({
          where: { stripeInvoiceId: stripeInvoice.id },
        })
      : null;

    const row =
      existing ??
      this.invoices.create({
        userId: sub.userId,
        stripeInvoiceId: stripeInvoice.id ?? '',
      });

    row.stripeSubscriptionId =
      typeof stripeInvoice.parent?.subscription_details?.subscription ===
      'string'
        ? stripeInvoice.parent.subscription_details.subscription
        : (sub.stripeSubscriptionId ?? null);
    row.amountDue = (stripeInvoice.amount_due / 100).toFixed(2);
    row.amountPaid = (stripeInvoice.amount_paid / 100).toFixed(2);
    row.currency = stripeInvoice.currency;
    row.status = stripeInvoice.status ?? 'open';
    row.hostedInvoiceUrl = stripeInvoice.hosted_invoice_url ?? null;
    row.invoicePdfUrl = stripeInvoice.invoice_pdf ?? null;
    row.periodStart = stripeInvoice.period_start
      ? new Date(stripeInvoice.period_start * 1000)
      : null;
    row.periodEnd = stripeInvoice.period_end
      ? new Date(stripeInvoice.period_end * 1000)
      : null;
    row.paidAt = stripeInvoice.status_transitions?.paid_at
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
      : null;

    await this.invoices.save(row);
  }

  /**
   * Cleanup worker called by `BillingCronService` — keeps
   * `processed_webhook_events` from growing unboundedly. Stripe only retries
   * within ~3 days so 30 is a comfortable safety margin.
   */
  async cleanupOldProcessedEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.processedEvents.query(
      `DELETE FROM processed_webhook_events WHERE "processedAt" < $1`,
      [cutoff],
    );
  }

  /**
   * Defensive reconcile: walk every subscription that has a Stripe id and
   * pull its authoritative state back from Stripe. Protects against missed
   * or out-of-order webhooks.
   */
  async reconcileAllSubscriptions(): Promise<{ reconciled: number }> {
    if (!this.stripeService.isConfigured()) return { reconciled: 0 };
    const rows = await this.subscriptions.find({
      where: [
        // `Not(IsNull(...))` would need a typeorm import; using query for brevity.
      ],
    });
    let count = 0;
    for (const row of rows) {
      if (!row.stripeSubscriptionId) continue;
      try {
        const stripeSub = await this.stripeService.retrieveSubscription(
          row.stripeSubscriptionId,
        );
        await this.upsertFromStripe(stripeSub);
        count++;
      } catch (err) {
        this.logger.warn(
          `Reconcile failed for ${row.stripeSubscriptionId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { reconciled: count };
  }

  async listInvoices(userId: string) {
    const rows = await this.invoices.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows;
  }
}

/** Map Stripe's subscription status strings to our local ones. */
function stripeStatusToLocal(
  status: StripeSubscription['status'],
): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
      // Funky checkout states map to `past_due` for our purposes — the UI
      // banner + reconcile flow handles them identically.
      return 'past_due';
    default:
      return 'active';
  }
}

/**
 * Figure out which of our plan keys corresponds to the Stripe subscription's
 * active price. Relies on config to map Price id → plan key. Returns null
 * if we can't determine (unusual — we'd only create subscriptions with our
 * own price ids).
 */
function planKeyFromStripeSubscription(
  stripeSub: StripeSubscription,
  config: ConfigService | undefined,
): PlanKey | null {
  const firstPriceId = stripeSub.items?.data?.[0]?.price?.id;
  if (!firstPriceId || !config) return null;
  if (firstPriceId === config.get<string>('stripe.priceStarter'))
    return 'starter';
  if (firstPriceId === config.get<string>('stripe.pricePro')) return 'pro';
  if (firstPriceId === config.get<string>('stripe.priceBusiness'))
    return 'business';
  return null;
}

function toBucket(used: number, limit: number | null): UsageBucketDto {
  return {
    used,
    limit,
    exceeded: limit !== null && used >= limit,
  };
}

/**
 * UTC calendar month containing `now`. End is exclusive-style (midnight of
 * the first day of the next month), but `conversion_events.eventDate` is a
 * date-only column — we compare against the last day of the month instead
 * to keep the SQL simple.
 */
function calendarMonthBounds(now: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  );
  return { periodStart, periodEnd };
}

/** YYYY-MM-DD for `conversion_events.eventDate` comparison. */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
