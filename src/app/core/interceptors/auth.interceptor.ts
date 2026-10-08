import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStoreService } from '../services/auth-store.service';

// Rutas publicas del backend: nunca deben disparar el flujo de refresh.
const AUTH_FREE_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/licencias/validar',
  '/api/v1/licencias/redimir',
  '/api/v1/licencias/renovar'
];

// Estado compartido entre requests concurrentes para no disparar varios /refresh a la vez.
// null = renovando; '' = la renovacion fallo; otro valor = nuevo access token.
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
      // Solo un 401 indica que el access token falta, es invalido o expiro. Un 403 es un permiso
      // denegado (por ejemplo, un ADMIN consultando una ruta de SUPER_ADMIN): no se renueva el token
      // ni se cierra la sesion, el error le llega a la pantalla que hizo la peticion.
      if (isAuthFreeRequest || !(error instanceof HttpErrorResponse) || error.status !== 401) {
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
          switchMap((newToken) =>
            newToken ? next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })) : throwError(() => error)
          )
        );
      }

      isRefreshing = true;
      refreshedAccessToken$.next(null);

      return authService.refresh().pipe(
        // La captura va ANTES del reintento: solo un fallo al renovar cierra la sesion; si la peticion
        // reintentada falla por otra razon (403, 500...), ese error sigue su camino sin sacar al usuario.
        catchError((refreshError) => {
          isRefreshing = false;
          refreshedAccessToken$.next('');
          authStore.clearSession();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
        switchMap((session) => {
          isRefreshing = false;
          refreshedAccessToken$.next(session.accessToken);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }));
        })
      );
    })
  );
};
