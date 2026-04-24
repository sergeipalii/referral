import { ApiProperty } from '@nestjs/swagger';

export class TimeseriesPointDto {
  @ApiProperty({ example: '2026-04-01' })
  date: string;

  @ApiProperty()
  conversions: number;

  @ApiProperty()
  revenue: string;

  @ApiProperty()
  accrual: string;
}

export class TopPartnerDto {
  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  partnerName: string;

  @ApiProperty()
  partnerCode: string;

  @ApiProperty()
  conversions: number;

  @ApiProperty()
  revenue: string;

  @ApiProperty()
  accrual: string;
}

export class EventBreakdownDto {
  @ApiProperty()
  eventName: string;

  @ApiProperty()
  conversions: number;

  @ApiProperty()
  revenue: string;

  @ApiProperty()
  accrual: string;
}

export class KpiDto {
  @ApiProperty()
  totalConversions: number;

  @ApiProperty()
  totalRevenue: string;

  @ApiProperty()
  totalAccrual: string;

  @ApiProperty()
  totalPaid: string;

  @ApiProperty({
    description:
      'Same metrics for previous period of equal length (for trend calc)',
  })
  prev: {
    totalConversions: number;
    totalRevenue: string;
    totalAccrual: string;
    totalPaid: string;
  };
}
