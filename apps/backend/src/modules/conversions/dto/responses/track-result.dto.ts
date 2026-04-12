import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  eventName: string;

  @ApiProperty()
  eventDate: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  accrualAmount: string;

  @ApiPropertyOptional()
  accrualRuleId: string | null;
}
