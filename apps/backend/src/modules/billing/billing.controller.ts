import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { BillingService } from './billing.service';
import {
  ChangePlanRequestDto,
  CheckoutContextDto,
  CreateCheckoutSessionDto,
  InvoicePdfUrlDto,
  PaymentMethodUpdateUrlDto,
  SubscriptionDto,
} from './dto/billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiOperation({
    summary:
      'Current subscription state: plan, status, features and usage against plan limits',
  })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  getSubscription(@GetUser('id') userId: string): Promise<SubscriptionDto> {
    return this.billingService.getSubscription(userId);
  }

  @Post('checkout')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Resolve the Paddle price + customer ids for a paid-plan checkout. The frontend feeds them into `Paddle.Checkout.open(...)`; no server-side session is created.',
  })
  @ApiResponse({ status: 200, type: CheckoutContextDto })
  createCheckout(
    @GetUser('id') userId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutContextDto> {
    return this.billingService.createCheckout(userId, dto.planKey);
  }

  @Post('change-plan')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Upgrade or downgrade an existing Paddle subscription. Paddle prorates the price difference immediately.',
  })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  changePlan(
    @GetUser('id') userId: string,
    @Body() dto: ChangePlanRequestDto,
  ): Promise<SubscriptionDto> {
    return this.billingService.changePlan(userId, dto.planKey);
  }

  @Get('payment-method-update-url')
  @ApiOperation({
    summary:
      'One-time Paddle URL for updating the saved payment method. Short-lived; regenerate per view.',
  })
  @ApiResponse({ status: 200, type: PaymentMethodUpdateUrlDto })
  getPaymentMethodUpdateUrl(
    @GetUser('id') userId: string,
  ): Promise<PaymentMethodUpdateUrlDto> {
    return this.billingService.getPaymentMethodUpdateUrl(userId);
  }

  @Post('cancel')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Schedule cancellation at the end of the current billing period. Access is preserved until `currentPeriodEnd`.',
  })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  cancelSubscription(@GetUser('id') userId: string): Promise<SubscriptionDto> {
    return this.billingService.cancelSubscription(userId);
  }

  @Get('invoices')
  @ApiOperation({
    summary:
      'List invoices mirrored from Paddle transactions. Empty until the first paid transaction lands.',
  })
  listInvoices(@GetUser('id') userId: string) {
    return this.billingService.listInvoices(userId);
  }

  @Get('invoices/:id/pdf-url')
  @ApiOperation({
    summary:
      'On-demand Paddle invoice-PDF URL. Short-lived — regenerate per download.',
  })
  @ApiResponse({ status: 200, type: InvoicePdfUrlDto })
  getInvoicePdfUrl(
    @GetUser('id') userId: string,
    @Param('id') invoiceId: string,
  ): Promise<InvoicePdfUrlDto> {
    return this.billingService.getInvoicePdfUrl(userId, invoiceId);
  }
}
