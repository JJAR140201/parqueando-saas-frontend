import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStoreService } from '../services/auth-store.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStoreService);
  const token = authStore.token();

  if (!token) {
    return next(request);
  }

  const authRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authRequest);
};
