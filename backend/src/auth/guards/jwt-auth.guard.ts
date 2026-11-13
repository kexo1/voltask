import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth.types';
import { ACCESS_COOKIE, readCookie } from '../auth-cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request.headers.cookie, ACCESS_COOKIE);
    if (!token) {
      throw new UnauthorizedException('Authentication is required');
    }

    let payload: { sub?: unknown; email?: unknown; sid?: unknown };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Authentication is required');
    }

    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.email !== 'string' ||
      typeof payload.sid !== 'string'
    ) {
      throw new UnauthorizedException('Authentication is required');
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
      select: { user: { select: { id: true, email: true } } },
    });
    if (!session || session.user.email !== payload.email) {
      throw new UnauthorizedException('Authentication is required');
    }

    request.user = session.user;
    return true;
  }
}
