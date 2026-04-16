import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtAuthGuard } from './guards/partner-jwt-auth.guard';
import { GetPartner } from './decorators/get-partner.decorator';
import {
  PartnerSelfDto,
  UpdatePartnerSelfDto,
} from './dto/partner-auth.dto';
import { PartnerDashboardDto } from './dto/partner-dashboard.dto';
import {
  PartnerConversionsQueryDto,
  PartnerPaymentsQueryDto,
} from './dto/partner-portal-queries.dto';
import { ConversionsService } from '../conversions/conversions.service';
import { PaymentsService } from '../payments/payments.service';
import { PartnersService } from '../partners/partners.service';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';
import { ConversionEventDto } from '../conversions/dto/responses/conversion-event.dto';
import { PaymentDto } from '../payments/dto/responses/payment.dto';

/**
 * Partner-scoped endpoints — auth via `PartnerJwtAuthGuard`, which populates
 * `request.user = { id: partnerId, userId: tenantOwnerId }`. Every query
 * downstream must scope by BOTH ids.
 */
@ApiTags('partner-portal')
@ApiBearerAuth()
@UseGuards(PartnerJwtAuthGuard)
@Controller('partner-portal')
export class PartnerPortalController {
  constructor(
    private readonly partnerAuthService: PartnerAuthService,
    private readonly partnersService: PartnersService,
    private readonly conversionsService: ConversionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('self')
  @ApiOperation({ summary: 'Return the authenticated partner profile' })
  @ApiResponse({ status: 200, type: PartnerSelfDto })
  getSelf(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
  ): Promise<PartnerSelfDto> {
    return this.partnerAuthService.getSelf(partnerId, ownerUserId);
  }

  @Patch('self')
  @ApiOperation({
    summary:
      'Update partner-editable profile fields (description + payoutDetails)',
  })
  @ApiResponse({ status: 200, type: PartnerSelfDto })
  updateSelf(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
    @Body() dto: UpdatePartnerSelfDto,
  ): Promise<PartnerSelfDto> {
    return this.partnerAuthService.updateSelf(partnerId, ownerUserId, dto);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Aggregated totals for the partner portal home page',
  })
  @ApiResponse({ status: 200, type: PartnerDashboardDto })
  async getDashboard(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
  ): Promise<PartnerDashboardDto> {
    // Fetch partner, conversion totals and payment balance in parallel —
    // they're independent queries and the dashboard is the hottest page.
    const [partner, conversionTotals, balance] = await Promise.all([
      this.partnersService.findOneOrFail(ownerUserId, partnerId),
      this.conversionsService.getPartnerConversionTotals(
        ownerUserId,
        partnerId,
      ),
      this.paymentsService.getPartnerBalance(ownerUserId, partnerId),
    ]);

    return {
      partnerId: partner.id,
      partnerCode: partner.code,
      partnerName: partner.name,
      totalConversions: conversionTotals.totalConversions,
      lastConversionDate: conversionTotals.lastConversionDate,
      totalAccrued: balance.totalAccrued,
      totalPaid: balance.totalPaid,
      pendingPayments: balance.pendingPayments,
      balance: balance.balance,
    };
  }

  @Get('conversions')
  @ApiOperation({ summary: "List this partner's conversion events" })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  getConversions(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
    @Query() query: PartnerConversionsQueryDto,
  ): Promise<PaginatedResponseDto<ConversionEventDto>> {
    // partnerId always pinned from JWT — the query DTO deliberately omits it
    // so a partner can't peek at another partner's data.
    return this.conversionsService.findByPartner(ownerUserId, partnerId, {
      ...query,
      partnerId,
    });
  }

  @Get('payments')
  @ApiOperation({ summary: "List this partner's payments" })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  getPayments(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
    @Query() query: PartnerPaymentsQueryDto,
  ): Promise<PaginatedResponseDto<PaymentDto>> {
    return this.paymentsService.findAll(ownerUserId, {
      ...query,
      partnerId,
    });
  }
}
