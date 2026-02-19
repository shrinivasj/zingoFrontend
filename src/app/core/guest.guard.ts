import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  if (token) {
    return router.parseUrl('/dashboard');
  }
  return true;
};
