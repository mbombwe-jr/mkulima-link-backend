import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('allows an assigned role and rejects another role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['super_admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = (role: string) => ({ getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) }) as any;
    expect(guard.canActivate(context('super_admin'))).toBe(true);
    expect(() => guard.canActivate(context('helpdesk'))).toThrow(ForbiddenException);
  });
});
