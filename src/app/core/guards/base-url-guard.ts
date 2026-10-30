import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const baseUrlGuard: CanMatchFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  auth.clearAdminSession();

  return router.createUrlTree(['/home']);
};