import { ApiProperty } from '@nestjs/swagger';

export class FeedbackResultDto {
  @ApiProperty({ example: true })
  delivered: boolean;
}
