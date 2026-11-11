import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const role = authService.getUserRole();

  if (role === 'ROLE_ADMIN' || role === 'ROLE_STAND_OWNER') {
    return true; // Accesso consentito per Admin e Gestori Stand
  } else {
    if (typeof window !== 'undefined') {
      alert('Accesso negato! Non hai i permessi per accedere a questa sezione.');
    }
    await router.navigate(['/login']);
    return false;
  }
};
