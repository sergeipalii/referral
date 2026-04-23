import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Stripe v22 publishes CJS types under the `StripeConstructor` namespace that
// does NOT re-export the runtime `Stripe.Checkout.Session` / `Stripe.Event`
// etc. aliases. The official import form still works at runtime — we just
// avoid referencing `Stripe.Checkout.Session` style types and let callers
// infer return types from the SDK method signatures instead.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import { PlanKey } from './entities/subscription.entity';
import { getPlan } from './plans';

/**
 * Thin wrapper around the `stripe` SDK. The SDK client is instantiated
 * lazily — in dev/CI environments without `STRIPE_SECRET_KEY` nothing fails
 * at boot; only callers that actually need Stripe (checkout, portal, webhook
 * verification) hit a clear ServiceUnavailableException.
 *
 * This split keeps the free-plan read-only path (Phase A) working on
 * machines with no Stripe account configured — useful for local dev, CI and
 * running migrations on a fresh deployment before the billing keys are set.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: ReturnType<typeof Stripe> | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Returns true if we have enough config to talk to Stripe at all. */
  isConfigured(): boolean {
    return !!this.config.get<string>('stripe.secretKey');
  }

  /** Lazily-constructed Stripe client. Throws 503 if keys are missing. */
  private get stripe() {
    if (this.client) return this.client;
    const key = this.config.get<string>('stripe.secretKey');
    if (!key) {
      throw new ServiceUnavailableException(
        'Stripe is not configured on this server (STRIPE_SECRET_KEY missing)',
      );
    }
    this.client = Stripe(key, { apiVersion: '2025-09-30.clover' });
    return this.client;
  }

  // ─── Customer ────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCustomer(userId: string, email: string): Promise<any> {
    return this.stripe.customers.create({
      email,
      // `userId` lives in metadata so a Stripe dashboard user can find our
      // tenant id from a customer record without joining any database.
      metadata: { userId },
    });
  }

  // ─── Checkout + Portal ───────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCheckoutSession(args: {
    customerId: string;
    planKey: Exclude<PlanKey, 'free'>; // 'starter' | 'pro' | 'business'
    successUrl: string;
    cancelUrl: string;
  }): Promise<any> {
    const plan = getPlan(args.planKey);
    const priceEnv = plan.stripePriceEnv;
    if (!priceEnv) {
      throw new ServiceUnavailableException(
        `Plan "${args.planKey}" has no Stripe price configured`,
      );
    }
    const priceConfigKey =
      priceEnv === 'STRIPE_PRICE_STARTER'
        ? 'stripe.priceStarter'
        : priceEnv === 'STRIPE_PRICE_PRO'
          ? 'stripe.pricePro'
          : 'stripe.priceBusiness';
    const priceId = this.config.get<string>(priceConfigKey);
    if (!priceId) {
      throw new ServiceUnavailableException(
        `${priceEnv} env variable is missing — cannot create Checkout Session for ${args.planKey}`,
      );
    }

    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: args.customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: `${args.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl,
      subscription_data: plan.trialDays
        ? { trial_period_days: plan.trialDays }
        : undefined,
      metadata: { planKey: args.planKey },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPortalSession(args: { customerId: string; returnUrl: string }): Promise<any> {
    return this.stripe.billingPortal.sessions.create({
      customer: args.customerId,
      return_url: args.returnUrl,
    });
  }

  // ─── Webhook + retrieval ─────────────────────────────────────────────

  /**
   * Verify signature and parse an incoming webhook payload. Raw body must
   * be the exact bytes Stripe POSTed — otherwise signature verification
   * fails. NestJS provides this via `req.rawBody` (enabled in main.ts).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructWebhookEvent(rawBody: Buffer, signature: string): any {
    const secret = this.config.get<string>('stripe.webhookSecret');
    if (!secret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retrieveSubscription(stripeSubscriptionId: string): Promise<any> {
    return this.stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retrieveInvoice(stripeInvoiceId: string): Promise<any> {
    return this.stripe.invoices.retrieve(stripeInvoiceId);
  }
}

/**
 * Inferred Stripe types re-exported so other billing modules can avoid
 * reaching for the `Stripe.X` namespace (which is not reliably exposed on
 * the CJS type side).
 */
export type StripeEvent = ReturnType<StripeService['constructWebhookEvent']>;
export type StripeSubscription = Awaited<
  ReturnType<StripeService['retrieveSubscription']>
>;
export type StripeInvoice = Awaited<
  ReturnType<StripeService['retrieveInvoice']>
>;
export type StripeCustomer = Awaited<
  ReturnType<StripeService['createCustomer']>
>;
export type StripeCheckoutSession = Awaited<
  ReturnType<StripeService['createCheckoutSession']>
>;
