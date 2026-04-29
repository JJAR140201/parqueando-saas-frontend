import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Company, Sede } from '../../core/models/company.models';
import { MensualidadItem, MensualidadPayload } from '../../core/models/mensualidad.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CompanyService } from '../../core/services/company.service';
import { MensualidadService } from '../../core/services/mensualidad.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-mensualidades-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Mensualidades</h3>
          <p class="text-sm text-slate-500">Gestiona suscripciones mensuales por placa, empresa y sede.</p>
        </div>
        <span class="badge-role">{{ authStore.role() }}</span>
      </header>

      <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4" [formGroup]="filterForm">
        <label class="space-y-1" *ngIf="isSuperAdmin(); else fixedEmpresaBlock">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
          <select class="input-base" formControlName="empresaId" (change)="onFilterCompanyChange()">
            <option [ngValue]="0">Selecciona una empresa</option>
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
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Placa</span>
          <input class="input-base uppercase" formControlName="placa" placeholder="ABC123" />
        </label>

        <div class="flex items-end gap-2">
          <button class="btn-primary" type="button" (click)="loadRows()" [disabled]="loading() || filterForm.invalid">
            {{ loading() ? 'Consultando...' : 'Listar' }}
          </button>
          <button class="btn-secondary" type="button" (click)="openCreate()">Nueva</button>
        </div>
      </form>

      <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4" [formGroup]="editForm" (ngSubmit)="save()">
        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Placa</span>
          <input class="input-base uppercase" formControlName="placa" placeholder="ABC123" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo Vehiculo</span>
          <select class="input-base" formControlName="tipoVehiculo">
            <option value="CARRO">CARRO</option>
            <option value="MOTO">MOTO</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor Mensual</span>
          <input class="input-base" type="number" min="1" formControlName="valorMensual" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Activa</span>
          <select class="input-base" formControlName="activa">
            <option [ngValue]="true">Si</option>
            <option [ngValue]="false">No</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha Inicio</span>
          <input class="input-base" type="date" formControlName="fechaInicio" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha Fin</span>
          <input class="input-base" type="date" formControlName="fechaFin" />
        </label>

        <label class="space-y-1" *ngIf="isSuperAdmin(); else scopedEditEmpresaBlock">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
          <select class="input-base" formControlName="empresaId" (change)="onEditCompanyChange()">
            <option [ngValue]="0">Selecciona una empresa</option>
            <option *ngFor="let company of companies()" [ngValue]="company.id ?? 0">{{ company.nombre }}</option>
          </select>
        </label>
        <ng-template #scopedEditEmpresaBlock>
          <label class="space-y-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
            <input class="input-base" [value]="scopedCompanyName()" readonly />
          </label>
        </ng-template>

        <label class="space-y-1" *ngIf="isSuperAdmin(); else scopedEditSedeBlock">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
          <select class="input-base" formControlName="sedeId">
            <option [ngValue]="0">Selecciona una sede</option>
            <option *ngFor="let sede of editSedes()" [ngValue]="sede.id ?? 0">{{ sede.nombre }}</option>
          </select>
        </label>
        <ng-template #scopedEditSedeBlock>
          <label class="space-y-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
            <input class="input-base" [value]="scopedSedeName()" readonly />
          </label>
        </ng-template>

        <div class="flex items-end gap-2">
          <button class="btn-primary" type="submit" [disabled]="saving() || editForm.invalid">
            {{ saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Crear') }}
          </button>
          <button class="btn-secondary" type="button" (click)="openCreate()">Limpiar</button>
        </div>
      </form>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Placa</th>
              <th class="px-4 py-3 font-semibold">Tipo</th>
              <th class="px-4 py-3 font-semibold">Valor</th>
              <th class="px-4 py-3 font-semibold">Inicio</th>
              <th class="px-4 py-3 font-semibold">Fin</th>
              <th class="px-4 py-3 font-semibold">Activa</th>
              <th class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr *ngFor="let row of rows()">
              <td class="px-4 py-3 font-medium text-slate-800">{{ row.placa }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.tipoVehiculo }}</td>
              <td class="px-4 py-3 text-slate-700">$ {{ row.valorMensual | number }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.fechaInicio }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.fechaFin }}</td>
              <td class="px-4 py-3 text-slate-700">{{ row.activa ? 'Si' : 'No' }}</td>
              <td class="px-4 py-3 text-right">
                <button class="btn-secondary mr-2" type="button" (click)="openEdit(row)">Editar</button>
                <button class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600" type="button" (click)="cancel(row)">
                  Cancelar
                </button>
              </td>
            </tr>
            <tr *ngIf="!rows().length && !loading()">
              <td class="px-4 py-8 text-center text-slate-500" colspan="7">No hay mensualidades para los filtros seleccionados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class MensualidadesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly mensualidadService = inject(MensualidadService);
  private readonly toastService = inject(ToastService);
  readonly authStore = inject(AuthStoreService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rows = signal<MensualidadItem[]>([]);
  readonly companies = signal<Company[]>([]);
  readonly sedes = signal<Sede[]>([]);
  readonly editSedes = signal<Sede[]>([]);
  readonly editingId = signal<number | null>(null);
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
      return 'Sin sede anclada';
    }

    return this.sedes().find((sede) => sede.id === id)?.nombre ?? `Sede #${id}`;
  });

  readonly filterForm = this.fb.nonNullable.group({
    empresaId: [this.authStore.empresaId() ?? 0, this.isSuperAdmin() ? [] : [Validators.required, Validators.min(1)]],
    sedeId: [this.authStore.sedeId() ?? 0],
    placa: ['']
  });

  readonly editForm = this.fb.nonNullable.group({
    placa: ['', [Validators.required, Validators.minLength(3)]],
    tipoVehiculo: ['CARRO' as 'CARRO' | 'MOTO', Validators.required],
    valorMensual: [250000, [Validators.required, Validators.min(1)]],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    empresaId: [this.authStore.empresaId() ?? 0, [Validators.required, Validators.min(1)]],
    sedeId: [this.authStore.sedeId() ?? 0, [Validators.required, Validators.min(1)]],
    activa: [true]
  });

  constructor() {
    this.initializeScope();
  }

  loadRows(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const payload = this.filterPayload();
    console.log('[MensualidadesPage] Loading with payload:', payload);

    this.loading.set(true);
    this.mensualidadService
      .list(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => {
          console.log('[MensualidadesPage] Received rows:', rows);
          this.rows.set(rows);
          this.toastService.show({
            title: 'Mensualidades cargadas',
            description: `Se encontraron ${rows.length} registros.`,
            type: 'success'
          });
        },
        error: (err) => {
          console.error('[MensualidadesPage] Error loading rows:', err);
          this.rows.set([]);
          this.toastService.show({
            title: 'No se pudo consultar',
            description: `Error: ${err.message || 'Verifica filtros y disponibilidad del backend.'}`,
            type: 'error'
          });
        }
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.editForm.reset({
      placa: '',
      tipoVehiculo: 'CARRO',
      valorMensual: 250000,
      fechaInicio: '',
      fechaFin: '',
      empresaId: this.currentEmpresaId(),
      sedeId: this.currentSedeId(),
      activa: true
    });

    const companyId = this.editForm.controls.empresaId.value;
    if (this.isSuperAdmin() && companyId > 0) {
      this.companyService.getSedesByCompany(companyId).subscribe({
        next: (sedes) => this.editSedes.set(sedes),
        error: () => this.editSedes.set([])
      });
    }
  }

  openEdit(row: MensualidadItem): void {
    this.editingId.set(row.id);
    this.editForm.patchValue({
      placa: row.placa,
      tipoVehiculo: row.tipoVehiculo,
      valorMensual: row.valorMensual,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      empresaId: row.empresaId,
      sedeId: row.sedeId,
      activa: row.activa
    });

    if (this.isSuperAdmin()) {
      this.companyService.getSedesByCompany(row.empresaId).subscribe({
        next: (sedes) => this.editSedes.set(sedes),
        error: () => this.editSedes.set([])
      });
    }
  }

  save(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload = this.toPayload();
    const request = this.editingId()
      ? this.mensualidadService.update(this.editingId() as number, payload)
      : this.mensualidadService.create(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toastService.show({
          title: 'Mensualidad guardada',
          description: this.editingId() ? 'La suscripcion fue actualizada.' : 'La suscripcion fue creada.',
          type: 'success'
        });
        this.openCreate();
        this.loadRows();
      },
      error: () => {
        this.toastService.show({
          title: 'Operacion fallida',
          description: 'No fue posible guardar la mensualidad.',
          type: 'error'
        });
      }
    });
  }

  cancel(row: MensualidadItem): void {
    this.saving.set(true);
    this.mensualidadService
      .cancel(row.id, row.empresaId, row.sedeId)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({
            title: 'Mensualidad cancelada',
            description: `La suscripcion de ${row.placa} fue cancelada.`,
            type: 'success'
          });
          this.loadRows();
        },
        error: () => {
          this.toastService.show({
            title: 'No se pudo cancelar',
            description: 'Intenta nuevamente en unos segundos.',
            type: 'error'
          });
        }
      });
  }

  onFilterCompanyChange(): void {
    if (!this.isSuperAdmin()) {
      return;
    }

    const companyId = this.filterForm.controls.empresaId.value;
    this.filterForm.patchValue({ sedeId: 0 });

    if (!companyId || companyId < 1) {
      this.sedes.set([]);
      return;
    }

    this.companyService.getSedesByCompany(companyId).subscribe({
      next: (sedes) => this.sedes.set(sedes),
      error: () => this.sedes.set([])
    });
  }

  onEditCompanyChange(): void {
    if (!this.isSuperAdmin()) {
      return;
    }

    const companyId = this.editForm.controls.empresaId.value;
    this.editForm.patchValue({ sedeId: 0 });

    if (!companyId || companyId < 1) {
      this.editSedes.set([]);
      return;
    }

    this.companyService.getSedesByCompany(companyId).subscribe({
      next: (sedes) => this.editSedes.set(sedes),
      error: () => this.editSedes.set([])
    });
  }

  private initializeScope(): void {
    this.companyService.getAll().subscribe({
      next: (companies) => {
        this.companies.set(companies);

        if (this.isSuperAdmin()) {
          this.openCreate();
          // SUPER_ADMIN: cargar todas las mensualidades automáticamente
          this.loadRows();
          return;
        }

        const empresaId = this.currentEmpresaId();
        if (!empresaId) {
          this.toastService.show({
            title: 'Sesion incompleta',
            description: 'No se encontro empresa anclada para este usuario.',
            type: 'error'
          });
          return;
        }

        this.filterForm.patchValue({ empresaId });
        this.editForm.patchValue({ empresaId });

        this.companyService.getSedesByCompany(empresaId).subscribe({
          next: (sedes) => {
            this.sedes.set(sedes);
            this.editSedes.set(sedes);

            const sedeId = this.currentSedeId();
            if (sedeId) {
              this.filterForm.patchValue({ sedeId });
              this.editForm.patchValue({ sedeId });
            }

            // ADMIN/OPERARIO: cargar mensualidades después de establecer sede
            this.loadRows();
          },
          error: () => {
            this.sedes.set([]);
            this.editSedes.set([]);
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

  private filterPayload(): { empresaId?: number; sedeId?: number; placa?: string } {
    const raw = this.filterForm.getRawValue();
    const empresaId = this.isSuperAdmin() ? raw.empresaId : this.currentEmpresaId();
    const sedeId = this.isSuperAdmin() ? raw.sedeId : this.currentSedeId();

    console.log('[MensualidadesPage] filterPayload - raw form:', raw);
    console.log('[MensualidadesPage] filterPayload - isSuperAdmin:', this.isSuperAdmin());
    console.log('[MensualidadesPage] filterPayload - empresaId:', empresaId, 'sedeId:', sedeId);

    return {
      empresaId: empresaId > 0 ? empresaId : undefined,
      sedeId: sedeId > 0 ? sedeId : undefined,
      placa: raw.placa?.trim() ? raw.placa.trim().toUpperCase() : undefined
    };
  }

  private toPayload(): MensualidadPayload {
    const raw = this.editForm.getRawValue();
    return {
      placa: raw.placa.toUpperCase(),
      tipoVehiculo: raw.tipoVehiculo,
      valorMensual: raw.valorMensual,
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin,
      empresaId: this.isSuperAdmin() ? raw.empresaId : this.currentEmpresaId(),
      sedeId: this.isSuperAdmin() ? raw.sedeId : this.currentSedeId(),
      activa: raw.activa
    };
  }

  private currentEmpresaId(): number {
    return this.authStore.empresaId() ?? this.filterForm.controls.empresaId.value;
  }

  private currentSedeId(): number {
    return this.authStore.sedeId() ?? this.filterForm.controls.sedeId.value;
  }
}
