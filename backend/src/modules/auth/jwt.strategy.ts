import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });
    if (!user) throw new UnauthorizedException();

    // Override role for SUPER_ADMIN
    const adminEmail = process.env.ADMIN_EMAIL;
    const role = user.email === adminEmail ? 'SUPER_ADMIN' : user.role;

    return { ...user, role };
  }
}
