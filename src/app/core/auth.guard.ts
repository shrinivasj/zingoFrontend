import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) {
    return router.parseUrl('/login');
  }

  // Don't block navigation on /auth/me; hydrate in background.
  if (!auth.getCurrentUser()) {
    auth.loadMe().subscribe({
      error: () => {
        auth.logout();
        router.navigateByUrl('/login');
      }
    });
  }

  return true;
};
