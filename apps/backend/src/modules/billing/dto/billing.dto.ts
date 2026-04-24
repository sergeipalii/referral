import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type {
  PlanKey,
  SubscriptionStatus,
} from '../entities/subscription.entity';

/**
 * One dimension of tenant usage: how many X they use out of Y allowed. `limit`
 * is null when the plan grants unlimited headroom.
 */
export class UsageBucketDto {
  @ApiProperty()
  used: number;

  @ApiPropertyOptional({ description: 'null means unlimited on this plan' })
  limit: number | null;

  @ApiProperty({
    description:
      'True when the plan cap has been met or exceeded. For soft limits the tenant can keep using the resource — the flag surfaces an upgrade CTA in the UI.',
  })
  exceeded: boolean;
}

/**
 * Conversions are the one resource with a soft cap: ingest keeps accepting
 * events past the limit, but read endpoints hide them until the tenant
 * upgrades. `hiddenCount` / `visibleThrough` surface that state to the UI so
 * it can render an upgrade banner + "+N hidden" indicators.
 */
export class ConversionUsageBucketDto extends UsageBucketDto {
  @ApiProperty({
    description:
      'Events recorded past the current-period cap. They are stored and accruals still count — but hidden from tenant-facing reports until upgrade.',
  })
  hiddenCount: number;

  @ApiPropertyOptional({
    description:
      'Latest `eventDate` still visible in tenant-facing reports. null when cap is not exceeded (everything visible) or when even the first day overflows the cap (nothing visible in the current period).',
  })
  visibleThrough: Date | null;
}

export class SubscriptionUsageDto {
  @ApiProperty({ type: UsageBucketDto })
  partners: UsageBucketDto;

  @ApiProperty({ type: UsageBucketDto })
  apiKeys: UsageBucketDto;

  @ApiProperty({
    type: ConversionUsageBucketDto,
    description: 'Conversion count for the current billing period',
  })
  conversions: ConversionUsageBucketDto;

  @ApiProperty({ description: 'Start of the current billing period (UTC)' })
  periodStart: Date;

  @ApiProperty({ description: 'End of the current billing period (UTC)' })
  periodEnd: Date;
}

export class PlanFeaturesDto {
  @ApiProperty()
  mmpWebhook: boolean;

  @ApiProperty()
  csvExport: boolean;

  @ApiProperty()
  batchPayouts: boolean;

  @ApiProperty()
  recurringRules: boolean;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    enum: ['starter', 'pro', 'business'],
    description: 'Which paid plan the owner wants to subscribe to',
  })
  @IsEnum(['starter', 'pro', 'business'])
  planKey: 'starter' | 'pro' | 'business';
}

export class CheckoutContextCustomDataDto {
  @ApiProperty({ description: 'Refledger user id, echoed back in webhooks' })
  userId: string;
}

/**
 * Paddle overlay runs client-side — the backend only hands the frontend the
 * price + customer ids to open the overlay with. `customData` round-trips
 * into webhook payloads so we can reconcile without joining customer records.
 */
export class CheckoutContextDto {
  @ApiProperty({ description: 'Paddle Price id to open the overlay against' })
  priceId: string;

  @ApiProperty({
    description: 'Paddle Customer id the overlay should bind the purchase to',
  })
  customerId: string;

  @ApiProperty({ type: CheckoutContextCustomDataDto })
  customData: CheckoutContextCustomDataDto;
}

export class ChangePlanRequestDto {
  @ApiProperty({
    enum: ['starter', 'pro', 'business'],
    description: 'Target plan. Paddle prorates the price difference.',
  })
  @IsEnum(['starter', 'pro', 'business'])
  planKey: 'starter' | 'pro' | 'business';
}

export class PaymentMethodUpdateUrlDto {
  @ApiProperty({
    description:
      'Paddle-hosted, short-lived URL for updating the saved payment method',
  })
  url: string;
}

export class InvoicePdfUrlDto {
  @ApiProperty({ description: 'Short-lived Paddle URL to download the PDF' })
  url: string;
}

export class SubscriptionDto {
  @ApiProperty({ enum: ['free', 'pro', 'business'] })
  plan: PlanKey;

  @ApiProperty({ description: 'Human-readable plan label' })
  planLabel: string;

  @ApiProperty({
    enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'],
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Price in cents (smallest currency unit). 0 for free plan.',
  })
  priceCents: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional({
    description: 'Present while in trial, null otherwise',
  })
  trialEndsAt: Date | null;

  @ApiPropertyOptional({
    description: 'End of the current Paddle billing period (null on free)',
  })
  currentPeriodEnd: Date | null;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ type: PlanFeaturesDto })
  features: PlanFeaturesDto;

  @ApiProperty({ type: SubscriptionUsageDto })
  usage: SubscriptionUsageDto;
}
