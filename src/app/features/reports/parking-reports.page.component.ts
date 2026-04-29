import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Company, Sede } from '../../core/models/company.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CompanyService } from '../../core/services/company.service';
import { ReportService } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';
import { ParkingReportItem, ReportStatus } from '../../core/models/report.models';

@Component({
  selector: 'app-parking-reports-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Reportes de Parqueo</h3>
          <p class="text-sm text-slate-500">Consulta registros y descarga reportes en JSON, Excel o PDF.</p>
        </div>
        <span class="badge-role">{{ authStore.role() }}</span>
      </header>

      <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4" [formGroup]="form">
        <label class="space-y-1" *ngIf="isSuperAdmin(); else fixedEmpresaBlock">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
          <select class="input-base" formControlName="empresaId" (change)="onCompanyChange()">
            <option [ngValue]="0">Todas</option>
            <option *ngFor="let company of companies()" [ngValue]="company.id ?? 0">{{ company.nombre }}</option>
          </select>
        </label>
        <ng-template #fixedEmpresaBlock>
          <label class="space-y-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
            <input class="input-base" [value]="scopedCompanyName()" readonly />
          </label>
        </ng-template>

        <label class="space-y-1" *ngIf="isSuperAdmin(); else fixedSedeBlock">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
          <select class="input-base" formControlName="sedeId">
            <option [ngValue]="0">Todas</option>
            <option *ngFor="let sede of sedes()" [ngValue]="sede.id ?? 0">{{ sede.nombre }}</option>
          </select>
        </label>
        <ng-template #fixedSedeBlock>
          <label class="space-y-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
            <input class="input-base" [value]="scopedSedeName()" readonly />
          </label>
        </ng-template>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
          <select class="input-base" formControlName="estado">
            <option value="">Todos</option>
            <option *ngFor="let status of statuses" [value]="status">{{ status }}</option>
          </select>
        </label>


        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</span>
          <input class="input-base" type="date" formControlName="desde" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</span>
          <input class="input-base" type="date" formControlName="hasta" />
        </label>
      </form>

      <div class="flex flex-wrap gap-2">
        <button class="btn-primary" type="button" (click)="loadReport()" [disabled]="loading() || form.invalid">
          {{ loading() ? 'Consultando...' : 'Consultar JSON' }}
        </button>
        <button class="btn-secondary" type="button" (click)="downloadExcel()" [disabled]="loading() || form.invalid">
          <i class="fa-solid fa-file-excel mr-2"></i>Descargar Excel
        </button>
        <button class="btn-secondary" type="button" (click)="downloadPdf()" [disabled]="loading() || form.invalid">
          <i class="fa-solid fa-file-pdf mr-2"></i>Descargar PDF
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Placa</th>
              <th class="px-4 py-3 font-semibold">Tipo</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="px-4 py-3 font-semibold">Ingreso</th>
              <th class="px-4 py-3 font-semibold">Salida</th>
              <th class="px-4 py-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr *ngFor="let item of rows()">
              <td class="px-4 py-3 font-medium text-slate-800">{{ item.placa }}</td>
              <td class="px-4 py-3 text-slate-700">{{ item.tipoVehiculo || '-' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ item.estado || '-' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ item.fechaIngreso || '-' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ item.fechaSalida || '-' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ item.totalCobrado ?? 0 | number }}</td>
            </tr>
            <tr *ngIf="!rows().length && !loading()">
              <td class="px-4 py-8 text-center text-slate-500" colspan="6">No hay registros para los filtros seleccionados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class ParkingReportsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly reportService = inject(ReportService);
  private readonly toastService = inject(ToastService);
  readonly authStore = inject(AuthStoreService);

  readonly loading = signal(false);
  readonly rows = signal<ParkingReportItem[]>([]);
  readonly companies = signal<Company[]>([]);
  readonly sedes = signal<Sede[]>([]);
  readonly statuses: ReportStatus[] = ['ACTIVO', 'FINALIZADO'];
  readonly isSuperAdmin = computed(() => this.authStore.role() === 'SUPER_ADMIN');
  readonly scopedCompanyName = computed(() => {
    const id = this.authStore.empresaId();
    if (!id) {
      return 'Sin empresa anclada';
    }

    return this.companies().find((company) => company.id === id)?.nombre ?? `Empresa #${id}`;
  });
  readonly scopedSedeName = computed(() => {
    const id = this.authStore.sedeId();
    if (!id) {
      return 'Todas las sedes permitidas';
    }

    return this.sedes().find((sede) => sede.id === id)?.nombre ?? `Sede #${id}`;
  });

  readonly form = this.fb.nonNullable.group({
    empresaId: [this.authStore.empresaId() ?? 0, this.isSuperAdmin() ? [] : [Validators.required, Validators.min(1)]],
    sedeId: [this.authStore.sedeId() ?? 0],
    estado: [''],
    desde: [''],
    hasta: ['']
  });

  constructor() {
    this.initializeScope();
  }

  loadReport(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.reportService
      .getParkingReport(this.formPayload())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => {
          const scopedRows = this.applyClientScope(rows);
          this.rows.set(scopedRows);
          this.toastService.show({
            title: 'Reporte cargado',
            description: `Se encontraron ${scopedRows.length} registros.`,
            type: 'success'
          });
        },
        error: () => {
          this.rows.set([]);
          this.toastService.show({
            title: 'No se pudo consultar',
            description: 'Verifica filtros y disponibilidad del backend.',
            type: 'error'
          });
        }
      });
  }

  downloadExcel(): void {
    this.downloadFile('excel', 'reporte-parqueo.xlsx');
  }

  downloadPdf(): void {
    this.downloadFile('pdf', 'reporte-parqueo.pdf');
  }

  private downloadFile(type: 'excel' | 'pdf', fileName: string): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const request = type === 'excel' ? this.reportService.downloadExcel(this.formPayload()) : this.reportService.downloadPdf(this.formPayload());

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (blob) => {
        this.triggerDownload(blob, fileName);
        this.toastService.show({
          title: 'Descarga iniciada',
          description: `Se genero ${fileName} correctamente.`,
          type: 'success'
        });
      },
      error: () => {
        this.toastService.show({
          title: 'Descarga fallida',
          description: `No fue posible generar ${fileName}.`,
          type: 'error'
        });
      }
    });
  }

  private formPayload(): {
    empresaId?: number;
    sedeId?: number;
    estado?: ReportStatus;
    desde?: string;
    hasta?: string;
  } {
    const raw = this.form.getRawValue();
    const scopedEmpresaId = this.isSuperAdmin() ? raw.empresaId : (this.authStore.empresaId() ?? 0);
    const scopedSedeId = this.isSuperAdmin() ? raw.sedeId : (this.authStore.sedeId() ?? 0);

    return {
      empresaId: scopedEmpresaId > 0 ? scopedEmpresaId : undefined,
      sedeId: scopedSedeId > 0 ? scopedSedeId : undefined,
      estado: (raw.estado || undefined) as ReportStatus | undefined,
      desde: raw.desde || undefined,
      hasta: raw.hasta || undefined
    };
  }

  onCompanyChange(): void {
    if (!this.isSuperAdmin()) {
      return;
    }

    const companyId = this.form.controls.empresaId.value;
    this.form.patchValue({ sedeId: 0 });

    if (!companyId || companyId < 1) {
      this.sedes.set([]);
      return;
    }

    this.companyService.getSedesByCompany(companyId).subscribe({
      next: (sedes) => this.sedes.set(sedes),
      error: () => {
        this.sedes.set([]);
        this.toastService.show({
          title: 'No se pudieron cargar las sedes',
          description: 'Intenta nuevamente seleccionando la empresa.',
          type: 'error'
        });
      }
    });
  }

  private initializeScope(): void {
    this.companyService.getAll().subscribe({
      next: (companies) => {
        this.companies.set(companies);

        if (this.isSuperAdmin()) {
          return;
        }

        const empresaId = this.authStore.empresaId() ?? 0;
        this.form.patchValue({ empresaId });

        if (!empresaId) {
          this.toastService.show({
            title: 'Sesion incompleta',
            description: 'No se encontro empresa anclada para este usuario.',
            type: 'error'
          });
          return;
        }

        this.companyService.getSedesByCompany(empresaId).subscribe({
          next: (sedes) => {
            this.sedes.set(sedes);
            const scopedSedeId = this.authStore.sedeId();
            if (scopedSedeId) {
              this.form.patchValue({ sedeId: scopedSedeId });
            }
          },
          error: () => {
            this.sedes.set([]);
            this.toastService.show({
              title: 'No se pudo cargar el alcance',
              description: 'No fue posible obtener las sedes de tu empresa.',
              type: 'error'
            });
          }
        });
      },
      error: () => {
        this.companies.set([]);
        this.toastService.show({
          title: 'No se pudieron cargar empresas',
          description: 'Verifica conexion con el backend.',
          type: 'error'
        });
      }
    });
  }

  private applyClientScope(rows: ParkingReportItem[]): ParkingReportItem[] {
    if (this.isSuperAdmin()) {
      return rows;
    }

    const scopedEmpresaId = this.authStore.empresaId();
    const scopedSedeId = this.authStore.sedeId();

    return rows.filter((row) => {
      const empresaMatch = !scopedEmpresaId || !row.empresaId || row.empresaId === scopedEmpresaId;
      const sedeMatch = !scopedSedeId || !row.sedeId || row.sedeId === scopedSedeId;
      return empresaMatch && sedeMatch;
    });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
