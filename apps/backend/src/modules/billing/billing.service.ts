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
import { EventName, type EventEntity } from '@paddle/paddle-node-sdk';
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
import { PaddleService } from './paddle.service';
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

/**
 * Normalized shape shared by `Subscription` (REST response) and the webhook
 * notification entities (`SubscriptionCreatedNotification`, etc). The field
 * names match because Paddle keeps them consistent; only `managementUrls`
 * differs (REST-only), and we don't read it here.
 */
type PaddleSubscriptionLike = {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';
  customerId: string;
  canceledAt: string | null;
  currentBillingPeriod: { startsAt: string; endsAt: string } | null;
  scheduledChange: { action: 'cancel' | 'pause' | 'resume' } | null;
  items: Array<{
    price: { id: string } | null;
    trialDates: { startsAt: string; endsAt: string } | null;
  }>;
};

type PaddleTransactionLike = {
  id: string;
  status: string;
  customerId: string | null;
  subscriptionId: string | null;
  invoiceNumber: string | null;
  billedAt: string | null;
  currencyCode: string;
  details: {
    totals: {
      grandTotal: string;
      total: string;
      currencyCode: string;
    } | null;
  } | null;
};

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
    private readonly paddleService: PaddleService,
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
   * Free plan has no Paddle-driven period → use calendar month (UTC). Paid
   * plans follow the Paddle billing cycle stored on the subscription row.
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

  // ─── Paddle: customer + checkout context ────────────────────────────────

  /**
   * Ensures the tenant has a Paddle customer id. Customers are created
   * lazily — free tenants don't get a Paddle record unless/until they try
   * to upgrade.
   */
  private async ensurePaddleCustomer(
    userId: string,
  ): Promise<{ sub: SubscriptionEntity; customerId: string }> {
    const sub = await this.getSubscriptionEntity(userId);
    if (sub.paddleCustomerId) {
      return { sub, customerId: sub.paddleCustomerId };
    }
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const customer = await this.paddleService.createCustomer(
      userId,
      user.email,
    );
    sub.paddleCustomerId = customer.id;
    const saved = await this.subscriptions.save(sub);
    return { sub: saved, customerId: customer.id };
  }

  /**
   * Unlike Stripe's server-side checkout session, Paddle's overlay runs
   * entirely in the browser — the backend only resolves which price +
   * customer to open it with. Custom data flows back as webhook metadata.
   */
  async createCheckout(
    userId: string,
    planKey: 'starter' | 'pro' | 'business',
  ): Promise<{
    priceId: string;
    customerId: string;
    customData: { userId: string };
  }> {
    const { customerId } = await this.ensurePaddleCustomer(userId);
    const ctx = this.paddleService.resolveCheckoutContext({
      customerId,
      planKey,
    });
    return { ...ctx, customData: { userId } };
  }

  /**
   * Upgrade / downgrade via Paddle API (no overlay needed). Paddle prorates
   * immediately and fires `subscription.updated`; the webhook handler does
   * the local upsert, so we don't have to parse the returned subscription
   * object here.
   */
  async changePlan(
    userId: string,
    newPlanKey: 'starter' | 'pro' | 'business',
  ): Promise<SubscriptionDto> {
    const sub = await this.getSubscriptionEntity(userId);
    if (!sub.paddleSubscriptionId) {
      throw new BadRequestException(
        'No Paddle subscription yet — start with a checkout first',
      );
    }
    const plan = getPlan(newPlanKey);
    if (!plan.paddlePriceEnv) {
      throw new ServiceUnavailableException(
        `Plan "${newPlanKey}" has no Paddle price configured`,
      );
    }
    const priceConfigKey =
      plan.paddlePriceEnv === 'PADDLE_PRICE_STARTER'
        ? 'paddle.priceStarter'
        : plan.paddlePriceEnv === 'PADDLE_PRICE_PRO'
          ? 'paddle.pricePro'
          : 'paddle.priceBusiness';
    const priceId = this.configService?.get<string>(priceConfigKey);
    if (!priceId) {
      throw new ServiceUnavailableException(
        `${plan.paddlePriceEnv} is missing — cannot change plan`,
      );
    }
    await this.paddleService.updateSubscriptionItems(
      sub.paddleSubscriptionId,
      priceId,
    );
    // Don't wait on the webhook — Paddle returns the updated subscription
    // synchronously, so we can reconcile here for an instant UI reflect.
    const latest = await this.paddleService.retrieveSubscription(
      sub.paddleSubscriptionId,
    );
    await this.upsertFromPaddle(latest);
    return this.getSubscription(userId);
  }

  async getPaymentMethodUpdateUrl(userId: string): Promise<{ url: string }> {
    const sub = await this.getSubscriptionEntity(userId);
    if (!sub.paddleSubscriptionId) {
      throw new BadRequestException(
        'No Paddle subscription yet — complete an upgrade first',
      );
    }
    const url = await this.paddleService.getPaymentMethodUpdateUrl(
      sub.paddleSubscriptionId,
    );
    if (!url) {
      throw new ServiceUnavailableException(
        'Paddle did not return a payment-method-update URL',
      );
    }
    return { url };
  }

  async cancelSubscription(userId: string): Promise<SubscriptionDto> {
    const sub = await this.getSubscriptionEntity(userId);
    if (!sub.paddleSubscriptionId) {
      throw new BadRequestException('No Paddle subscription to cancel');
    }
    const latest = await this.paddleService.cancelSubscription(
      sub.paddleSubscriptionId,
    );
    await this.upsertFromPaddle(latest);
    return this.getSubscription(userId);
  }

  // ─── Webhook dispatch ───────────────────────────────────────────────────

  /**
   * Idempotency: inserts the event id; if the INSERT affects zero rows the
   * event was already processed, so we skip. Any race between concurrent
   * deliveries is resolved by the UNIQUE(paddleEventId) index.
   */
  private async claimEvent(event: EventEntity): Promise<boolean> {
    const result: { id: string }[] = await this.processedEvents.query(
      `INSERT INTO processed_webhook_events ("paddleEventId", "type")
       VALUES ($1, $2) ON CONFLICT ("paddleEventId") DO NOTHING
       RETURNING "id"`,
      [event.eventId, event.eventType],
    );
    return result.length > 0;
  }

  async handlePaddleEvent(event: EventEntity): Promise<void> {
    const claimed = await this.claimEvent(event);
    if (!claimed) {
      this.logger.debug(
        `Skipping duplicate Paddle event ${event.eventId} (${event.eventType})`,
      );
      return;
    }

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing: {
        await this.upsertFromPaddle(
          event.data as unknown as PaddleSubscriptionLike,
        );
        break;
      }
      case EventName.TransactionCompleted:
      case EventName.TransactionBilled:
      case EventName.TransactionPaid:
      case EventName.TransactionPaymentFailed: {
        await this.upsertTransactionAsInvoice(
          event.data as unknown as PaddleTransactionLike,
        );
        break;
      }
      default:
        // Paddle sends many more event types — ignore the ones we don't
        // care about. They still count as "processed" for idempotency.
        this.logger.debug(`Ignoring Paddle event type ${event.eventType}`);
    }
  }

  /**
   * Map a Paddle Subscription snapshot (REST response or webhook payload)
   * into our row. Looked up by `paddleSubscriptionId` first (fast path on
   * subsequent updates), falling back to `paddleCustomerId` (for the first
   * `subscription.created` event that sets the id). If neither match we
   * refuse to create a stranded row.
   */
  private async upsertFromPaddle(
    paddleSub: PaddleSubscriptionLike,
  ): Promise<void> {
    let sub = await this.subscriptions.findOne({
      where: { paddleSubscriptionId: paddleSub.id },
    });
    if (!sub) {
      sub = await this.subscriptions.findOne({
        where: { paddleCustomerId: paddleSub.customerId },
      });
    }
    if (!sub) {
      this.logger.warn(
        `Received Paddle subscription ${paddleSub.id} for unknown tenant — ignoring`,
      );
      return;
    }

    const planKey = planKeyFromPaddleSubscription(
      paddleSub,
      this.configService,
    );
    if (planKey) sub.planKey = planKey;

    sub.paddleSubscriptionId = paddleSub.id;
    sub.status = paddleStatusToLocal(paddleSub.status);
    sub.currentPeriodStart = paddleSub.currentBillingPeriod?.startsAt
      ? new Date(paddleSub.currentBillingPeriod.startsAt)
      : null;
    sub.currentPeriodEnd = paddleSub.currentBillingPeriod?.endsAt
      ? new Date(paddleSub.currentBillingPeriod.endsAt)
      : null;
    sub.cancelAtPeriodEnd = paddleSub.scheduledChange?.action === 'cancel';
    const firstItemTrial = paddleSub.items?.[0]?.trialDates?.endsAt;
    sub.trialEndsAt = firstItemTrial ? new Date(firstItemTrial) : null;

    // When Paddle declares the subscription fully terminated (canceled and
    // the cancellation is no longer scheduled) we snap back to the free
    // plan so UI doesn't leave the owner on a stale paid state.
    if (
      paddleSub.status === 'canceled' &&
      !sub.cancelAtPeriodEnd &&
      paddleSub.canceledAt
    ) {
      sub.planKey = 'free';
      sub.paddleSubscriptionId = null;
    }

    await this.subscriptions.save(sub);
  }

  private async upsertTransactionAsInvoice(
    tx: PaddleTransactionLike,
  ): Promise<void> {
    if (!tx.customerId) return;

    const sub = await this.subscriptions.findOne({
      where: { paddleCustomerId: tx.customerId },
    });
    if (!sub) {
      this.logger.warn(
        `Transaction ${tx.id} for unknown customer ${tx.customerId}; ignoring`,
      );
      return;
    }

    const existing = await this.invoices.findOne({
      where: { paddleTransactionId: tx.id },
    });

    const totals = tx.details?.totals;
    // Paddle returns major-unit strings (e.g. "49.00") — not cents. Pass
    // through as-is; the decimal column keeps precision.
    const grandTotal = totals?.grandTotal ?? totals?.total ?? '0';
    const currency = totals?.currencyCode ?? tx.currencyCode;
    const billedAt = tx.billedAt ? new Date(tx.billedAt) : null;

    const row =
      existing ??
      this.invoices.create({
        userId: sub.userId,
        paddleTransactionId: tx.id,
      });

    row.paddleSubscriptionId = tx.subscriptionId ?? sub.paddleSubscriptionId;
    row.amountDue = grandTotal;
    // Paddle status of `completed` / `paid` / `billed` → we consider it paid.
    const paid =
      tx.status === 'completed' ||
      tx.status === 'paid' ||
      tx.status === 'billed';
    row.amountPaid = paid ? grandTotal : '0';
    row.currency = currency;
    row.status = tx.status;
    row.hostedInvoiceUrl = null; // Paddle has no hosted equivalent.
    row.invoicePdfUrl = null; // Fetched on-demand per view — see PaddleService.
    row.periodStart = billedAt;
    row.periodEnd = null;
    row.paidAt = paid ? billedAt : null;

    await this.invoices.save(row);
  }

  /**
   * Cleanup worker called by `BillingCronService` — keeps
   * `processed_webhook_events` from growing unboundedly. Paddle only retries
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
   * Defensive reconcile: walk every subscription that has a Paddle id and
   * pull its authoritative state back from Paddle. Protects against missed
   * or out-of-order webhooks.
   */
  async reconcileAllSubscriptions(): Promise<{ reconciled: number }> {
    if (!this.paddleService.isConfigured()) return { reconciled: 0 };
    const rows = await this.subscriptions.find({});
    let count = 0;
    for (const row of rows) {
      if (!row.paddleSubscriptionId) continue;
      try {
        const paddleSub = await this.paddleService.retrieveSubscription(
          row.paddleSubscriptionId,
        );
        await this.upsertFromPaddle(paddleSub);
        count++;
      } catch (err) {
        this.logger.warn(
          `Reconcile failed for ${row.paddleSubscriptionId}: ${
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

  /**
   * On-demand PDF URL fetch for a single invoice. Paddle re-signs the URL
   * per call (short-lived), so we never cache it — always refetch.
   *
   * Paddle doesn't issue PDFs for trial / $0 / not-yet-billed transactions
   * — the API returns an error on those. We translate that to 404 so the
   * frontend can distinguish "no PDF available" from "server bug".
   */
  async getInvoicePdfUrl(
    userId: string,
    invoiceId: string,
  ): Promise<{ url: string }> {
    const row = await this.invoices.findOne({
      where: { id: invoiceId, userId },
    });
    if (!row) throw new NotFoundException('Invoice not found');
    try {
      const pdf = await this.paddleService.getInvoicePdf(
        row.paddleTransactionId,
      );
      return { url: pdf.url };
    } catch (err) {
      this.logger.warn(
        `No PDF for paddle transaction ${row.paddleTransactionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new NotFoundException(
        'PDF not available for this transaction yet',
      );
    }
  }
}

/** Map Paddle's subscription status strings to our local ones. */
function paddleStatusToLocal(
  status: PaddleSubscriptionLike['status'],
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
    case 'paused':
      return 'paused';
    default:
      return 'active';
  }
}

/**
 * Figure out which of our plan keys corresponds to the Paddle subscription's
 * active price. Relies on config to map Price id → plan key. Returns null
 * if we can't determine (unusual — we'd only create subscriptions with our
 * own price ids).
 */
function planKeyFromPaddleSubscription(
  paddleSub: PaddleSubscriptionLike,
  config: ConfigService | undefined,
): PlanKey | null {
  const firstPriceId = paddleSub.items?.[0]?.price?.id;
  if (!firstPriceId || !config) return null;
  if (firstPriceId === config.get<string>('paddle.priceStarter'))
    return 'starter';
  if (firstPriceId === config.get<string>('paddle.pricePro')) return 'pro';
  if (firstPriceId === config.get<string>('paddle.priceBusiness'))
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
