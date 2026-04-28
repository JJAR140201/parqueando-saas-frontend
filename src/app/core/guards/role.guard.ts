import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStoreService } from '../services/auth-store.service';
import { Role } from '../models/auth.models';

const fallbackByRole: Record<Role, string> = {
  SUPER_ADMIN: '/app/empresas',
  ADMIN: '/app/usuarios',
  OPERARIO: '/app/operaciones'
};

export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const userRole = authStore.role();
  const allowedRoles = (route.data?.['roles'] as Role[] | undefined) ?? [];

  if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree([fallbackByRole[userRole]]);
};
