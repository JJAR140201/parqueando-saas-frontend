import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensualidadFilters, MensualidadItem, MensualidadPayload } from '../models/mensualidad.models';

@Injectable({ providedIn: 'root' })
export class MensualidadService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/mensualidades`;

  constructor(private readonly http: HttpClient) {}

  create(payload: MensualidadPayload): Observable<MensualidadItem> {
    return this.http.post<unknown>(this.baseUrl, payload).pipe(map((row) => this.normalizeItem(row)));
  }

  list(filters: MensualidadFilters): Observable<MensualidadItem[]> {
    const params = this.buildParams(filters);
    return this.http.get<unknown>(this.baseUrl, { params }).pipe(map((rows) => this.normalizeArray(rows)));
  }

  downloadExcel(filters: MensualidadFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/export/excel`, { params, responseType: 'blob' });
  }

  downloadPdf(filters: MensualidadFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/export/pdf`, { params, responseType: 'blob' });
  }

  update(id: number, payload: MensualidadPayload): Observable<MensualidadItem> {
    return this.http.put<unknown>(`${this.baseUrl}/${id}`, payload).pipe(map((row) => this.normalizeItem(row)));
  }

  cancel(id: number, empresaId: number, sedeId: number): Observable<void> {
    const params = new HttpParams().set('empresaId', empresaId).set('sedeId', sedeId);
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
  }

  private buildParams(filters: MensualidadFilters): HttpParams {
    let params = new HttpParams();

    if (filters.empresaId && filters.empresaId > 0) {
      params = params.set('empresaId', String(filters.empresaId));
    }

    if (filters.sedeId && filters.sedeId > 0) {
      params = params.set('sedeId', String(filters.sedeId));
    }

    if (filters.placa) {
      params = params.set('placa', filters.placa.toUpperCase());
    }

    return params;
  }

  private normalizeArray(raw: unknown): MensualidadItem[] {
    console.log('[MensualidadService.list] Raw response:', raw);

    if (Array.isArray(raw)) {
      console.log('[MensualidadService] Response is array, items:', raw.length);
      return raw.map((item) => this.normalizeItem(item));
    }

    const record = raw as Record<string, unknown>;
    
    if (Array.isArray(record['data'])) {
      console.log('[MensualidadService] Response has .data array, items:', record['data'].length);
      return (record['data'] as unknown[]).map((item) => this.normalizeItem(item));
    }

    if (Array.isArray(record['content'])) {
      console.log('[MensualidadService] Response has .content array, items:', record['content'].length);
      return (record['content'] as unknown[]).map((item) => this.normalizeItem(item));
    }

    // Log available keys for debugging
    const keys = Object.keys(record);
    console.warn('[MensualidadService] Unexpected response format. Available keys:', keys);
    console.warn('[MensualidadService] Full response:', JSON.stringify(record, null, 2));

    return [];
  }

  private normalizeItem(raw: unknown): MensualidadItem {
    const item = (raw ?? {}) as Record<string, unknown>;

    return {
      id: this.toNumber(item['id'] ?? item['suscripcionId']),
      placa: String(item['placa'] ?? '').toUpperCase(),
      tipoVehiculo: String(item['tipoVehiculo'] ?? 'CARRO') as MensualidadItem['tipoVehiculo'],
      valorMensual: this.toNumber(item['valorMensual']),
      fechaInicio: String(item['fechaInicio'] ?? ''),
      fechaFin: String(item['fechaFin'] ?? ''),
      empresaId: this.toNumber(item['empresaId']),
      sedeId: this.toNumber(item['sedeId']),
      activa: Boolean(item['activa'] ?? true)
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
