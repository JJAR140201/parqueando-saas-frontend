import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
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
    return this.http.get<SalidaResumen>(`${this.legacyBaseUrl}/salidas/precio`, { params });
  }

  registrarSalida(payload: SalidaPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/salida`, payload).pipe(
      catchError(() => this.http.post(`${this.legacyBaseUrl}/salidas`, payload))
    );
  }
}
