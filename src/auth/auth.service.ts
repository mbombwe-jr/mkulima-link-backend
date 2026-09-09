import { ForbiddenException, HttpException, HttpStatus, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { authenticator } from 'otplib';
import { AuthUser } from '../common/auth.types';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { RedisService } from '../infrastructure/redis.service';
import { AdminLoginDto, ChangePinDto, RequestOtpDto, VerifyOtpDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private redis: RedisService, private jwt: JwtService, private config: ConfigService, private providers: ProvidersService) {}

  async requestOtp(dto: RequestOtpDto): Promise<Record<string, unknown>> {
    const countKey = `otp:count:${dto.phone}`;
    const count = Number((await this.safeGet(countKey)) ?? 0);
    if (count >= 3) throw new HttpException('OTP request limit reached', HttpStatus.TOO_MANY_REQUESTS);
    const otp = randomInt(100000, 1000000).toString();
    await this.redis.setex(`otp:${dto.phone}:${dto.role}`, 300, JSON.stringify({ hash: await hash(otp, 10), attempts: 0 }));
    await this.redis.setex(countKey, 3600, String(count + 1));
    await this.providers.sendSms(dto.phone, `Mkulima Link: Nambari yako ya uthibitisho ni ${otp}. Halali kwa dakika 5.`);
    return { message: 'OTP sent', expiresIn: 300, ...(this.config.get('OTP_EXPOSE_IN_RESPONSE') === 'true' ? { otp } : {}) };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<Record<string, unknown>> {
    const key = `otp:${dto.phone}:${dto.role}`;
    const raw = await this.safeGet(key);
    if (!raw) throw new UnprocessableEntityException('OTP expired or was not requested');
    const record = JSON.parse(raw) as { hash: string; attempts: number };
    if (record.attempts >= 3) throw new HttpException('OTP is locked', HttpStatus.TOO_MANY_REQUESTS);
    if (!(await compare(dto.otp, record.hash))) {
      await this.redis.setex(key, 600, JSON.stringify({ ...record, attempts: record.attempts + 1 }));
      throw new UnprocessableEntityException('Invalid OTP');
    }
    await this.redis.del(key);
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) return this.tokens({ sub: dto.phone, phone: dto.phone, role: 'registration', isVerified: true, isDisqualified: false }, 15);
    if (user.role !== dto.role) throw new ForbiddenException('Phone is registered for a different role');
    if (!user.isActive || user.verificationStatus === 'suspended') throw new ForbiddenException('Account is suspended');
    return this.tokens({ sub: user.id, phone: user.phone, role: user.role, isVerified: user.isVerified, isDisqualified: user.isDisqualified });
  }

  async refresh(refreshToken: string): Promise<Record<string, unknown>> {
    const payload = this.jwt.verify<AuthUser & { jti: string; tokenType: string }>(refreshToken, this.verifyOptions());
    if (payload.tokenType !== 'refresh' || !(await this.safeGet(`refresh:${payload.jti}`))) throw new ForbiddenException('Refresh token is invalid or revoked');
    const user: AuthUser = { sub: payload.sub, role: payload.role, phone: payload.phone, isVerified: payload.isVerified, isDisqualified: payload.isDisqualified, admin: payload.admin };
    return this.tokens(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    try { const payload = this.jwt.verify<{ jti: string }>(refreshToken, this.verifyOptions()); await this.redis.del(`refresh:${payload.jti}`); } catch { /* Logout is idempotent. */ }
    return { message: 'Logged out' };
  }

  async changePin(user: AuthUser, dto: ChangePinDto): Promise<{ message: string }> {
    const raw = await this.safeGet(`otp:${user.phone}:seller`);
    if (!raw || !(await compare(dto.otp, (JSON.parse(raw) as { hash: string }).hash))) throw new UnprocessableEntityException('Invalid or expired OTP');
    await this.prisma.sellerProfile.update({ where: { userId: user.sub }, data: { ussdPin: await hash(dto.newPin, 12) } });
    await this.redis.del(`otp:${user.phone}:seller`);
    return { message: 'PIN changed' };
  }

  async adminLogin(dto: AdminLoginDto): Promise<Record<string, unknown>> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!admin?.isActive || !(await compare(dto.password, admin.passwordHash))) throw new ForbiddenException('Invalid credentials');
    if (admin.totpSecret && (!dto.totp || !authenticator.check(dto.totp, admin.totpSecret))) throw new ForbiddenException('Valid TOTP is required');
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
    return this.tokens({ sub: admin.id, role: admin.role, isVerified: true, isDisqualified: false, admin: true }, 480);
  }

  private async tokens(user: AuthUser, accessMinutes = Number(this.config.get('ACCESS_TOKEN_EXPIRE_MINUTES', 15))): Promise<Record<string, unknown>> {
    const jti = randomUUID();
    const accessToken = this.jwt.sign(user, { ...this.signOptions(), expiresIn: `${accessMinutes}m` });
    const days = Number(this.config.get('REFRESH_TOKEN_EXPIRE_DAYS', 30));
    const refreshToken = this.jwt.sign({ ...user, jti, tokenType: 'refresh' }, { ...this.signOptions(), expiresIn: `${days}d` });
    await this.redis.setex(`refresh:${jti}`, days * 86400, user.sub);
    return { accessToken, refreshToken, expiresIn: accessMinutes * 60, user };
  }

  private signOptions(): any {
    const privateKey = this.config.get<string>('JWT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    return privateKey ? { privateKey, algorithm: 'RS256' } : { secret: this.config.getOrThrow('JWT_SECRET'), algorithm: 'HS256' };
  }
  private verifyOptions(): any {
    const publicKey = this.config.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n');
    return publicKey ? { publicKey, algorithms: ['RS256'] } : { secret: this.config.getOrThrow('JWT_SECRET'), algorithms: ['HS256'] };
  }
  private async safeGet(key: string): Promise<string | null> { try { return await this.redis.get(key); } catch { throw new ForbiddenException('Authentication store is unavailable'); } }
}
