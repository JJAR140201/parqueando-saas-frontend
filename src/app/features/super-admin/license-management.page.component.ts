import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { LicenciaIssuedResult, LicenciaSummary } from '../../core/models/licencia.models';
import { LicenciaService } from '../../core/services/licencia.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-license-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Licencias</h3>
          <p class="text-sm text-slate-500">Emision y control de licencias anuales para nuevos clientes.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openIssueForm()">
          <i class="fa-solid fa-plus mr-2"></i>Generar licencia
        </button>
      </header>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Codigo</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="px-4 py-3 font-semibold">Emision</th>
              <th class="px-4 py-3 font-semibold">Expiracion</th>
              <th class="px-4 py-3 font-semibold">Empresa</th>
              <th class="px-4 py-3 font-semibold">Nota</th>
              <th class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr *ngFor="let licencia of licencias()">
              <td class="px-4 py-3 font-mono text-slate-800">{{ licencia.codigoEnmascarado }}</td>
              <td class="px-4 py-3">
                <span [class]="badgeClass(licencia)">{{ estadoLabel(licencia) }}</span>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ licencia.fechaEmision | date: 'short' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ licencia.fechaExpiracion | date: 'shortDate' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ licencia.empresaNombre || '— sin redimir —' }}</td>
              <td class="px-4 py-3 text-slate-500">{{ licencia.nota || '-' }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  class="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  [disabled]="licencia.estado === 'REVOCADA'"
                  (click)="revoke(licencia)"
                >
                  Revocar
                </button>
              </td>
            </tr>
            <tr *ngIf="!licencias().length && !loading()">
              <td class="px-4 py-8 text-center text-slate-500" colspan="7">No hay licencias emitidas.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" *ngIf="showIssueForm()">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-4 flex items-center justify-between">
            <h4 class="text-lg font-semibold text-slate-900">Generar licencia</h4>
            <button class="text-slate-400" type="button" (click)="closeIssueForm()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form class="space-y-4" [formGroup]="issueForm" (ngSubmit)="issue()">
            <label class="block space-y-1">
              <span class="text-sm font-medium text-slate-700">Duracion</span>
              <select class="input-base" formControlName="duracionDias">
                <option [value]="365">1 ano</option>
                <option [value]="180">6 meses</option>
                <option [value]="90">3 meses</option>
              </select>
            </label>

            <label class="block space-y-1">
              <span class="text-sm font-medium text-slate-700">Nota interna (opcional)</span>
              <textarea class="input-base" rows="3" formControlName="nota" placeholder="Ej: Cliente Parqueadero Central, contacto 3001234567"></textarea>
            </label>

            <div class="flex justify-end gap-2">
              <button class="btn-secondary" type="button" (click)="closeIssueForm()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="issueForm.invalid || loading()">
                {{ loading() ? 'Generando...' : 'Generar' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" *ngIf="issuedLicense()">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-card">
          <h4 class="mb-2 text-lg font-semibold text-slate-900">Licencia generada</h4>
          <p class="mb-4 text-sm text-amber-600">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>Este codigo solo se muestra una vez. Copialo y entregalo al cliente.
          </p>

          <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
            <span class="flex-1 break-all">{{ issuedLicense()?.codigo }}</span>
            <button class="btn-secondary" type="button" (click)="copyCode()">
              <i class="fa-solid fa-copy mr-1"></i>Copiar
            </button>
          </div>

          <p class="mt-3 text-xs text-slate-500">
            Expira: {{ issuedLicense()?.fechaExpiracion | date: 'longDate' }}
          </p>

          <div class="mt-5 flex justify-end">
            <button class="btn-primary" type="button" (click)="closeIssuedModal()">Listo</button>
          </div>
        </div>
      </div>
    </section>
  `
})
export class LicenseManagementPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly licenciaService = inject(LicenciaService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly licencias = signal<LicenciaSummary[]>([]);
  readonly showIssueForm = signal(false);
  readonly issuedLicense = signal<LicenciaIssuedResult | null>(null);

  readonly issueForm = this.fb.nonNullable.group({
    duracionDias: [365, Validators.required],
    nota: ['']
  });

  constructor() {
    this.loadLicencias();
  }

  loadLicencias(): void {
    this.loading.set(true);
    this.licenciaService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (licencias) => this.licencias.set(licencias),
        error: () => this.errorToast('No se pudo cargar el listado de licencias.')
      });
  }

  openIssueForm(): void {
    this.issueForm.reset({ duracionDias: 365, nota: '' });
    this.showIssueForm.set(true);
  }

  closeIssueForm(): void {
    this.showIssueForm.set(false);
  }

  issue(): void {
    if (this.issueForm.invalid) {
      this.issueForm.markAllAsTouched();
      return;
    }

    const value = this.issueForm.getRawValue();
    this.loading.set(true);
    this.licenciaService
      .issue({ duracionDias: Number(value.duracionDias), nota: value.nota || undefined })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.closeIssueForm();
          this.issuedLicense.set(result);
          this.loadLicencias();
        },
        error: () => this.errorToast('No fue posible generar la licencia.')
      });
  }

  closeIssuedModal(): void {
    this.issuedLicense.set(null);
  }

  copyCode(): void {
    const codigo = this.issuedLicense()?.codigo;
    if (!codigo || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(codigo).then(() => {
      this.toastService.show({ title: 'Codigo copiado', description: 'El codigo se copio al portapapeles.', type: 'success' });
    });
  }

  revoke(licencia: LicenciaSummary): void {
    this.loading.set(true);
    this.licenciaService
      .revoke(licencia.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({ title: 'Licencia revocada', description: 'La licencia fue revocada correctamente.', type: 'success' });
          this.loadLicencias();
        },
        error: () => this.errorToast('No fue posible revocar la licencia.')
      });
  }

  estadoLabel(licencia: LicenciaSummary): string {
    if (licencia.estado === 'REDIMIDA' && new Date(licencia.fechaExpiracion) < new Date()) {
      return 'VENCIDA';
    }
    return licencia.estado;
  }

  badgeClass(licencia: LicenciaSummary): string {
    const base = 'rounded-full px-3 py-1 text-xs font-semibold';
    const estado = this.estadoLabel(licencia);
    if (estado === 'REDIMIDA') {
      return `${base} bg-emerald-50 text-emerald-700`;
    }
    if (estado === 'PENDIENTE') {
      return `${base} bg-slate-100 text-slate-600`;
    }
    return `${base} bg-rose-50 text-rose-600`;
  }

  private errorToast(description: string): void {
    this.toastService.show({ title: 'Operacion fallida', description, type: 'error' });
  }
}
