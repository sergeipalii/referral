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
import { AccrualRulesService } from './accrual-rules.service';
import { CreateAccrualRuleDto } from './dto/requests/create-accrual-rule.dto';
import { UpdateAccrualRuleDto } from './dto/requests/update-accrual-rule.dto';
import { AccrualRulesQueryDto } from './dto/requests/accrual-rules-query.dto';
import { AccrualRuleDto } from './dto/responses/accrual-rule.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';

@ApiTags('accrual-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accrual-rules')
export class AccrualRulesController {
  constructor(private readonly accrualRulesService: AccrualRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List accrual rules' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @GetUser('id') userId: string,
    @Query() query: AccrualRulesQueryDto,
  ): Promise<PaginatedResponseDto<AccrualRuleDto>> {
    return this.accrualRulesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get accrual rule by ID' })
  @ApiResponse({ status: 200, type: AccrualRuleDto })
  async findOne(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccrualRuleDto> {
    const rule = await this.accrualRulesService.findOneOrFail(userId, id);
    return AccrualRuleDto.fromEntity(rule);
  }

  @Post()
  @ApiOperation({ summary: 'Create accrual rule' })
  @ApiResponse({ status: 201, type: AccrualRuleDto })
  create(
    @GetUser('id') userId: string,
    @Body() dto: CreateAccrualRuleDto,
  ): Promise<AccrualRuleDto> {
    return this.accrualRulesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update accrual rule' })
  @ApiResponse({ status: 200, type: AccrualRuleDto })
  update(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccrualRuleDto,
  ): Promise<AccrualRuleDto> {
    return this.accrualRulesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete accrual rule' })
  @ApiResponse({ status: 200, type: StandardResponseDto })
  remove(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponseDto> {
    return this.accrualRulesService.remove(userId, id);
  }
}
