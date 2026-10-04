import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntradaPayload, SalidaPayload, SalidaResumen } from '../models/parking.models';

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/registros`;
  private readonly legacyBaseUrl = `${environment.apiUrl}/api/v1/operaciones/parqueadero`;

  constructor(private readonly http: HttpClient) {}

  registrarEntrada(payload: EntradaPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/entrada`, payload).pipe(
      catchError(() => this.http.post(`${this.legacyBaseUrl}/entradas`, payload))
    );
  }

  previsualizarSalida(placa: string): Observable<SalidaResumen> {
    const params = new HttpParams().set('placa', placa);
    return this.http
      .get<unknown>(`${this.legacyBaseUrl}/salidas/precio`, { params })
      .pipe(
        map((res) => this.normalizeResumen(res)),
        catchError(() =>
          this.http
            .post<unknown>(`${this.baseUrl}/salida`, { placa })
            .pipe(map((res) => this.normalizeResumen(res)))
        )
      );
  }

  registrarSalida(payload: SalidaPayload): Observable<SalidaResumen> {
    return this.http.post<unknown>(`${this.baseUrl}/salida`, payload).pipe(
      map((res) => this.normalizeResumen(res)),
      catchError(() =>
        this.http
          .post<unknown>(`${this.legacyBaseUrl}/salidas`, payload)
          .pipe(map((res) => this.normalizeResumen(res)))
      )
    );
  }

  generarTicketPdf(placa: string): Observable<Blob> {
    const params = new HttpParams().set('placa', placa);
    return this.http
      .get(`${this.baseUrl}/salidas/ticket`, { params, responseType: 'blob' })
      .pipe(
        catchError(() =>
          this.http.get(`${this.legacyBaseUrl}/salidas/ticket`, { params, responseType: 'blob' })
        )
      );
  }

  private normalizeResumen(raw: unknown): SalidaResumen {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      placa: String(r['placa'] ?? ''),
      tipoVehiculo: String(r['tipoVehiculo'] ?? r['tipo'] ?? 'CARRO') as SalidaResumen['tipoVehiculo'],
      tipo: r['tipo'] ? String(r['tipo']) : undefined,
      fechaEntrada: r['fechaEntrada'] ? String(r['fechaEntrada']) : undefined,
      fechaSalida: r['fechaSalida'] ? String(r['fechaSalida']) : undefined,
      minutosEstadia: r['minutosEstadia'] !== undefined ? this.toNumber(r['minutosEstadia']) : undefined,
      horas: this.toNumber(r['horas']),
      totalPagado: this.toNumber(r['totalPagado'] ?? r['total'])
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
