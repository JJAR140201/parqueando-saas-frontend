import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParkingReportFilters, ParkingReportItem } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/reportes/parqueo`;

  constructor(private readonly http: HttpClient) {}

  getParkingReport(filters: ParkingReportFilters): Observable<ParkingReportItem[]> {
    const params = this.buildParams(filters);

    return this.http.get<unknown>(this.baseUrl, { params }).pipe(
      map((response) => this.normalizeReportArray(response))
    );
  }

  downloadExcel(filters: ParkingReportFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/excel`, { params, responseType: 'blob' });
  }

  downloadPdf(filters: ParkingReportFilters): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/pdf`, { params, responseType: 'blob' });
  }

  private buildParams(filters: ParkingReportFilters): HttpParams {
    let params = new HttpParams().set('empresaId', filters.empresaId);

    if (filters.sedeId) {
      params = params.set('sedeId', filters.sedeId);
    }

    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }

    if (filters.desde) {
      params = params.set('desde', filters.desde);
    }

    if (filters.hasta) {
      params = params.set('hasta', filters.hasta);
    }

    return params;
  }

  private normalizeReportArray(raw: unknown): ParkingReportItem[] {
    if (Array.isArray(raw)) {
      return raw.map((item) => this.normalizeItem(item));
    }

    const response = raw as Record<string, unknown>;
    if (Array.isArray(response['data'])) {
      return (response['data'] as unknown[]).map((item) => this.normalizeItem(item));
    }

    if (Array.isArray(response['content'])) {
      return (response['content'] as unknown[]).map((item) => this.normalizeItem(item));
    }

    return [];
  }

  private normalizeItem(raw: unknown): ParkingReportItem {
    const item = raw as Record<string, unknown>;

    return {
      id: this.toNumberOrUndefined(item['id'] ?? item['registroId']),
      empresaId: this.toNumberOrUndefined(item['empresaId']),
      sedeId: this.toNumberOrUndefined(item['sedeId']),
      placa: String(item['placa'] ?? ''),
      tipoVehiculo: String(item['tipoVehiculo'] ?? item['tipo'] ?? ''),
      estado: String(item['estado'] ?? ''),
      fechaIngreso: this.toStringOrUndefined(item['fechaIngreso'] ?? item['fechaEntrada']),
      fechaSalida: this.toStringOrUndefined(item['fechaSalida']),
      totalCobrado: this.toNumberOrUndefined(item['totalCobrado'] ?? item['valor'] ?? item['total']),
      nombreEmpresa: this.toStringOrUndefined(item['nombreEmpresa'] ?? item['empresaNombre']),
      nombreSede: this.toStringOrUndefined(item['nombreSede'] ?? item['sedeNombre'])
    };
  }

  private toNumberOrUndefined(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private toStringOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return String(value);
  }
}
