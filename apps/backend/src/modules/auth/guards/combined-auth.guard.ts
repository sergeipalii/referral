import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

/**
 * Accepts either JWT Bearer token OR X-API-Key header.
 * Try JWT first, then fall back to API key.
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    private readonly apiKeyGuard: ApiKeyAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try JWT first
    try {
      const jwtResult = await this.jwtGuard.canActivate(context);
      if (jwtResult) return true;
    } catch {
      // JWT failed, try API key
    }

    return this.apiKeyGuard.canActivate(context);
  }
}
