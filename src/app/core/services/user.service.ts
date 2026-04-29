import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, CreateUserPayload } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly listUsersUrl = `${environment.apiUrl}/api/v1/admin/usuarios`;
  private readonly createUserUrl = `${environment.apiUrl}/api/v1/super-admin/usuarios`;

  constructor(private readonly http: HttpClient) {}

  getUsersByCompany(companyId: number): Observable<AppUser[]> {
    const params = new HttpParams().set('empresaId', companyId);

    return this.http.get<unknown>(this.listUsersUrl, { params }).pipe(
      map((users) => this.normalizeUserArray(users)),
      catchError(() =>
        this.http
          .get<unknown>(`${this.listUsersUrl}/empresa/${companyId}`)
          .pipe(
            map((users) => this.normalizeUserArray(users)),
            catchError(() =>
              this.http
                .get<unknown>(`${environment.apiUrl}/api/v1/super-admin/empresas/${companyId}/usuarios`)
                .pipe(
                  map((users) => this.normalizeUserArray(users)),
                  catchError((error) => throwError(() => error))
                )
            )
          )
      )
    );
  }

  createUser(payload: CreateUserPayload): Observable<AppUser> {
    const requestPayload = {
      nombre: payload.nombre,
      username: payload.username,
      password: payload.password,
      rol: payload.role,
      empresaId: payload.empresaId,
      sedeId: payload.sedeId
    };

    return this.http.post<unknown>(this.createUserUrl, requestPayload).pipe(
      map((user) => this.normalizeUser(user)),
      catchError(() =>
        this.http
          .post<unknown>(this.listUsersUrl, requestPayload)
          .pipe(map((user) => this.normalizeUser(user)))
      )
    );
  }

  private normalizeUserArray(raw: unknown): AppUser[] {
    if (Array.isArray(raw)) {
      return raw.map((user) => this.normalizeUser(user));
    }

    const record = raw as Record<string, unknown>;
    if (Array.isArray(record['data'])) {
      return (record['data'] as unknown[]).map((user) => this.normalizeUser(user));
    }

    if (Array.isArray(record['content'])) {
      return (record['content'] as unknown[]).map((user) => this.normalizeUser(user));
    }

    return [];
  }

  private normalizeUser(raw: unknown): AppUser {
    const user = raw as Record<string, unknown>;

    return {
      id: this.toNumberOrUndefined(user['id'] ?? user['usuarioId']),
      nombre: this.toStringOrUndefined(user['nombre'] ?? user['name']),
      username: String(user['username'] ?? user['usuario'] ?? ''),
      role: String(user['role'] ?? user['rol'] ?? 'OPERARIO') as AppUser['role'],
      empresaId: this.toNumber(user['empresaId']),
      sedeId: this.toNumber(user['sedeId'])
    };
  }

  private toStringOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return String(value);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toNumberOrUndefined(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
