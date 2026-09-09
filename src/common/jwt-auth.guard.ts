import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { AuthUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user: AuthUser }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    try {
      request.user = this.jwt.verify<AuthUser>(token, this.verifyOptions());
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private verifyOptions(): { secret?: string; publicKey?: string; algorithms?: ['RS256'] } {
    const publicKey = this.config.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n');
    return publicKey
      ? { publicKey, algorithms: ['RS256'] }
      : { secret: this.config.getOrThrow<string>('JWT_SECRET') };
  }
}
