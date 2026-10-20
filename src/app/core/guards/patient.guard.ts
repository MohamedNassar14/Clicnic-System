import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const patientGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const auth = inject(Auth);

  return auth.hasPatientSession() ? true : router.createUrlTree(['/auth/register']);
};
