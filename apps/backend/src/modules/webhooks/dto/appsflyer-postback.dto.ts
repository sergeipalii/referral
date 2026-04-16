import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Shape of an AppsFlyer Push API (postback) payload.
 *
 * AppsFlyer is generous about what it sends — we only validate the fields we
 * actually consume. Everything is optional because organic/rejected events may
 * arrive with missing attribution data and we still need to respond 200.
 *
 * Reference: https://support.appsflyer.com/hc/en-us/articles/207034356
 */
export class AppsFlyerPostbackDto {
  @ApiPropertyOptional({
    description:
      'AppsFlyer media source — the `pid` parameter from the tracking link. Maps to our partnerCode.',
    example: 'a1b2c3d4',
  })
  @IsOptional()
  @IsString()
  media_source?: string;

  @ApiPropertyOptional({
    description:
      'Event name: "install", "af_purchase", "af_subscribe", or custom.',
    example: 'af_purchase',
  })
  @IsOptional()
  @IsString()
  event_name?: string;

  @ApiPropertyOptional({ description: 'Revenue amount as a string.' })
  @IsOptional()
  @IsString()
  event_revenue?: string;

  @ApiPropertyOptional({
    description: 'Event timestamp (ISO 8601). Used to derive eventDate.',
  })
  @IsOptional()
  @IsString()
  event_time?: string;

  @ApiPropertyOptional({ description: 'Event-level unique ID.' })
  @IsOptional()
  @IsString()
  event_id?: string;

  @ApiPropertyOptional({ description: 'Device-level AppsFlyer ID.' })
  @IsOptional()
  @IsString()
  appsflyer_id?: string;

  @ApiPropertyOptional({ description: 'Campaign name.' })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiPropertyOptional({ description: 'Passthrough customer user ID.' })
  @IsOptional()
  @IsString()
  customer_user_id?: string;
}
