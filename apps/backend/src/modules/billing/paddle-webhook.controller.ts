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
import type { EventEntity } from '@paddle/paddle-node-sdk';
import { BillingService } from './billing.service';
import { PaddleService } from './paddle.service';

/**
 * Paddle → us webhook endpoint. Runs under the same `rawBody: true` setup
 * that serves our existing MMP / HMAC paths — Paddle signature verification
 * needs byte-perfect access to the original payload.
 *
 * Never guarded by JwtAuthGuard: Paddle authenticates via `Paddle-Signature`,
 * not Authorization header.
 *
 * Always returns 2xx if signature verification succeeded, even on downstream
 * processing errors — Paddle retries on non-2xx and we'd rather log & move on
 * than storm ourselves during an incident. Idempotency in BillingService
 * prevents duplicate processing on Paddle retries that do get through.
 */
@ApiTags('webhooks')
@ApiExcludeController()
@Controller('webhooks/paddle')
export class PaddleWebhookController {
  private readonly logger = new Logger(PaddleWebhookController.name);

  constructor(
    private readonly paddleService: PaddleService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('paddle-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!req.rawBody) {
      // Should never happen in practice — `rawBody: true` is set in main.ts.
      // Guard makes the error explicit if someone changes that.
      throw new BadRequestException('Raw request body is missing');
    }
    if (!signature) {
      throw new BadRequestException('Paddle-Signature header missing');
    }

    let event: EventEntity;
    try {
      event = await this.paddleService.constructWebhookEvent(
        req.rawBody,
        signature,
      );
    } catch (err) {
      // Signature mismatch → someone is forging events (or our secret is
      // wrong). 400 tells Paddle "don't retry" — which is what we want.
      this.logger.warn(
        `Paddle webhook signature verification failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException('Invalid Paddle signature');
    }

    try {
      await this.billingService.handlePaddleEvent(event);
    } catch (err) {
      // Swallow and log — return 200 so Paddle doesn't retry on our bug.
      // The cron reconciler will heal any state drift from a missed event.
      this.logger.error(
        `Failed processing Paddle event ${event.eventId} (${event.eventType}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { received: true };
  }
}
