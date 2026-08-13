import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStoreService } from '../services/auth-store.service';

// Rutas publicas del backend: nunca deben disparar el flujo de refresh.
const AUTH_FREE_PATHS = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/logout'];

// Estado compartido entre requests concurrentes para no disparar varios /refresh a la vez.
let isRefreshing = false;
const refreshedAccessToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStoreService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authStore.token();
  const authRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  const isAuthFreeRequest = AUTH_FREE_PATHS.some((path) => request.url.includes(path));

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      // El backend responde 403 (no 401) cuando el access token falta, es invalido o expiro.
      if (isAuthFreeRequest || !(error instanceof HttpErrorResponse) || error.status !== 403) {
        return throwError(() => error);
      }

      if (!authStore.refreshToken()) {
        authStore.clearSession();
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshedAccessToken$.pipe(
          filter((newToken): newToken is string => newToken !== null),
          take(1),
          switchMap((newToken) => next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })))
        );
      }

      isRefreshing = true;
      refreshedAccessToken$.next(null);

      return authService.refresh().pipe(
        switchMap((session) => {
          isRefreshing = false;
          refreshedAccessToken$.next(session.accessToken);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }));
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          authStore.clearSession();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};
