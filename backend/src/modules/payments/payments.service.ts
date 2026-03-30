import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-03-25.dahlia',
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set — Stripe features will be unavailable',
      );
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payment features.',
      );
    }
    return this.stripe;
  }

  // ─── Infoproductor: Create Stripe Customer ──────────────────────

  async createCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.stripeCustomerId) {
      return { customerId: user.stripeCustomerId };
    }

    const customer = await this.requireStripe().customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return { customerId: customer.id };
  }

  // ─── Infoproductor: Deposit budget into campaign ────────────────

  async createCampaignDeposit(
    userId: string,
    campaignId: string,
    amountCents: number,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId)
      throw new ForbiddenException('Not your campaign');

    // Ensure user has a Stripe customer
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user!.stripeCustomerId) {
      await this.createCustomer(userId);
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    }

    const session = await this.requireStripe().checkout.sessions.create({
      customer: user!.stripeCustomerId!,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `Campaign deposit: ${campaign.title}`,
              metadata: { campaignId },
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: { campaignId, userId },
      success_url: `${this.config.get('FRONTEND_URL')}/campaigns/${campaignId}?deposit=success`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/campaigns/${campaignId}?deposit=cancelled`,
    });

    return { sessionId: session.id, url: session.url };
  }

  // ─── Clipper: Stripe Connect Express onboarding ─────────────────

  async onboardConnect(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.stripeConnectId) {
      // Already has account, return new onboarding link
      const link = await this.requireStripe().accountLinks.create({
        account: user.stripeConnectId,
        refresh_url: `${this.config.get('FRONTEND_URL')}/connect/refresh`,
        return_url: `${this.config.get('FRONTEND_URL')}/connect/complete`,
        type: 'account_onboarding',
      });
      return { accountId: user.stripeConnectId, url: link.url };
    }

    const account = await this.requireStripe().accounts.create({
      type: 'express',
      email: user.email,
      metadata: { userId: user.id },
      capabilities: {
        transfers: { requested: true },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeConnectId: account.id },
    });

    const link = await this.requireStripe().accountLinks.create({
      account: account.id,
      refresh_url: `${this.config.get('FRONTEND_URL')}/connect/refresh`,
      return_url: `${this.config.get('FRONTEND_URL')}/connect/complete`,
      type: 'account_onboarding',
    });

    return { accountId: account.id, url: link.url };
  }

  // ─── Clipper: Check Connect account status ──────────────────────

  async getConnectStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.stripeConnectId) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false };
    }

    const account = await this.requireStripe().accounts.retrieve(user.stripeConnectId);
    return {
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ─── Webhook: checkout.session.completed ────────────────────────

  async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const campaignId = session.metadata?.campaignId;
    if (!campaignId) return;

    const amountCents = session.amount_total ?? 0;

    // Idempotency: skip if this checkout session was already processed
    const existing = await this.prisma.campaignDeposit.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) {
      this.logger.warn(
        `Duplicate webhook for checkout session ${session.id} — skipping`,
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.campaignDeposit.create({
        data: {
          campaignId,
          stripeSessionId: session.id,
          amountCents,
        },
      }),
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { budgetCents: { increment: amountCents } },
      }),
    ]);
  }

  // ─── Webhook: account.updated ───────────────────────────────────

  async handleAccountUpdated(account: Stripe.Account) {
    // Nothing to persist beyond the initial stripeConnectId —
    // the connect status endpoint queries Stripe live.
  }

  // ─── Clipper: My earnings ───────────────────────────────────────

  async getEarnings(clipperId: string) {
    const earnings = await this.prisma.earning.findMany({
      where: { clipperId },
      orderBy: { createdAt: 'desc' },
      include: {
        claim: {
          select: {
            submissions: { select: { socialUrl: true, viewCount: true, platform: true } },
            campaignClip: { select: { campaign: { select: { title: true } } } },
          },
        },
      },
    });

    const totalPending = earnings
      .filter((e) => e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amountCents, 0);

    return { earnings, totalPendingCents: totalPending };
  }

  // ─── Clipper: My payouts ────────────────────────────────────────

  async getPayouts(clipperId: string) {
    return this.prisma.payout.findMany({
      where: { clipperId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Clipper: Request manual payout ─────────────────────────────

  async requestPayout(clipperId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: clipperId },
    });
    if (!user?.stripeConnectId)
      throw new BadRequestException(
        'Stripe Connect account not set up. Complete onboarding first.',
      );

    // Check Connect account is active
    const account = await this.requireStripe().accounts.retrieve(user.stripeConnectId);
    if (!account.payouts_enabled)
      throw new BadRequestException(
        'Stripe Connect account not fully verified yet.',
      );

    // Only include earnings where the 48h payout hold has expired and claim is not flagged
    const pendingEarnings = await this.prisma.earning.findMany({
      where: {
        clipperId,
        status: 'PENDING',
        claim: {
          OR: [
            { payoutHoldUntil: null },
            { payoutHoldUntil: { lt: new Date() } },
          ],
          flaggedForReview: false,
        },
      },
    });

    const totalCents = pendingEarnings.reduce(
      (sum, e) => sum + e.amountCents,
      0,
    );
    const minPayoutCents = 2500; // $25 minimum

    if (totalCents < minPayoutCents)
      throw new BadRequestException(
        `Minimum payout is $25. Current balance: $${(totalCents / 100).toFixed(2)}`,
      );

    // Create Stripe transfer
    const transfer = await this.requireStripe().transfers.create({
      amount: totalCents,
      currency: 'usd',
      destination: user.stripeConnectId,
      metadata: { clipperId },
    });

    // Create payout record and mark earnings as paid
    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({
        data: {
          clipperId,
          amountCents: totalCents,
          stripeTransferId: transfer.id,
          status: 'COMPLETED',
        },
      });

      await tx.earning.updateMany({
        where: {
          id: { in: pendingEarnings.map((e) => e.id) },
        },
        data: { status: 'PAID', paidAt: new Date() },
      });

      return p;
    });

    return payout;
  }

  // ─── Stripe instance getter (for webhook verification) ─────────

  getStripeInstance(): Stripe {
    return this.requireStripe();
  }
}
