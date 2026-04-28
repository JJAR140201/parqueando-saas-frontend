import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, CreateUserPayload } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/admin/usuarios`;

  constructor(private readonly http: HttpClient) {}

  getUsersByCompany(companyId: number): Observable<AppUser[]> {
    const params = new HttpParams().set('empresaId', companyId);

    return this.http.get<unknown>(this.baseUrl, { params }).pipe(
      map((users) => this.normalizeUserArray(users)),
      catchError(() =>
        this.http
          .get<unknown>(`${this.baseUrl}/empresa/${companyId}`)
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
    return this.http.post<AppUser>(this.baseUrl, payload);
  }

  private normalizeUserArray(raw: unknown): AppUser[] {
    if (Array.isArray(raw)) {
      return raw as AppUser[];
    }

    const record = raw as Record<string, unknown>;
    if (Array.isArray(record['data'])) {
      return record['data'] as AppUser[];
    }

    if (Array.isArray(record['content'])) {
      return record['content'] as AppUser[];
    }

    return [];
  }
}
