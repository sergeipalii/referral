import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

/**
 * Stripe → us webhook endpoint. Runs under the same `rawBody: true` setup
 * that serves our existing MMP / HMAC paths — Stripe signature verification
 * needs byte-perfect access to the original payload.
 *
 * Never guarded by JwtAuthGuard: Stripe authenticates via signature, not
 * Authorization header.
 *
 * Always returns 2xx if signature verification succeeded, even on downstream
 * processing errors — Stripe retries on non-2xx and we'd rather log & move on
 * than storm ourselves during an incident. Idempotency in BillingService
 * prevents duplicate processing on Stripe retries that do get through.
 */
@ApiTags('webhooks')
@ApiExcludeController()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      // This should never happen in practice — `rawBody: true` is set in
      // main.ts. Guard makes the error explicit if someone changes that.
      throw new BadRequestException('Raw request body is missing');
    }
    if (!signature) {
      throw new BadRequestException('Stripe-Signature header missing');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(
        req.rawBody,
        signature,
      );
    } catch (err) {
      // Signature mismatch → someone is forging events (or our secret is
      // wrong). 400 tells Stripe "don't retry" — they will not.
      this.logger.warn(
        `Stripe webhook signature verification failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException('Invalid Stripe signature');
    }

    try {
      await this.billingService.handleWebhookEvent(event);
    } catch (err) {
      // Swallow and log — return 200 so Stripe doesn't retry on our bug.
      // The cron reconciler will heal any state drift from a missed event.
      this.logger.error(
        `Failed processing Stripe event ${event.id} (${event.type}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { received: true };
  }
}
