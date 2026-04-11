import { ApiProperty } from '@nestjs/swagger';

export class PartnerBalanceDto {
  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  partnerName: string;

  @ApiProperty()
  partnerCode: string;

  @ApiProperty({ description: 'Total accrued amount from conversions' })
  totalAccrued: string;

  @ApiProperty({ description: 'Total completed payments' })
  totalPaid: string;

  @ApiProperty({ description: 'Remaining balance (totalAccrued - totalPaid)' })
  balance: string;

  @ApiProperty({ description: 'Sum of pending payments' })
  pendingPayments: string;
}
