import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/requests/create-partner.dto';
import { UpdatePartnerDto } from './dto/requests/update-partner.dto';
import { PartnersQueryDto } from './dto/requests/partners-query.dto';
import { PartnerDto } from './dto/responses/partner.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';
import { PlanLimitGuard } from '../billing/guards/plan-limit.guard';
import { RequireWithinLimit } from '../billing/decorators/plan-gate.decorators';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanLimitGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'List partners' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @GetUser('id') userId: string,
    @Query() query: PartnersQueryDto,
  ): Promise<PaginatedResponseDto<PartnerDto>> {
    return this.partnersService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID' })
  @ApiResponse({ status: 200, type: PartnerDto })
  async findOne(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PartnerDto> {
    const partner = await this.partnersService.findOneOrFail(userId, id);
    return PartnerDto.fromEntity(partner);
  }

  @Post()
  @RequireWithinLimit('maxPartners')
  @ApiOperation({ summary: 'Create partner' })
  @ApiResponse({ status: 201, type: PartnerDto })
  create(
    @GetUser('id') userId: string,
    @Body() dto: CreatePartnerDto,
  ): Promise<PartnerDto> {
    return this.partnersService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update partner' })
  @ApiResponse({ status: 200, type: PartnerDto })
  update(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
  ): Promise<PartnerDto> {
    return this.partnersService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate partner (soft delete)' })
  @ApiResponse({ status: 200, type: StandardResponseDto })
  deactivate(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponseDto> {
    return this.partnersService.deactivate(userId, id);
  }
}
