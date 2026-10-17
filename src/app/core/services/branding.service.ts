import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Branding, BrandingPayload } from '../models/branding.models';

export const DEFAULT_BRAND_COLOR = '#0b1220';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);

  private readonly state = signal<Branding>({});

  readonly color = computed(() => this.state().colorMarca || DEFAULT_BRAND_COLOR);
  readonly logo = computed(() => this.state().logo || null);

  /** Carga la marca de la empresa del usuario logueado y la aplica a toda la app. */
  loadMine(): void {
    this.http.get<Branding>(`${environment.apiUrl}/api/v1/branding`).subscribe({
      next: (branding) => this.set(branding),
      error: () => this.reset()
    });
  }

  /** SUPER_ADMIN: guarda color y logo de una empresa. */
  update(empresaId: number, payload: BrandingPayload): Observable<Branding> {
    return this.http
      .put<Branding>(`${environment.apiUrl}/api/v1/super-admin/empresas/${empresaId}/branding`, payload)
      .pipe(tap(() => undefined));
  }

  set(branding: Branding): void {
    this.state.set(branding);
    this.applyColor(branding.colorMarca || DEFAULT_BRAND_COLOR);
  }

  reset(): void {
    this.set({});
  }

  /** Aplica un color como variable CSS global (--brand) con su color de texto legible. */
  applyColor(color: string): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }
    root.style.setProperty('--brand', color);
    root.style.setProperty('--brand-contrast', contrastColor(color));
  }
}

/** Blanco u oscuro segun la luminancia del color de fondo, para mantener el texto legible. */
export function contrastColor(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return '#ffffff';
  }
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}
