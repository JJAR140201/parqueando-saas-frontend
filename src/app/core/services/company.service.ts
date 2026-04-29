import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company, CompanyPayload, Sede } from '../models/company.models';

interface TarifaPayload {
  valorFraccionCarro: number;
  minutosFraccionCarro: number;
  valorFraccionMoto: number;
  minutosFraccionMoto: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/super-admin/empresas`;

  constructor(private readonly http: HttpClient) {}

  getAll(search?: string): Observable<Company[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<unknown[]>(this.baseUrl, { params }).pipe(
      map((companies) => companies.map((company) => this.normalizeCompany(company)))
    );
  }

  create(payload: CompanyPayload): Observable<Company> {
    return this.http.post<unknown>(this.baseUrl, this.toApiCompanyPayload(payload)).pipe(
      map((company) => this.normalizeCompany(company)),
      switchMap((company) => this.syncTarifas(company, payload))
    );
  }

  update(companyId: number, payload: CompanyPayload): Observable<Company> {
    return this.http.put<unknown>(`${this.baseUrl}/${companyId}`, this.toApiCompanyPayload(payload)).pipe(
      map((company) => this.normalizeCompany(company)),
      switchMap((company) => this.syncTarifas(company, payload))
    );
  }

  delete(companyId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${companyId}`);
  }

  getSedesByCompany(companyId: number): Observable<Sede[]> {
    const params = new HttpParams().set('empresaId', companyId);

    return this.http.get<unknown>(`${this.baseUrl}/${companyId}/sedes`).pipe(
      map((response) => this.normalizeSedeArray(response)),
      catchError(() =>
        this.http
          .get<unknown>(`${environment.apiUrl}/api/v1/super-admin/sedes`, { params })
          .pipe(
            map((response) => this.normalizeSedeArray(response)),
            catchError((error) => throwError(() => error))
          )
      )
    );
  }

  configureTarifas(companyId: number, sedeId: number, payload: TarifaPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${companyId}/sedes/${sedeId}/tarifas`, payload);
  }

  private normalizeCompany(rawCompany: unknown): Company {
    const company = rawCompany as Record<string, unknown>;

    return {
      id: this.toNumber(company['id'] ?? company['empresaId']),
      nit: String(company['nit'] ?? ''),
      nombre: String(company['nombre'] ?? company['razonSocial'] ?? ''),
      sedes: Array.isArray(company['sedes'])
        ? (company['sedes'] as unknown[]).map((sede) => this.normalizeSede(sede))
        : []
    };
  }

  private normalizeSede(rawSede: unknown): Sede {
    const sede = rawSede as Record<string, unknown>;

    return {
      id: this.toNumber(sede['id'] ?? sede['sedeId']),
      nombre: String(sede['nombre'] ?? sede['nombreSede'] ?? ''),
      capacidad: this.toNumber(sede['capacidad'] ?? sede['capacidadTotal'] ?? sede['capacidadMaxima']),
      valorFraccionCarro: this.toOptionalNumber(sede['valorFraccionCarro']),
      minutosFraccionCarro: this.toOptionalNumber(sede['minutosFraccionCarro']),
      valorFraccionMoto: this.toOptionalNumber(sede['valorFraccionMoto']),
      minutosFraccionMoto: this.toOptionalNumber(sede['minutosFraccionMoto'])
    };
  }

  private toApiCompanyPayload(payload: CompanyPayload): Record<string, unknown> {
    return {
      nit: payload.nit,
      nombre: payload.nombre,
      sedes: payload.sedes.map((sede) => ({
        id: sede.id,
        nombre: sede.nombre,
        capacidadTotal: sede.capacidad
      }))
    };
  }

  private normalizeSedeArray(raw: unknown): Sede[] {
    if (Array.isArray(raw)) {
      return raw.map((sede) => this.normalizeSede(sede));
    }

    const record = raw as Record<string, unknown>;
    if (Array.isArray(record['data'])) {
      return (record['data'] as unknown[]).map((sede) => this.normalizeSede(sede));
    }

    if (Array.isArray(record['content'])) {
      return (record['content'] as unknown[]).map((sede) => this.normalizeSede(sede));
    }

    return [];
  }

  private syncTarifas(company: Company, payload: CompanyPayload): Observable<Company> {
    if (!company.id || !payload.sedes.length) {
      return of(company);
    }

    const sedes = company.sedes ?? [];
    const requests = payload.sedes
      .map((sedePayload, index) => {
        const sedeId = sedePayload.id ?? sedes[index]?.id;
        if (!sedeId) {
          return null;
        }

        return this.configureTarifas(company.id as number, sedeId, {
          valorFraccionCarro: sedePayload.valorFraccionCarro ?? 0,
          minutosFraccionCarro: sedePayload.minutosFraccionCarro ?? 0,
          valorFraccionMoto: sedePayload.valorFraccionMoto ?? 0,
          minutosFraccionMoto: sedePayload.minutosFraccionMoto ?? 0
        });
      })
      .filter((request): request is Observable<void> => request !== null);

    if (!requests.length) {
      return of(company);
    }

    return forkJoin(requests).pipe(map(() => company));
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
