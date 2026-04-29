import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
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
    this.authStore.clearSession();
  }

  private mapSession(response: unknown, fallbackUsername: string): SessionUser {
    const body = response as Record<string, unknown>;
    const accessToken = String(body['accessToken'] ?? body['token'] ?? '');
    const empresaId = this.toNumberOrNull(body['empresaId']);
    const sedeId = this.toNumberOrNull(body['sedeId']);
    const usuarioId = this.toNumberOrNull(body['usuarioId'] ?? body['id']);
    const role = String(body['role'] ?? body['rol'] ?? 'OPERARIO') as Role;
    const username = String(body['username'] ?? body['usuario'] ?? fallbackUsername);
    const tokenName = this.extractNameFromToken(accessToken);
    const nombre = String(
      body['nombre'] ??
      body['name'] ??
      body['nombreCompleto'] ??
      body['fullName'] ??
      tokenName ??
      username
    );

    return {
      accessToken,
      empresaId,
      sedeId,
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

  private extractNameFromToken(token: string): string | null {
    const payload = this.readTokenPayload(token);
    if (!payload) {
      return null;
    }

    const candidate =
      payload['nombre'] ??
      payload['name'] ??
      payload['given_name'] ??
      payload['preferred_username'] ??
      payload['unique_name'];

    if (candidate === null || candidate === undefined || candidate === '') {
      return null;
    }

    return String(candidate);
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
