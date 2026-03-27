import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { inject } from '@angular/core';
import { AuthenticationService } from './authentication.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthenticationService);
  const token = authService.getToken();

  const isAuthCall = req.url.includes(`${environment.apiBaseUrl}/auth`);

  if (!token || isAuthCall) {
    return next(req);
  }

  authService.recordActivity();

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
