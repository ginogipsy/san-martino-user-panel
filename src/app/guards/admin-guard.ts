import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, AppRole } from '../services/auth';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  await router.navigate(['/login']);
  return false;
};

export function roleGuard(allowedRoles: AppRole[]): CanActivateFn {
  return async () => {
    const authService = inject(Auth);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      await router.navigate(['/login']);
      return false;
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    await router.navigate(['/dashboard']);
    return false;
  };
}

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const allowedRoles = (route?.data?.['roles'] as AppRole[] | undefined) || [
    'ROLE_ADMIN',
    'ROLE_STAND_OWNER',
  ];

  if (!authService.isAuthenticated()) {
    await router.navigate(['/login']);
    return false;
  }

  if (authService.hasAnyRole(allowedRoles)) {
    return true;
  }

  await router.navigate(['/dashboard']);
  return false;
};
