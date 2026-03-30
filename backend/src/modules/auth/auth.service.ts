import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly adminEmail: string | undefined;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.adminEmail = this.config.get<string>('auth.adminEmail');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email ya registrado');

    const hash = await bcrypt.hash(dto.password, 12);

    // Create tenant for new user
    const slug =
      dto.email
        .split('@')[0]!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') +
      '-' +
      Date.now();
    const tenant = await this.prisma.tenant.create({
      data: { name: dto.name, slug },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    const token = this.signToken(user.id, user.email, user.role, tenant.id);
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    // Check tenant active (skip for super admin)
    if (user.email !== this.adminEmail && user.tenant && !user.tenant.active) {
      throw new ForbiddenException('Cuenta suspendida');
    }

    const role = user.email === this.adminEmail ? 'SUPER_ADMIN' : user.role;
    const token = this.signToken(user.id, user.email, role, user.tenantId ?? undefined);
    return { token, user: { id: user.id, email: user.email, name: user.name, role } };
  }

  private signToken(userId: string, email: string, role: string, tenantId?: string): string {
    return this.jwt.sign({ sub: userId, email, role, tenantId });
  }
}
