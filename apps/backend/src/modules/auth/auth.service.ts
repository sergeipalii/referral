import * as crypto from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ApiKeyEntity } from './entities/api-key.entity';
import { hashPassword, comparePasswords } from '../../utils/bcrypt.utils';
import {
  RegisterDto,
  LoginDto,
  AuthTokensDto,
  CreateApiKeyDto,
  ApiKeyCreatedDto,
  ApiKeyDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
    @InjectRepository(ApiKeyEntity)
    private apiKeyRepository: Repository<ApiKeyEntity>,
  ) {}

  // ─── Email/Password Auth ──────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const hashed = hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      hashedPassword: hashed,
      name: dto.name,
    });
    return this.generateTokens(user.id);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = comparePasswords(user.hashedPassword, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokens(user.id);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokensDto> {
    try {
      const payload = this.jwtService.verify<{ id: string; type: string }>(
        refreshToken,
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      // Verify user still exists
      const user = await this.usersService.findById(payload.id);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user.id);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(userId: string): AuthTokensDto {
    const accessToken = this.jwtService.sign(
      { id: userId, type: 'access' },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { id: userId, type: 'refresh' },
      { expiresIn: '30d' },
    );
    return { accessToken, refreshToken };
  }

  // ─── API Key Management ───────────────────────────────────────────────

  async createApiKey(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedDto> {
    const rawKey = `rk_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 12);
    const signingSecret = crypto.randomBytes(32).toString('hex');
    const webhookToken = crypto.randomBytes(32).toString('hex');

    const entity = this.apiKeyRepository.create({
      userId,
      name: dto.name,
      hashedKey,
      prefix,
      signingSecret,
      webhookToken,
    });
    const saved = await this.apiKeyRepository.save(entity);

    return {
      id: saved.id,
      name: saved.name,
      key: rawKey,
      signingSecret,
      webhookToken,
      createdAt: saved.createdAt,
    };
  }

  async listApiKeys(userId: string): Promise<ApiKeyDto[]> {
    const keys = await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeApiKey(userId: string, id: string): Promise<void> {
    const key = await this.apiKeyRepository.findOne({ where: { id, userId } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    await this.apiKeyRepository.delete({ id });
  }

  /**
   * Validate an API key from the X-API-Key header.
   * Returns the userId if valid.
   */
  async validateApiKey(rawKey: string): Promise<string> {
    const { userId } = await this.validateApiKeyFull(rawKey);
    return userId;
  }

  /**
   * Validate an API key and return userId + signingSecret.
   * Used by HmacAuthGuard to verify request signatures.
   */
  async validateApiKeyFull(
    rawKey: string,
  ): Promise<{ userId: string; signingSecret: string | null }> {
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeyRepository.findOne({
      where: { hashedKey },
    });
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Update lastUsedAt (fire-and-forget)
    this.apiKeyRepository
      .update(apiKey.id, { lastUsedAt: new Date() })
      .catch(() => {});

    return { userId: apiKey.userId, signingSecret: apiKey.signingSecret };
  }

  /**
   * Resolve a direct-webhook token (from the URL) to the owning userId.
   * Used by the MMP webhook controller — grants tracking-only access without
   * HMAC, so the caller must keep the token secret.
   */
  async validateWebhookToken(token: string): Promise<string> {
    if (!token || token.length !== 64) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    const apiKey = await this.apiKeyRepository.findOne({
      where: { webhookToken: token },
    });
    if (!apiKey) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    this.apiKeyRepository
      .update(apiKey.id, { lastUsedAt: new Date() })
      .catch(() => {});

    return apiKey.userId;
  }
}
