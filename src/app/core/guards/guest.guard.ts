import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const guestGuard: CanActivateFn = (_route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const auth = inject(Auth);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (auth.hasAdminSession()) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  if (auth.hasPatientSession()) {
    if (state.url === '/auth/register' && auth.hasIncompletePatientProfile()) {
      return true;
    }

    return router.createUrlTree(['/home']);
  }

  return true;
};