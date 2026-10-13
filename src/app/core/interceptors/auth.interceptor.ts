import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../../features/auth/services/auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = inject(Auth).getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  }));
};
