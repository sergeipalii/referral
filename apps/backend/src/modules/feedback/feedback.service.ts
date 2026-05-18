import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmitFeedbackDto } from './dto/requests/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly config: ConfigService) {}

  async submit(
    dto: SubmitFeedbackDto,
    source: { ip?: string; origin?: string } = {},
  ): Promise<{ delivered: boolean }> {
    const botToken = this.config.get<string | null>('telegram.botToken');
    const chatId = this.config.get<string | null>('telegram.chatId');

    if (!botToken || !chatId) {
      this.logger.error(
        'Feedback received but Telegram delivery is not configured ' +
          '(TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing).',
      );
      throw new ServiceUnavailableException(
        'Feedback delivery is temporarily unavailable.',
      );
    }

    const text = this.formatMessage(dto, source);

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Telegram sendMessage failed: ${res.status} ${res.statusText} — ${body}`,
      );
      throw new ServiceUnavailableException(
        'Could not deliver feedback. Please try again later.',
      );
    }

    return { delivered: true };
  }

  private formatMessage(
    dto: SubmitFeedbackDto,
    source: { ip?: string; origin?: string },
  ): string {
    const lines = [
      '<b>New pilot feedback</b>',
      '',
      `<b>From:</b> ${escapeHtml(dto.name?.trim() || 'anonymous')}`,
    ];

    if (dto.email) {
      lines.push(`<b>Email:</b> ${escapeHtml(dto.email)}`);
    }
    if (source.origin) {
      lines.push(`<b>Source:</b> ${escapeHtml(source.origin)}`);
    }
    if (source.ip) {
      lines.push(`<b>IP:</b> ${escapeHtml(source.ip)}`);
    }

    lines.push('', escapeHtml(dto.message.trim()));

    return lines.join('\n');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
