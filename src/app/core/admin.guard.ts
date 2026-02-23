import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';

export const adminGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.getAdminStatus(true).pipe(
    map((status) => (status.owner ? true : router.parseUrl('/dashboard'))),
    catchError(() => of(router.parseUrl('/dashboard')))
  );
};
