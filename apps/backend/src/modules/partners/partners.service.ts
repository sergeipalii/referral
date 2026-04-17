import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PartnerEntity } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/requests/create-partner.dto';
import { UpdatePartnerDto } from './dto/requests/update-partner.dto';
import { PartnersQueryDto } from './dto/requests/partners-query.dto';
import { PartnerDto } from './dto/responses/partner.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(PartnerEntity)
    private readonly partnersRepository: Repository<PartnerEntity>,
  ) {}

  async findAll(
    userId: string,
    query: PartnersQueryDto,
  ): Promise<PaginatedResponseDto<PartnerDto>> {
    const { page = 1, limit = 20, isActive } = query;
    const offset = (page - 1) * limit;

    const where: Partial<{ userId: string; isActive: boolean }> = { userId };
    if (isActive !== undefined) where.isActive = isActive;

    const [partners, totalItems] = await this.partnersRepository.findAndCount({
      where,
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(totalItems / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return { data: partners.map(PartnerDto.fromEntity), meta };
  }

  async findOneOrFail(userId: string, id: string): Promise<PartnerEntity> {
    const partner = await this.partnersRepository.findOne({
      where: { id, userId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async findByCode(
    userId: string,
    code: string,
  ): Promise<PartnerEntity | null> {
    return this.partnersRepository.findOne({ where: { userId, code } });
  }

  /**
   * Lookup partner by code without knowing the tenant. Used by the public
   * click redirect endpoint where we don't have a userId upfront. Since
   * partner codes are auto-generated 8-hex-char random values, collisions
   * across tenants are astronomically unlikely.
   */
  async findByCodeGlobal(code: string): Promise<PartnerEntity | null> {
    return this.partnersRepository.findOne({ where: { code } });
  }

  async create(userId: string, dto: CreatePartnerDto): Promise<PartnerDto> {
    const code = await this.generateUniqueCode(userId);
    const partner = this.partnersRepository.create({ ...dto, code, userId });
    const saved = await this.partnersRepository.save(partner);
    return PartnerDto.fromEntity(saved);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePartnerDto,
  ): Promise<PartnerDto> {
    const partner = await this.findOneOrFail(userId, id);
    Object.assign(partner, dto);
    const saved = await this.partnersRepository.save(partner);
    return PartnerDto.fromEntity(saved);
  }

  /**
   * Generate a short, unique-per-tenant partner code.
   * 4 random bytes → 8 hex chars (~4.3B combinations per user) — plenty for
   * uniqueness without being cryptographically sensitive. Retries on the rare
   * collision.
   */
  private async generateUniqueCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(4).toString('hex');
      const existing = await this.findByCode(userId, code);
      if (!existing) return code;
    }
    throw new ConflictException('Failed to generate a unique partner code');
  }

  async deactivate(userId: string, id: string): Promise<StandardResponseDto> {
    const partner = await this.findOneOrFail(userId, id);
    partner.isActive = false;
    await this.partnersRepository.save(partner);
    return { success: true, message: 'Partner deactivated successfully' };
  }
}
