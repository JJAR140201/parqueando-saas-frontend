import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IssueLicenciaPayload,
  LicenciaIssuedResult,
  LicenciaSummary,
  ValidateLicenciaResult
} from '../models/licencia.models';

@Injectable({ providedIn: 'root' })
export class LicenciaService {
  private readonly adminBaseUrl = `${environment.apiUrl}/api/v1/super-admin/licencias`;
  private readonly publicBaseUrl = `${environment.apiUrl}/api/v1/licencias`;

  constructor(private readonly http: HttpClient) {}

  issue(payload: IssueLicenciaPayload): Observable<LicenciaIssuedResult> {
    return this.http.post<LicenciaIssuedResult>(this.adminBaseUrl, payload);
  }

  list(): Observable<LicenciaSummary[]> {
    return this.http.get<LicenciaSummary[]>(this.adminBaseUrl);
  }

  revoke(id: number): Observable<LicenciaSummary> {
    return this.http.post<LicenciaSummary>(`${this.adminBaseUrl}/${id}/revocar`, {});
  }

  validar(codigo: string): Observable<ValidateLicenciaResult> {
    return this.http.post<ValidateLicenciaResult>(`${this.publicBaseUrl}/validar`, { codigo });
  }
}
