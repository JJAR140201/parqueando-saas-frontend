import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, Role, SessionUser } from '../models/auth.models';
import { AuthStoreService } from './auth-store.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/auth`;

  constructor(
    private readonly http: HttpClient,
    private readonly authStore: AuthStoreService
  ) {}

  login(payload: LoginRequest): Observable<SessionUser> {
    return this.http.post<unknown>(`${this.baseUrl}/login`, payload).pipe(
      map((response) => this.mapSession(response, payload.username)),
      tap((session) => this.authStore.setSession(session))
    );
  }

  refresh(): Observable<SessionUser> {
    const refreshToken = this.authStore.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible'));
    }

    return this.http.post<unknown>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      map((response) => this.mapSession(response, this.authStore.username())),
      tap((session) => this.authStore.setSession(session))
    );
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/register`, {
      nombre: payload.nombre,
      username: payload.username,
      password: payload.password,
      rol: payload.role,
      empresaId: payload.empresaId,
      sedeId: payload.sedeId
    });
  }

  logout(): void {
    const refreshToken = this.authStore.refreshToken();
    this.authStore.clearSession();

    if (refreshToken) {
      this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
  }

  private mapSession(response: unknown, fallbackUsername: string): SessionUser {
    const body = response as Record<string, unknown>;
    const accessToken = String(body['accessToken'] ?? body['token'] ?? '');
    const refreshToken = String(body['refreshToken'] ?? '');
    const tokenPayload = this.readTokenPayload(accessToken);
    const empresaId = this.toNumberOrNull(body['empresaId']);
    const sedeId = this.toNumberOrNull(body['sedeId']);
    const usuarioId = this.toNumberOrNull(body['usuarioId'] ?? body['id']);
    const role = String(body['role'] ?? body['rol'] ?? 'OPERARIO') as Role;
    const username = String(body['username'] ?? body['usuario'] ?? fallbackUsername);
    const tokenName = this.extractClaim(tokenPayload, ['nombre', 'name', 'given_name', 'preferred_username', 'unique_name']);
    const empresaNombre = this.extractClaim(tokenPayload, ['empresaNombre', 'nombreEmpresa', 'empresa']);
    const sedeNombre = this.extractClaim(tokenPayload, ['sedeNombre', 'nombreSede', 'sede']);
    const nombre = String(
      body['nombre'] ??
      body['name'] ??
      body['nombreCompleto'] ??
      body['fullName'] ??
      tokenName ??
      username
    );
    const resolvedEmpresaNombre = this.toStringOrUndefined(body['empresaNombre'] ?? body['nombreEmpresa'] ?? body['empresa']) ?? empresaNombre;
    const resolvedSedeNombre = this.toStringOrUndefined(body['sedeNombre'] ?? body['nombreSede'] ?? body['sede']) ?? sedeNombre;

    return {
      accessToken,
      refreshToken,
      empresaId,
      empresaNombre: resolvedEmpresaNombre,
      sedeId,
      sedeNombre: resolvedSedeNombre,
      usuarioId,
      role,
      username,
      nombre
    };
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private extractClaim(payload: Record<string, unknown> | null, keys: string[]): string | undefined {
    if (!payload) {
      return undefined;
    }

    const candidate = keys.map((key) => payload[key]).find((value) => value !== null && value !== undefined && value !== '');

    if (candidate === null || candidate === undefined || candidate === '') {
      return undefined;
    }

    return String(candidate);
  }

  private toStringOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return String(value);
  }

  private readTokenPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2 || typeof atob !== 'function') {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const parsed = JSON.parse(atob(padded)) as Record<string, unknown>;
      return parsed;
    } catch {
      return null;
    }
  }
}
