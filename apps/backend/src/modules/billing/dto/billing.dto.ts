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

export class SubscriptionUsageDto {
  @ApiProperty({ type: UsageBucketDto })
  partners: UsageBucketDto;

  @ApiProperty({ type: UsageBucketDto })
  apiKeys: UsageBucketDto;

  @ApiProperty({
    type: UsageBucketDto,
    description: 'Conversion count for the current billing period',
  })
  conversions: UsageBucketDto;

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
    enum: ['pro', 'business'],
    description: 'Which paid plan the owner wants to subscribe to',
  })
  @IsEnum(['pro', 'business'])
  planKey: 'pro' | 'business';
}

export class CheckoutSessionCreatedDto {
  @ApiProperty({ description: 'Stripe Checkout URL to redirect the user to' })
  url: string;
}

export class PortalSessionCreatedDto {
  @ApiProperty({ description: 'Stripe Customer Portal URL to redirect to' })
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
    description:
      'Price in cents (smallest currency unit). 0 for free plan.',
  })
  priceCents: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional({
    description: 'Present while in trial, null otherwise',
  })
  trialEndsAt: Date | null;

  @ApiPropertyOptional({
    description: 'End of the current Stripe billing period (null on free)',
  })
  currentPeriodEnd: Date | null;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ type: PlanFeaturesDto })
  features: PlanFeaturesDto;

  @ApiProperty({ type: SubscriptionUsageDto })
  usage: SubscriptionUsageDto;
}
