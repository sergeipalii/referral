import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
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
  CheckoutSessionCreatedDto,
  CreateCheckoutSessionDto,
  PortalSessionCreatedDto,
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
  getSubscription(
    @GetUser('id') userId: string,
  ): Promise<SubscriptionDto> {
    return this.billingService.getSubscription(userId);
  }

  @Post('checkout')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Create a Stripe Checkout Session for upgrading to a paid plan. Returns a hosted URL to redirect the owner to.',
  })
  @ApiResponse({ status: 200, type: CheckoutSessionCreatedDto })
  createCheckout(
    @GetUser('id') userId: string,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionCreatedDto> {
    return this.billingService.createCheckout(userId, dto.planKey);
  }

  @Post('portal')
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Create a Stripe Customer Portal Session so the owner can manage payment method, invoices, cancellation. Requires an existing Stripe customer (after first successful checkout).",
  })
  @ApiResponse({ status: 200, type: PortalSessionCreatedDto })
  createPortal(
    @GetUser('id') userId: string,
  ): Promise<PortalSessionCreatedDto> {
    return this.billingService.createPortal(userId);
  }

  @Get('invoices')
  @ApiOperation({
    summary:
      'List invoices mirrored from Stripe. Empty until the first paid invoice lands.',
  })
  listInvoices(@GetUser('id') userId: string) {
    return this.billingService.listInvoices(userId);
  }
}
