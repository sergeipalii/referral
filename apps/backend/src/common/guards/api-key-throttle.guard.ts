import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottleGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-unsafe-member-access
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Rate limit by API key rather than IP
    return (req.headers?.['x-api-key'] as string) ?? (req.ip as string) ?? 'unknown';
  }
}
