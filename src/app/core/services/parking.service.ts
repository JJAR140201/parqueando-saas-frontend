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
      .get<unknown>(`${this.baseUrl}/preview`, { params })
      .pipe(
        map((res) => this.normalizeResumen(res)),
        catchError(() =>
          this.http
            .get<unknown>(`${this.legacyBaseUrl}/salidas/precio`, { params })
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

  private normalizeResumen(raw: unknown): SalidaResumen {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      placa: String(r['placa'] ?? ''),
      tipoVehiculo: String(r['tipoVehiculo'] ?? r['tipo'] ?? 'CARRO') as SalidaResumen['tipoVehiculo'],
      horas: this.toNumber(r['horas'] ?? r['horasParqueado'] ?? r['tiempoHoras'] ?? r['duracion']),
      total: this.toNumber(r['total'] ?? r['totalCobrado'] ?? r['valorTotal'] ?? r['monto'] ?? r['valor'])
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
