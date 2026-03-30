import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwt: { sign: jest.Mock };
  let adminEmail: string | undefined;

  beforeEach(async () => {
    adminEmail = undefined;
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      tenant: {
        create: jest.fn(),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('mock-jwt-token') };

    const configGet = jest.fn((key: string) => {
      if (key === 'auth.adminEmail') return adminEmail;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create tenant, user, and return token on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.tenant.create.mockResolvedValue({ id: 'tenant-1' });
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        role: 'OWNER',
        tenantId: 'tenant-1',
      });

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(prisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: dto.name }),
        }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            password: 'hashed-password',
            name: dto.name,
            tenantId: 'tenant-1',
            role: 'OWNER',
          }),
        }),
      );
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        role: 'OWNER',
      });
    });

    it('should generate a slug from the email prefix', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.tenant.create.mockResolvedValue({ id: 't-1' });
      prisma.user.create.mockResolvedValue({
        id: 'u-1',
        email: dto.email,
        name: dto.name,
        role: 'OWNER',
        tenantId: 't-1',
      });

      await service.register(dto);

      const slugArg = prisma.tenant.create.mock.calls[0][0].data.slug;
      expect(slugArg).toMatch(/^test-\d+$/);
    });
  });

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'pass123' };

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: dto.email,
        password: 'hashed',
        tenant: { active: true },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if tenant is inactive (non-admin)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: dto.email,
        password: 'hashed',
        tenant: { active: false },
        tenantId: 't-1',
        role: 'OWNER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow login for admin even if tenant is inactive', async () => {
      // Rebuild service with ADMIN_EMAIL configured
      const configGet = jest.fn((key: string) => {
        if (key === 'auth.adminEmail') return 'admin@example.com';
        return undefined;
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: jwt },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const adminService = module.get<AuthService>(AuthService);

      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'admin@example.com',
        password: 'hashed',
        tenant: { active: false },
        tenantId: 't-1',
        role: 'OWNER',
        name: 'Admin',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await adminService.login({ email: 'admin@example.com', password: 'pass' });

      expect(result.user.role).toBe('SUPER_ADMIN');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return token and user on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: dto.email,
        password: 'hashed',
        tenant: { active: true },
        tenantId: 't-1',
        role: 'OWNER',
        name: 'User',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'u-1',
        email: dto.email,
        role: 'OWNER',
        tenantId: 't-1',
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('u-1');
    });
  });
});
