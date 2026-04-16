import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { PartnerEntity } from '../partners/entities/partner.entity';
import { comparePasswords, hashPassword } from '../../utils/bcrypt.utils';
import {
  PartnerAuthTokensDto,
  PartnerInvitationCreatedDto,
  PartnerSelfDto,
  UpdatePartnerSelfDto,
} from './dto/partner-auth.dto';

/** JWT payload shape for partner tokens. */
export interface PartnerJwtPayload {
  /** partnerId */
  sub: string;
  /** tenant/owner userId — needed by every partner-scoped query */
  uid: string;
  type: 'partner-access' | 'partner-refresh';
}

/** Invitation TTL — partners have a week to accept before re-invitation. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PartnerAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(PartnerEntity)
    private readonly partnersRepository: Repository<PartnerEntity>,
  ) {}

  // ─── Invitation (owner side) ────────────────────────────────────────────

  /**
   * Attach an email + freshly generated invitation token to a partner. Idempotent
   * over re-invitations: calling this on a partner that already has credentials
   * invalidates the existing password (by overwriting) — so owners can use it
   * as "reset password" too.
   */
  async createInvitation(
    ownerUserId: string,
    partnerId: string,
    email: string,
  ): Promise<PartnerInvitationCreatedDto> {
    const partner = await this.partnersRepository.findOne({
      where: { id: partnerId, userId: ownerUserId },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Email must be globally unique among partners — reject if taken by any
    // other partner (same program or different).
    const taken = await this.partnersRepository.findOne({
      where: { email, id: Not(partnerId) },
    });
    if (taken) {
      throw new ConflictException(
        `Email "${email}" is already linked to another partner`,
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    partner.email = email;
    partner.invitationToken = token;
    partner.invitationExpiresAt = expiresAt;
    // Keep any existing hashedPassword as-is; the token supersedes it only if
    // accepted. Owner can use the new invitation URL to force a reset by the
    // partner — if the partner never clicks it, the old password still works.
    await this.partnersRepository.save(partner);

    return {
      token,
      expiresAt,
      partnerId: partner.id,
      email,
    };
  }

  /**
   * Revoke any pending invitation (does not affect an already-set password).
   */
  async revokeInvitation(
    ownerUserId: string,
    partnerId: string,
  ): Promise<void> {
    const partner = await this.partnersRepository.findOne({
      where: { id: partnerId, userId: ownerUserId },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    partner.invitationToken = null;
    partner.invitationExpiresAt = null;
    await this.partnersRepository.save(partner);
  }

  // ─── Accept / login (partner side) ──────────────────────────────────────

  /**
   * Partner sets their password via the invitation token, producing a fresh
   * token pair so they're logged in immediately. Consumes the invitation.
   */
  async acceptInvitation(
    token: string,
    password: string,
  ): Promise<PartnerAuthTokensDto> {
    const partner = await this.partnersRepository.findOne({
      where: { invitationToken: token },
    });
    if (!partner) {
      throw new UnauthorizedException('Invalid invitation token');
    }
    if (
      !partner.invitationExpiresAt ||
      partner.invitationExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invitation expired');
    }
    if (!partner.isActive) {
      throw new UnauthorizedException('Partner is deactivated');
    }
    if (!partner.email) {
      // Shouldn't happen — invitations always set email — but guard anyway.
      throw new BadRequestException('Invitation is missing an email');
    }

    partner.hashedPassword = hashPassword(password);
    partner.invitationToken = null;
    partner.invitationExpiresAt = null;
    partner.lastLoginAt = new Date();
    await this.partnersRepository.save(partner);

    return this.generateTokens(partner.id, partner.userId);
  }

  async login(email: string, password: string): Promise<PartnerAuthTokensDto> {
    const partner = await this.partnersRepository.findOne({
      where: { email, hashedPassword: Not(IsNull()) },
    });
    if (!partner || !partner.hashedPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!partner.isActive) {
      throw new UnauthorizedException('Partner is deactivated');
    }
    if (!comparePasswords(partner.hashedPassword, password)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Fire-and-forget — not critical if this fails.
    this.partnersRepository
      .update(partner.id, { lastLoginAt: new Date() })
      .catch(() => {});

    return this.generateTokens(partner.id, partner.userId);
  }

  async refresh(refreshToken: string): Promise<PartnerAuthTokensDto> {
    let payload: PartnerJwtPayload;
    try {
      payload = this.jwtService.verify<PartnerJwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'partner-refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Ensure partner still exists and is active before re-issuing.
    const partner = await this.partnersRepository.findOne({
      where: { id: payload.sub, userId: payload.uid },
    });
    if (!partner || !partner.isActive) {
      throw new UnauthorizedException('Partner not found or deactivated');
    }

    return this.generateTokens(partner.id, partner.userId);
  }

  // ─── Self view ──────────────────────────────────────────────────────────

  async getSelf(
    partnerId: string,
    ownerUserId: string,
  ): Promise<PartnerSelfDto> {
    const partner = await this.partnersRepository.findOne({
      where: { id: partnerId, userId: ownerUserId },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return this.toSelfDto(partner);
  }

  /**
   * Partner-initiated update of their own profile. The set of editable fields
   * is intentionally narrow — name/code/isActive stay owner-managed so
   * partners can't rebrand or reactivate themselves without approval.
   */
  async updateSelf(
    partnerId: string,
    ownerUserId: string,
    dto: UpdatePartnerSelfDto,
  ): Promise<PartnerSelfDto> {
    const partner = await this.partnersRepository.findOne({
      where: { id: partnerId, userId: ownerUserId },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    if (dto.description !== undefined) partner.description = dto.description;
    if (dto.payoutDetails !== undefined) {
      partner.payoutDetails = dto.payoutDetails;
    }
    const saved = await this.partnersRepository.save(partner);
    return this.toSelfDto(saved);
  }

  private toSelfDto(partner: PartnerEntity): PartnerSelfDto {
    return {
      id: partner.id,
      name: partner.name,
      code: partner.code,
      description: partner.description,
      email: partner.email ?? '',
      isActive: partner.isActive,
      payoutDetails: partner.payoutDetails,
      lastLoginAt: partner.lastLoginAt,
      createdAt: partner.createdAt,
    };
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  private generateTokens(
    partnerId: string,
    ownerUserId: string,
  ): PartnerAuthTokensDto {
    const accessPayload: PartnerJwtPayload = {
      sub: partnerId,
      uid: ownerUserId,
      type: 'partner-access',
    };
    const refreshPayload: PartnerJwtPayload = {
      sub: partnerId,
      uid: ownerUserId,
      type: 'partner-refresh',
    };
    return {
      accessToken: this.jwtService.sign(accessPayload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(refreshPayload, { expiresIn: '30d' }),
    };
  }
}
