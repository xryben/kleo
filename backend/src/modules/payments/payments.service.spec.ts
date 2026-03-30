import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: Record<string, any>;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      campaign: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      campaignDeposit: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue({}) },
      earning: { findMany: jest.fn() },
      payout: { findMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        const values: Record<string, string> = {
          STRIPE_SECRET_KEY: '', // No Stripe key — Stripe disabled
          FRONTEND_URL: 'http://localhost:3000',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createCustomer', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.createCustomer('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return existing customerId if already set', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'test@test.com',
        stripeCustomerId: 'cus_existing',
      });

      const result = await service.createCustomer('u-1');
      expect(result.customerId).toBe('cus_existing');
    });

    it('should throw ServiceUnavailableException when Stripe is not configured', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'test@test.com',
        stripeCustomerId: null,
      });

      await expect(service.createCustomer('u-1')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getEarnings', () => {
    it('should return earnings and total pending', async () => {
      prisma.earning.findMany.mockResolvedValue([
        { id: 'e-1', status: 'PENDING', amountCents: 500, claim: {} },
        { id: 'e-2', status: 'PENDING', amountCents: 300, claim: {} },
        { id: 'e-3', status: 'PAID', amountCents: 1000, claim: {} },
      ]);

      const result = await service.getEarnings('clipper-1');

      expect(result.earnings).toHaveLength(3);
      expect(result.totalPendingCents).toBe(800);
    });

    it('should return zero pending when all paid', async () => {
      prisma.earning.findMany.mockResolvedValue([
        { id: 'e-1', status: 'PAID', amountCents: 1000, claim: {} },
      ]);

      const result = await service.getEarnings('clipper-1');
      expect(result.totalPendingCents).toBe(0);
    });

    it('should return empty earnings for new clipper', async () => {
      prisma.earning.findMany.mockResolvedValue([]);

      const result = await service.getEarnings('clipper-1');
      expect(result.earnings).toHaveLength(0);
      expect(result.totalPendingCents).toBe(0);
    });
  });

  describe('getPayouts', () => {
    it('should return payouts for clipper', async () => {
      prisma.payout.findMany.mockResolvedValue([
        { id: 'p-1', amountCents: 5000, status: 'COMPLETED' },
      ]);

      const result = await service.getPayouts('clipper-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe('COMPLETED');
    });
  });

  describe('requestPayout', () => {
    it('should throw BadRequestException if no Connect account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        stripeConnectId: null,
      });

      await expect(service.requestPayout('u-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException when Stripe not configured', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        stripeConnectId: 'acct_123',
      });

      await expect(service.requestPayout('u-1')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('handleCheckoutCompleted', () => {
    it('should skip if no campaignId in metadata', async () => {
      await service.handleCheckoutCompleted({ metadata: {} } as any);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should skip duplicate webhook (idempotency)', async () => {
      prisma.campaignDeposit.findUnique.mockResolvedValue({ id: 'dep-1' });

      await service.handleCheckoutCompleted({
        id: 'cs_123',
        metadata: { campaignId: 'camp-1' },
        amount_total: 5000,
      } as any);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create deposit and increment budget on new checkout', async () => {
      prisma.campaignDeposit.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      await service.handleCheckoutCompleted({
        id: 'cs_123',
        metadata: { campaignId: 'camp-1' },
        amount_total: 5000,
      } as any);

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.anything(), // campaignDeposit.create
        expect.anything(), // campaign.update
      ]);
    });
  });

  describe('getConnectStatus', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getConnectStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return not connected if no stripeConnectId', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        stripeConnectId: null,
      });

      const result = await service.getConnectStatus('u-1');
      expect(result.connected).toBe(false);
    });
  });

  describe('getStripeInstance', () => {
    it('should throw ServiceUnavailableException when Stripe not configured', () => {
      expect(() => service.getStripeInstance()).toThrow(ServiceUnavailableException);
    });
  });
});
