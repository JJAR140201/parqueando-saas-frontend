import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cliente,
  ClientePatch,
  WhatsappCuenta,
  WhatsappCuentaPayload,
  WhatsappMensaje,
  WhatsappMensajeFilters,
  WhatsappMensajesPagina,
  WhatsappMetricas
} from '../models/whatsapp.models';

export const WHATSAPP_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/whatsapp`;
  private readonly clientesUrl = `${environment.apiUrl}/api/v1/clientes`;

  /** null cuando la empresa todavia no configuro WhatsApp (204). */
  getCuenta(empresaId?: number): Observable<WhatsappCuenta | null> {
    return this.http.get<WhatsappCuenta | null>(`${this.baseUrl}/cuenta`, { params: this.empresaParams(empresaId) });
  }

  saveCuenta(payload: WhatsappCuentaPayload, empresaId?: number): Observable<WhatsappCuenta> {
    return this.http.put<WhatsappCuenta>(`${this.baseUrl}/cuenta`, payload, { params: this.empresaParams(empresaId) });
  }

  sendTest(telefono: string, empresaId?: number): Observable<WhatsappMensaje> {
    return this.http.post<WhatsappMensaje>(`${this.baseUrl}/mensajes/prueba`, { telefono }, {
      params: this.empresaParams(empresaId)
    });
  }

  /** El total de mensajes viene en la cabecera X-Total-Count. */
  getMensajes(
    filters: WhatsappMensajeFilters,
    page: number,
    empresaId?: number,
    size = WHATSAPP_PAGE_SIZE
  ): Observable<WhatsappMensajesPagina> {
    let params = this.empresaParams(empresaId).set('page', String(page)).set('size', String(size));
    if (filters.estado) {
      params = params.set('estado', filters.estado);
    }
    if (filters.tipo) {
      params = params.set('tipo', filters.tipo);
    }
    if (filters.desde) {
      params = params.set('desde', filters.desde);
    }
    if (filters.hasta) {
      params = params.set('hasta', filters.hasta);
    }

    return this.http.get<WhatsappMensaje[]>(`${this.baseUrl}/mensajes`, { params, observe: 'response' }).pipe(
      map((response) => {
        const items = response.body ?? [];
        const total = Number(response.headers.get('X-Total-Count'));
        return { items, total: response.headers.has('X-Total-Count') && Number.isFinite(total) ? total : items.length };
      })
    );
  }

  getMetricas(filters: WhatsappMensajeFilters, empresaId?: number): Observable<WhatsappMetricas> {
    let params = this.empresaParams(empresaId);
    if (filters.desde) {
      params = params.set('desde', filters.desde);
    }
    if (filters.hasta) {
      params = params.set('hasta', filters.hasta);
    }
    return this.http.get<WhatsappMetricas>(`${this.baseUrl}/metricas`, { params });
  }

  getClientes(empresaId?: number): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.clientesUrl, { params: this.empresaParams(empresaId) });
  }

  updateCliente(id: number, patch: ClientePatch): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.clientesUrl}/${id}`, patch);
  }

  private empresaParams(empresaId?: number): HttpParams {
    return empresaId ? new HttpParams().set('empresaId', String(empresaId)) : new HttpParams();
  }
}
