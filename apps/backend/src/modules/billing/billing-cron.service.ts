import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingService } from './billing.service';

/**
 * Scheduled defensive work for the billing subsystem:
 *   - daily reconcile (pulls Paddle subscription state back onto ours in
 *     case a webhook was missed),
 *   - daily cleanup of the `processed_webhook_events` ledger.
 *
 * Runs only when the service is configured with Paddle keys — if it isn't,
 * the jobs no-op. That keeps local dev / CI environments quiet.
 */
@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(private readonly billingService: BillingService) {}

  /**
   * 04:00 UTC nightly. Offset from IdempotencyService.cleanup (03:00) so the
   * two don't compete for the same DB connection pool slice.
   */
  @Cron('0 4 * * *')
  async reconcile(): Promise<void> {
    try {
      const { reconciled } =
        await this.billingService.reconcileAllSubscriptions();
      if (reconciled > 0) {
        this.logger.log(`Reconciled ${reconciled} subscription(s) with Paddle`);
      }
    } catch (err) {
      this.logger.error(
        `Subscription reconcile failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** 04:15 UTC — purge idempotency records we no longer need. */
  @Cron('15 4 * * *')
  async cleanup(): Promise<void> {
    try {
      await this.billingService.cleanupOldProcessedEvents();
    } catch (err) {
      this.logger.error(
        `Processed-events cleanup failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
