import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { ConversionsService } from '../conversions/conversions.service';
import { TrackConversionDto } from '../conversions/dto/requests/track-conversion.dto';
import { BillingService } from '../billing/billing.service';
import { AppsFlyerPostbackDto } from './dto/appsflyer-postback.dto';

/**
 * Direct MMP webhook endpoints. These accept postbacks from Mobile Measurement
 * Partners (AppsFlyer, Adjust, ...) without the customer's own forwarding
 * server. Authentication is via a per-API-key `webhookToken` embedded in the
 * URL path — the MMP can't compute HMAC, so we trade the integrity guarantee
 * for a simpler integration.
 *
 * The endpoint always responds 200 to prevent the MMP from retrying and
 * causing duplicate conversions when our own processing fails. Failures are
 * logged, and AppsFlyer-supplied `event_id` / `appsflyer_id` are used as the
 * idempotency key so legitimate retries are deduplicated.
 */
@ApiTags('webhooks')
@Controller('webhooks/mmp')
export class MmpWebhooksController {
  private readonly logger = new Logger(MmpWebhooksController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly conversionsService: ConversionsService,
    private readonly billingService: BillingService,
  ) {}

  @Post('appsflyer/:webhookToken')
  @HttpCode(200)
  @ApiOperation({
    summary: 'AppsFlyer Push API postback endpoint (direct, no HMAC)',
    description:
      'Paste this URL (including your webhook token) into the AppsFlyer dashboard under Integrations → Push API. Organic installs (empty media_source) are ignored. AppsFlyer retries are deduplicated via event_id.',
  })
  @ApiResponse({ status: 200, description: 'Always returns 200.' })
  async appsflyer(
    @Param('webhookToken') webhookToken: string,
    @Body() body: AppsFlyerPostbackDto,
  ): Promise<{ success: boolean }> {
    let userId: string;
    try {
      userId = await this.authService.validateWebhookToken(webhookToken);
    } catch {
      // Invalid token — still 200 so AppsFlyer doesn't retry, and we don't
      // leak token validity in the response body.
      this.logger.warn('AppsFlyer postback with invalid webhook token');
      return { success: true };
    }

    // Plan gate — MMP webhook is a paid feature. Soft-reject: still 200 so
    // AppsFlyer doesn't retry, just log so the owner can see "your plan
    // doesn't include this" in support tickets.
    try {
      await this.billingService.assertCapability(userId, 'mmpWebhook');
    } catch {
      this.logger.warn(
        `AppsFlyer postback dropped — tenant ${userId} does not have mmpWebhook capability`,
      );
      return { success: true };
    }

    // Organic / unattributed installs — nothing to attribute to a partner.
    if (!body.media_source || body.media_source.toLowerCase() === 'organic') {
      return { success: true };
    }

    if (!body.event_name) {
      this.logger.warn(
        `AppsFlyer postback missing event_name (userId=${userId})`,
      );
      return { success: true };
    }

    const dto: TrackConversionDto = {
      partnerCode: body.media_source,
      eventName: body.event_name,
      eventDate: this.parseEventDate(body.event_time),
      count: 1,
      revenue: this.parseRevenue(body.event_revenue),
      idempotencyKey: body.event_id || body.appsflyer_id,
    };

    try {
      await this.conversionsService.track(userId, dto);
    } catch (err) {
      // Don't leak internal errors to the MMP, but log for our own debugging.
      // Partner-not-found, rule mismatches, etc. are all swallowed — the MMP
      // has no way to act on them.
      this.logger.error(
        `AppsFlyer tracking failed (userId=${userId}, partnerCode=${dto.partnerCode}, event=${dto.eventName}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { success: true };
  }

  // Placeholder for future MMPs — declared so the surface is discoverable.
  // Adding Adjust/Branch follows the same pattern: validate token, map fields,
  // call conversionsService.track(), always 200.
  @Post('adjust/:webhookToken')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  adjust(): { success: boolean } {
    return { success: true };
  }

  private parseRevenue(raw: string | undefined): number {
    if (!raw) return 0;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  private parseEventDate(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString().slice(0, 10);
  }
}
