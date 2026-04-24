import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Environment,
  Paddle,
  type Customer,
  type EventEntity,
  type Subscription,
  type Transaction,
  type TransactionInvoicePDF,
} from '@paddle/paddle-node-sdk';
import type { PlanKey } from './entities/subscription.entity';
import { getPlan } from './plans';

/**
 * Thin wrapper around `@paddle/paddle-node-sdk`. The SDK client is
 * instantiated lazily — in dev/CI environments without `PADDLE_API_KEY`
 * nothing fails at boot; only callers that actually need Paddle (checkout,
 * change-plan, webhook verification) hit a clear ServiceUnavailableException.
 *
 * This split keeps the free-plan read-only path (Phase A) working on
 * machines with no Paddle account configured — useful for local dev, CI and
 * running migrations on a fresh deployment before the billing keys are set.
 */
@Injectable()
export class PaddleService {
  private readonly logger = new Logger(PaddleService.name);
  private client: Paddle | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Returns true if we have enough config to talk to Paddle at all. */
  isConfigured(): boolean {
    return !!this.config.get<string>('paddle.apiKey');
  }

  /** Lazily-constructed Paddle client. Throws 503 if keys are missing. */
  private get paddle(): Paddle {
    if (this.client) return this.client;
    const key = this.config.get<string>('paddle.apiKey');
    if (!key) {
      throw new ServiceUnavailableException(
        'Paddle is not configured on this server (PADDLE_API_KEY missing)',
      );
    }
    const env = this.config.get<string>('paddle.environment');
    this.client = new Paddle(key, {
      environment:
        env === 'production' ? Environment.production : Environment.sandbox,
    });
    return this.client;
  }

  // ─── Customer ────────────────────────────────────────────────────────

  createCustomer(userId: string, email: string): Promise<Customer> {
    return this.paddle.customers.create({
      email,
      // `userId` goes into `custom_data` so a Paddle dashboard user can find
      // our tenant id from a customer record without joining any database.
      customData: { userId },
    });
  }

  // ─── Checkout (overlay context for the frontend) ─────────────────────

  /**
   * Resolves the price id + customer id that the frontend will feed into
   * `Paddle.Checkout.open(...)`. Unlike Stripe, there is no server-side
   * checkout "session" to return a URL for — the overlay runs fully in the
   * browser. We just hand the client the ids it needs.
   */
  resolveCheckoutContext(args: {
    customerId: string;
    planKey: Exclude<PlanKey, 'free'>;
  }): { priceId: string; customerId: string } {
    const plan = getPlan(args.planKey);
    const priceEnv = plan.paddlePriceEnv;
    if (!priceEnv) {
      throw new ServiceUnavailableException(
        `Plan "${args.planKey}" has no Paddle price configured`,
      );
    }
    const priceConfigKey =
      priceEnv === 'PADDLE_PRICE_STARTER'
        ? 'paddle.priceStarter'
        : priceEnv === 'PADDLE_PRICE_PRO'
          ? 'paddle.pricePro'
          : 'paddle.priceBusiness';
    const priceId = this.config.get<string>(priceConfigKey);
    if (!priceId) {
      throw new ServiceUnavailableException(
        `${priceEnv} env variable is missing — cannot open Paddle checkout for ${args.planKey}`,
      );
    }
    return { priceId, customerId: args.customerId };
  }

  // ─── Subscription management ─────────────────────────────────────────

  updateSubscriptionItems(
    subscriptionId: string,
    priceId: string,
  ): Promise<Subscription> {
    return this.paddle.subscriptions.update(subscriptionId, {
      items: [{ priceId, quantity: 1 }],
      // Charge the price difference right away; Paddle prorates. If we ever
      // want "change next billing period" semantics, swap to
      // `prorated_next_billing_period`.
      prorationBillingMode: 'prorated_immediately',
    });
  }

  cancelSubscription(subscriptionId: string): Promise<Subscription> {
    // Cancel at period end so the customer keeps access for what they
    // already paid for — matches the "cancel at period end" Stripe pattern.
    return this.paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    });
  }

  /**
   * Returns a one-time, signed URL that the customer can use to add/update
   * their saved payment method without touching the overlay. Paddle issues
   * this URL on the Subscription object itself — no extra API call shape.
   */
  async getPaymentMethodUpdateUrl(
    subscriptionId: string,
  ): Promise<string | null> {
    const sub = await this.paddle.subscriptions.get(subscriptionId);
    return sub.managementUrls?.updatePaymentMethod ?? null;
  }

  // ─── Webhook + retrieval ─────────────────────────────────────────────

  /**
   * Verify signature and parse an incoming webhook payload. The raw body
   * must be the exact bytes Paddle POSTed (not re-stringified JSON) —
   * signature verification will fail otherwise. NestJS exposes this via
   * `req.rawBody` (enabled in main.ts).
   *
   * Paddle's SDK requires a string body, so we decode the Buffer as UTF-8.
   */
  async constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Promise<EventEntity> {
    const secret = this.config.get<string>('paddle.webhookSecret');
    if (!secret) {
      throw new ServiceUnavailableException(
        'PADDLE_WEBHOOK_SECRET is not configured',
      );
    }
    return this.paddle.webhooks.unmarshal(
      rawBody.toString('utf8'),
      secret,
      signature,
    );
  }

  retrieveSubscription(subscriptionId: string): Promise<Subscription> {
    return this.paddle.subscriptions.get(subscriptionId);
  }

  retrieveTransaction(transactionId: string): Promise<Transaction> {
    return this.paddle.transactions.get(transactionId);
  }

  /**
   * Paddle does not ship a persistent hosted-invoice URL. To offer a PDF
   * download link in the UI we have to hit this endpoint per-view — cheap
   * (one API call), but deliberately not mirrored into our `invoices` row.
   */
  getInvoicePdf(transactionId: string): Promise<TransactionInvoicePDF> {
    return this.paddle.transactions.getInvoicePDF(transactionId);
  }
}
