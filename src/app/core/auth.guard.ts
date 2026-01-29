import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (!token) {
    return router.parseUrl('/login');
  }
  return true;
};
