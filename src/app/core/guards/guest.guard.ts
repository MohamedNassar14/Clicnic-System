import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const guestGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.hasAdminSession()) {
    return router.createUrlTree(['/dashboard']);
  }

  if (auth.hasPatientSession()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
