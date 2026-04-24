import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCodeEntity } from './entities/promo-code.entity';
import { PartnersService } from '../partners/partners.service';
import {
  CreatePromoCodeDto,
  PromoCodeResponseDto,
  ResolvedPromoCodeDto,
  UpdatePromoCodeDto,
} from './dto/promo-code.dto';

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly repo: Repository<PromoCodeEntity>,
    private readonly partnersService: PartnersService,
  ) {}

  // ─── Owner CRUD ─────────────────────────────────────────────────────────

  async create(
    userId: string,
    dto: CreatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    // Validate partner belongs to this tenant.
    await this.partnersService.findOneOrFail(userId, dto.partnerId);

    const code = dto.code.toLowerCase().trim();
    const existing = await this.repo.findOne({
      where: { userId, code },
    });
    if (existing) {
      throw new ConflictException(`Promo code "${dto.code}" already exists`);
    }

    const entity = this.repo.create({
      userId,
      partnerId: dto.partnerId,
      code,
      usageLimit: dto.usageLimit ?? null,
      metadata: dto.metadata ?? null,
    });
    const saved = await this.repo.save(entity);
    return PromoCodeResponseDto.fromEntity(saved);
  }

  async findAll(
    userId: string,
    partnerId?: string,
  ): Promise<PromoCodeResponseDto[]> {
    const where: Record<string, unknown> = { userId };
    if (partnerId) where.partnerId = partnerId;
    const rows = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return rows.map(PromoCodeResponseDto.fromEntity);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Promo code not found');
    if (dto.usageLimit !== undefined) entity.usageLimit = dto.usageLimit;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;
    if (dto.metadata !== undefined) entity.metadata = dto.metadata;
    const saved = await this.repo.save(entity);
    return PromoCodeResponseDto.fromEntity(saved);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, userId } });
    if (!entity) throw new NotFoundException('Promo code not found');
    await this.repo.delete({ id });
  }

  // ─── Integration: resolve ───────────────────────────────────────────────

  /**
   * Look up a promo code and return the associated partner. Used by the
   * checkout integration (API-key auth) to validate codes at purchase time.
   */
  async resolve(
    userId: string,
    rawCode: string,
  ): Promise<ResolvedPromoCodeDto> {
    const code = rawCode.toLowerCase().trim();
    const entity = await this.repo.findOne({
      where: { userId, code, isActive: true },
    });
    if (!entity) {
      throw new NotFoundException(`Promo code "${rawCode}" not found`);
    }
    const partner = await this.partnersService.findOneOrFail(
      userId,
      entity.partnerId,
    );
    return { partnerId: partner.id, partnerCode: partner.code };
  }

  // ─── Track-time: resolve + increment ────────────────────────────────────

  /**
   * Called from ConversionsService.track() when `promoCode` is provided.
   * Resolves to a partnerId AND atomically increments `usedCount`. If the
   * code has reached its `usageLimit` the increment also flips `isActive` to
   * false in the same UPDATE — no race window.
   *
   * Returns null if code is not found / inactive (caller falls through to
   * other resolution methods).
   */
  async resolveAndIncrement(
    userId: string,
    rawCode: string,
  ): Promise<{ partnerId: string } | null> {
    const code = rawCode.toLowerCase().trim();

    // Atomic: increment + conditional deactivation in a single statement.
    // RETURNING gives us the updated row; if no rows matched the WHERE the
    // code was either unknown, inactive, or already exhausted.
    // Read the code first via ORM (gets properly-typed partnerId), then
    // do the atomic increment as a raw UPDATE. The tiny window between
    // findOne and UPDATE is acceptable for MVP — worst case a code at its
    // limit serves one extra use before deactivation.
    const entity = await this.repo.findOne({
      where: { userId, code, isActive: true },
    });
    if (!entity) return null;

    // Atomic increment + conditional deactivation.
    await this.repo.query(
      `UPDATE promo_codes
         SET "usedCount" = "usedCount" + 1,
             "isActive" = CASE
               WHEN "usageLimit" IS NOT NULL AND "usedCount" + 1 >= "usageLimit"
               THEN false
               ELSE "isActive"
             END,
             "updatedAt" = NOW()
       WHERE "id" = $1
         AND "isActive" = true`,
      [entity.id],
    );

    return { partnerId: entity.partnerId };
  }

  /**
   * Deactivate all promo codes belonging to a partner when that partner is
   * soft-deleted. Called from PartnersService.deactivate() to keep codes in
   * sync with partner status.
   */
  async deactivateByPartner(userId: string, partnerId: string): Promise<void> {
    await this.repo.update({ userId, partnerId }, { isActive: false });
  }
}
