import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  RawBodyRequest,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { DepositDto } from './dto/payments.dto';

interface AuthRequest extends Request {
  user: { id: string; email: string; name: string; role: string; tenantId: string | null };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private config: ConfigService,
  ) {}

  // ─── Infoproductor endpoints ────────────────────────────────────

  @Post('create-customer')
  @UseGuards(AuthGuard('jwt'))
  createCustomer(@Request() req: AuthRequest) {
    return this.paymentsService.createCustomer(req.user.id);
  }

  @Post('campaigns/deposit')
  @UseGuards(AuthGuard('jwt'))
  createDeposit(@Request() req: AuthRequest, @Body() dto: DepositDto) {
    return this.paymentsService.createCampaignDeposit(
      req.user.id,
      dto.campaignId,
      dto.amountCents,
    );
  }

  // ─── Clipper: Connect endpoints ─────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(AuthGuard('jwt'))
  onboardConnect(@Request() req: AuthRequest) {
    return this.paymentsService.onboardConnect(req.user.id);
  }

  @Get('connect/status')
  @UseGuards(AuthGuard('jwt'))
  getConnectStatus(@Request() req: AuthRequest) {
    return this.paymentsService.getConnectStatus(req.user.id);
  }

  // ─── Clipper: Earnings & Payouts ────────────────────────────────

  @Get('earnings')
  @UseGuards(AuthGuard('jwt'))
  getEarnings(@Request() req: AuthRequest) {
    return this.paymentsService.getEarnings(req.user.id);
  }

  @Get('payouts')
  @UseGuards(AuthGuard('jwt'))
  getPayouts(@Request() req: AuthRequest) {
    return this.paymentsService.getPayouts(req.user.id);
  }

  @Post('payouts/request')
  @UseGuards(AuthGuard('jwt'))
  requestPayout(@Request() req: AuthRequest) {
    return this.paymentsService.requestPayout(req.user.id);
  }

  // ─── Stripe Webhooks ───────────────────────────────────────────

  @Post('webhooks/stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    const stripe = this.paymentsService.getStripeInstance();
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret)
      throw new BadRequestException('Webhook secret not configured');

    const rawBody = req.rawBody;
    if (!rawBody)
      throw new BadRequestException('Missing raw body');

    let event: import('stripe').Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.paymentsService.handleCheckoutCompleted(
          event.data.object as import('stripe').Stripe.Checkout.Session,
        );
        break;
      case 'account.updated':
        await this.paymentsService.handleAccountUpdated(
          event.data.object as import('stripe').Stripe.Account,
        );
        break;
    }

    return { received: true };
  }
}
