import { AdminRole, UserRole } from '@prisma/client';

export type Role = UserRole | AdminRole | 'registration';

export interface AuthUser {
  sub: string;
  role: Role;
  phone?: string;
  isVerified: boolean;
  isDisqualified: boolean;
  admin?: boolean;
}
