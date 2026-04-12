import * as crypto from 'crypto';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

interface RawBodyRequest {
  headers: Record<string, string | undefined>;
  user?: { id: string };
  rawBody?: Buffer;
}

@Injectable()
export class HmacAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const { userId, signingSecret } =
      await this.authService.validateApiKeyFull(apiKey);
    request.user = { id: userId };

    if (signingSecret) {
      const signature = request.headers['x-signature'];
      if (!signature) {
        throw new UnauthorizedException(
          'Missing X-Signature header (HMAC signing is required for this API key)',
        );
      }

      const match = signature.match(/^sha256=([a-f0-9]+)$/i);
      if (!match) {
        throw new UnauthorizedException(
          'Invalid X-Signature format (expected: sha256=<hex>)',
        );
      }

      const rawBody = request.rawBody;
      if (!rawBody) {
        throw new UnauthorizedException(
          'Cannot verify signature: raw body unavailable',
        );
      }

      const expected = crypto
        .createHmac('sha256', signingSecret)
        .update(rawBody)
        .digest('hex');

      const provided = match[1];
      if (
        expected.length !== provided.length ||
        !crypto.timingSafeEqual(
          Buffer.from(expected, 'hex'),
          Buffer.from(provided, 'hex'),
        )
      ) {
        throw new UnauthorizedException('Invalid HMAC signature');
      }
    }

    return true;
  }
}
