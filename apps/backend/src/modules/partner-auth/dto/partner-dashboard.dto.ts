import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Aggregated stats shown on the partner portal home page. Numeric money
 * values are strings (decimal-exact) to match how `PaymentsService` and
 * `ConversionsService` format them everywhere else.
 */
export class PartnerDashboardDto {
  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  partnerCode: string;

  @ApiProperty()
  partnerName: string;

  @ApiProperty({ description: 'Sum of conversion counts across all events' })
  totalConversions: number;

  @ApiProperty({ description: 'Total accrued amount from conversions' })
  totalAccrued: string;

  @ApiProperty({ description: 'Total completed payments' })
  totalPaid: string;

  @ApiProperty({
    description: 'Sum of pending payments (not yet completed/cancelled)',
  })
  pendingPayments: string;

  @ApiProperty({
    description: 'Current balance (totalAccrued − totalPaid)',
  })
  balance: string;

  @ApiPropertyOptional({ description: 'Most recent conversion date (YYYY-MM-DD)' })
  lastConversionDate: string | null;
}
