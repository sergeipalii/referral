import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class StandardResponseDto {
  @ApiProperty({
    description: 'Indicates whether the operation was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Message for user',
    required: false,
    example: 'Operation completed successfully',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    description: 'Error description',
    required: false,
    example: 'An error occurred during the operation',
  })
  @IsOptional()
  @IsString()
  error?: string;
}
