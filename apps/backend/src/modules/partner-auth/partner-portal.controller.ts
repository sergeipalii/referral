import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtAuthGuard } from './guards/partner-jwt-auth.guard';
import { GetPartner } from './decorators/get-partner.decorator';
import { PartnerSelfDto } from './dto/partner-auth.dto';

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
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  @Get('self')
  @ApiOperation({ summary: 'Return the authenticated partner profile' })
  @ApiResponse({ status: 200, type: PartnerSelfDto })
  getSelf(
    @GetPartner('id') partnerId: string,
    @GetPartner('userId') ownerUserId: string,
  ): Promise<PartnerSelfDto> {
    return this.partnerAuthService.getSelf(partnerId, ownerUserId);
  }
}
