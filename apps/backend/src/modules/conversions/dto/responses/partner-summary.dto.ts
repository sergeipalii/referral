import { ApiProperty } from '@nestjs/swagger';

export class PartnerSummaryDto {
  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  partnerName: string;

  @ApiProperty()
  partnerCode: string;

  @ApiProperty()
  totalConversions: number;

  @ApiProperty()
  totalAccrualAmount: string;

  @ApiProperty()
  totalPaid: string;

  @ApiProperty()
  balance: string;
}
