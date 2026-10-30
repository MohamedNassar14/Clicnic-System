import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const patientGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const auth = inject(Auth);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return auth.hasPatientSession()
    ? true
    : router.createUrlTree(['/auth/register']);
};