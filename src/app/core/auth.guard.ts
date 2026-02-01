import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) {
    return router.parseUrl('/login');
  }

  return auth.user$.pipe(
    take(1),
    switchMap((user) => {
      if (user) {
        return of(true);
      }

      return auth.loadMe().pipe(
        map(() => true),
        catchError(() => {
          auth.logout();
          return of(router.parseUrl('/login'));
        })
      );
    })
  );
};
