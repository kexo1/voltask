import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth.types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      AuthenticatedRequest & { headers: AuthenticatedRequest['headers'] & { origin?: string } }
    >();

    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const configuredOrigin =
      process.env.FRONTEND_URL ?? 'http://localhost:5173';
    let allowedOrigin: string;
    try {
      allowedOrigin = new URL(configuredOrigin).origin;
    } catch {
      throw new Error('FRONTEND_URL must be a valid origin');
    }

    if (request.headers.origin !== allowedOrigin) {
      throw new ForbiddenException('Request origin is not allowed');
    }

    return true;
  }
}
