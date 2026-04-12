import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: { id: string } }>();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) return false;

    const userId = await this.authService.validateApiKey(apiKey);
    request.user = { id: userId };
    return true;
  }
}
