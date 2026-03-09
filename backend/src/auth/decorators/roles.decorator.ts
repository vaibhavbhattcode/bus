import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'prisma-client-custom';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
