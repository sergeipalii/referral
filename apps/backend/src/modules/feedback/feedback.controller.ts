import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/requests/submit-feedback.dto';
import { FeedbackResultDto } from './dto/responses/feedback-result.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Submit pilot-mode feedback (delivered to Telegram)' })
  @ApiResponse({ status: 201, type: FeedbackResultDto })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 503, description: 'Delivery channel not configured' })
  async submit(
    @Body() dto: SubmitFeedbackDto,
    @Ip() ip: string,
    @Headers('origin') origin?: string,
    @Headers('referer') referer?: string,
    @Headers('host') host?: string,
  ): Promise<FeedbackResultDto> {
    return this.feedbackService.submit(dto, {
      ip,
      origin: origin ?? referer ?? (host ? `https://${host}` : undefined),
    });
  }
}
