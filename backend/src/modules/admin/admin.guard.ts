import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/jwt.strategy';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (req.user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Solo super admins');
    return true;
  }
}
