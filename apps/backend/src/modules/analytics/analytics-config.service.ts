import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalyticsIntegrationEntity } from './entities/analytics-integration.entity';
import { UpsertIntegrationDto } from './dto/requests/upsert-integration.dto';
import { AnalyticsIntegrationDto } from './dto/responses/analytics-integration.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';
import { encrypt } from '../../utils/crypto.util';

@Injectable()
export class AnalyticsConfigService {
  constructor(
    @InjectRepository(AnalyticsIntegrationEntity)
    private readonly integrationRepository: Repository<AnalyticsIntegrationEntity>,
    private readonly configService: ConfigService,
  ) {}

  async findByUserId(userId: string): Promise<AnalyticsIntegrationEntity | null> {
    return this.integrationRepository.findOne({ where: { userId } });
  }

  async findByUserIdOrFail(userId: string): Promise<AnalyticsIntegrationEntity> {
    const integration = await this.findByUserId(userId);
    if (!integration) {
      throw new NotFoundException('Analytics integration not found. Please configure it first.');
    }
    return integration;
  }

  /** Returns all active integrations — used by the daily cron. */
  async findAllActive(): Promise<AnalyticsIntegrationEntity[]> {
    return this.integrationRepository.find({ where: { isActive: true } });
  }

  async upsert(userId: string, dto: UpsertIntegrationDto): Promise<AnalyticsIntegrationDto> {
    const encryptionKey = this.configService.get<string>('encryption.key')!;

    const configPayload = JSON.stringify({
      apiKey: dto.apiKey,
      secretKey: dto.secretKey,
      ...(dto.projectId ? { projectId: dto.projectId } : {}),
    });

    const encryptedConfig = encrypt(configPayload, encryptionKey);

    let integration = await this.findByUserId(userId);

    if (integration) {
      integration.providerType = dto.providerType;
      integration.encryptedConfig = encryptedConfig;
      integration.utmParameterName = dto.utmParameterName ?? integration.utmParameterName;
      integration.isActive = true;
    } else {
      integration = this.integrationRepository.create({
        userId,
        providerType: dto.providerType,
        encryptedConfig,
        utmParameterName: dto.utmParameterName ?? 'utm_source',
      });
    }

    const saved = await this.integrationRepository.save(integration);
    return AnalyticsIntegrationDto.fromEntity(saved);
  }

  async remove(userId: string): Promise<StandardResponseDto> {
    const integration = await this.findByUserIdOrFail(userId);
    await this.integrationRepository.delete({ id: integration.id });
    return { success: true, message: 'Analytics integration removed successfully' };
  }
}
