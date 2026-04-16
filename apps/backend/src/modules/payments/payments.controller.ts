import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/requests/create-payment.dto';
import { UpdatePaymentDto } from './dto/requests/update-payment.dto';
import { PaymentsQueryDto } from './dto/requests/payments-query.dto';
import { PaymentsExportQueryDto } from './dto/requests/payments-export-query.dto';
import {
  BatchPaymentsResultDto,
  CreateBatchPaymentsDto,
} from './dto/requests/create-batch-payments.dto';
import { PaymentDto } from './dto/responses/payment.dto';
import { PartnerBalanceDto } from './dto/responses/partner-balance.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination-meta.dto';
import { StandardResponseDto } from '../../common/dto/standard-response.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @GetUser('id') userId: string,
    @Query() query: PaymentsQueryDto,
  ): Promise<PaginatedResponseDto<PaymentDto>> {
    return this.paymentsService.findAll(userId, query);
  }

  @Get('balance/:partnerId')
  @ApiOperation({ summary: 'Get partner balance (accrued vs paid)' })
  @ApiResponse({ status: 200, type: PartnerBalanceDto })
  getBalance(
    @GetUser('id') userId: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ): Promise<PartnerBalanceDto> {
    return this.paymentsService.getPartnerBalance(userId, partnerId);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({
    summary:
      'CSV export of payments joined with partner details (for finance/bank portals)',
  })
  @ApiProduces('text/csv')
  async exportCsv(
    @GetUser('id') userId: string,
    @Query() query: PaymentsExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const csv = await this.paymentsService.exportCsv(userId, query);
    const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    return csv;
  }

  @Post('batch')
  @ApiOperation({
    summary:
      'Create pending payments in bulk (one per eligible partner at their current balance)',
  })
  @ApiResponse({ status: 201, type: BatchPaymentsResultDto })
  createBatch(
    @GetUser('id') userId: string,
    @Body() dto: CreateBatchPaymentsDto,
  ): Promise<BatchPaymentsResultDto> {
    return this.paymentsService.createBatch(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentDto })
  async findOne(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDto> {
    const payment = await this.paymentsService.findOneOrFail(userId, id);
    return PaymentDto.fromEntity(payment);
  }

  @Post()
  @ApiOperation({ summary: 'Record a payment' })
  @ApiResponse({ status: 201, type: PaymentDto })
  create(
    @GetUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentDto> {
    return this.paymentsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, type: PaymentDto })
  update(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ): Promise<PaymentDto> {
    return this.paymentsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment' })
  @ApiResponse({ status: 200, type: StandardResponseDto })
  remove(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponseDto> {
    return this.paymentsService.remove(userId, id);
  }
}
