import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { Company } from '../../core/models/company.models';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-company-tariffs-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Tarifas por sede</h3>
          <p class="text-sm text-slate-500">Configura y actualiza tarifas de carro y moto por empresa y sede.</p>
        </div>
        <a class="btn-secondary" routerLink="/app/empresas">
          <i class="fa-solid fa-building mr-2"></i>Volver a empresas
        </a>
      </header>

      <form class="rounded-xl border border-slate-200 p-4" [formGroup]="filterForm">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label class="space-y-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
            <select class="input-base" formControlName="empresaId" (change)="onCompanyChange()">
              <option [ngValue]="0">Selecciona una empresa</option>
              <option *ngFor="let company of companies()" [ngValue]="company.id ?? 0">{{ company.nombre }}</option>
            </select>
          </label>
          <div class="flex items-end gap-2">
            <button class="btn-primary" type="button" (click)="loadTarifas()" [disabled]="loading() || filterForm.invalid || !selectedCompany()">
              {{ loading() ? 'Cargando...' : 'Cargar tarifas' }}
            </button>
          </div>
        </div>
      </form>

      <form class="space-y-4" [formGroup]="form" (ngSubmit)="save()" *ngIf="selectedCompany() as company">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-lg font-semibold text-slate-900">{{ company.nombre }}</h4>
            <p class="text-sm text-slate-500">Edita las tarifas activas para cada sede.</p>
          </div>
          <button class="btn-primary" type="submit" [disabled]="saving() || form.invalid || !sedes.length">
            {{ saving() ? 'Guardando...' : 'Guardar tarifas' }}
          </button>
        </div>

        <div class="space-y-3" formArrayName="sedes">
          <div class="rounded-xl border border-slate-200 p-4" *ngFor="let sede of sedes.controls; let i = index" [formGroupName]="i">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h5 class="font-semibold text-slate-900">{{ sedeName(i) }}</h5>
                <p class="text-xs text-slate-500">Capacidad: {{ sedeCapacity(i) }}</p>
              </div>
              <span class="badge-role">Sede</span>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tarifa carro</span>
                <input class="input-base" type="number" min="0" formControlName="valorFraccionCarro" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutos carro</span>
                <input class="input-base" type="number" min="0" formControlName="minutosFraccionCarro" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tarifa moto</span>
                <input class="input-base" type="number" min="0" formControlName="valorFraccionMoto" />
              </label>
              <label class="space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutos moto</span>
                <input class="input-base" type="number" min="0" formControlName="minutosFraccionMoto" />
              </label>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500" *ngIf="!sedes.length && !loading()">
          La empresa seleccionada no tiene sedes registradas.
        </div>
      </form>
    </section>
  `
})
export class CompanyTariffsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly companies = signal<Company[]>([]);
  readonly selectedCompany = signal<Company | null>(null);

  readonly filterForm = this.fb.nonNullable.group({
    empresaId: [0, [Validators.required, Validators.min(1)]]
  });

  readonly form = this.fb.nonNullable.group({
    sedes: this.fb.array([])
  });

  get sedes(): FormArray {
    return this.form.controls.sedes;
  }

  constructor() {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.companyService
      .getAll()
      .pipe(
        switchMap((companies) => {
          this.companies.set(companies);
          const requestedId = Number(this.route.snapshot.queryParamMap.get('empresaId') ?? 0);
          const initialId = requestedId || companies[0]?.id || 0;

          if (initialId > 0) {
            this.filterForm.patchValue({ empresaId: initialId });
            return this.companyService.getSedesByCompany(initialId).pipe(
              switchMap((sedes) => {
                const selected = companies.find((company) => company.id === initialId) ?? null;
                this.selectedCompany.set(selected ? { ...selected, sedes } : null);
                this.fillSedes(sedes);
                return of(companies);
              })
            );
          }

          this.selectedCompany.set(null);
          this.fillSedes([]);
          return of(companies);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        error: () => {
          this.companies.set([]);
          this.toastService.show({
            title: 'No se pudieron cargar empresas',
            description: 'Verifica la conexion con el backend.',
            type: 'error'
          });
        }
      });
  }

  onCompanyChange(): void {
    this.loadTarifas();
  }

  loadTarifas(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const companyId = this.filterForm.controls.empresaId.value;
    const selected = this.companies().find((company) => company.id === companyId) ?? null;

    this.loading.set(true);
    this.companyService
      .getSedesByCompany(companyId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (sedes) => {
          this.selectedCompany.set(selected ? { ...selected, sedes } : null);
          this.fillSedes(sedes);
        },
        error: () => {
          this.selectedCompany.set(selected);
          this.fillSedes([]);
          this.toastService.show({
            title: 'No se pudieron cargar tarifas',
            description: 'No fue posible consultar las sedes de la empresa.',
            type: 'error'
          });
        }
      });
  }

  save(): void {
    const company = this.selectedCompany();
    if (!company?.id || this.form.invalid || !this.sedes.length) {
      this.form.markAllAsTouched();
      return;
    }

    const requests = this.sedes.controls
      .map((group) => {
        const raw = group.getRawValue() as Record<string, number | string>;
        const sedeId = Number(raw['id'] ?? 0);
        if (!sedeId) {
          return null;
        }

        return this.companyService.configureTarifas(company.id as number, sedeId, {
          valorFraccionCarro: Number(raw['valorFraccionCarro'] ?? 0),
          minutosFraccionCarro: Number(raw['minutosFraccionCarro'] ?? 0),
          valorFraccionMoto: Number(raw['valorFraccionMoto'] ?? 0),
          minutosFraccionMoto: Number(raw['minutosFraccionMoto'] ?? 0)
        });
      })
      .filter((request) => request !== null);

    if (!requests.length) {
      return;
    }

    this.saving.set(true);
    forkJoin(requests)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({
            title: 'Tarifas actualizadas',
            description: 'Las tarifas de la empresa fueron guardadas correctamente.',
            type: 'success'
          });
          this.loadTarifas();
        },
        error: () => {
          this.toastService.show({
            title: 'No se pudieron guardar tarifas',
            description: 'Intenta nuevamente en unos segundos.',
            type: 'error'
          });
        }
      });
  }

  sedeName(index: number): string {
    return String(this.sedes.at(index).get('nombre')?.value ?? 'Sede');
  }

  sedeCapacity(index: number): number {
    return Number(this.sedes.at(index).get('capacidad')?.value ?? 0);
  }

  private fillSedes(sedes: Company['sedes'] = []): void {
    this.sedes.clear();
    (sedes ?? []).forEach((sede) => {
      this.sedes.push(
        this.fb.nonNullable.group({
          id: [sede.id ?? 0],
          nombre: [sede.nombre],
          capacidad: [sede.capacidad],
          valorFraccionCarro: [sede.valorFraccionCarro ?? 0, [Validators.required, Validators.min(0)]],
          minutosFraccionCarro: [sede.minutosFraccionCarro ?? 0, [Validators.required, Validators.min(0)]],
          valorFraccionMoto: [sede.valorFraccionMoto ?? 0, [Validators.required, Validators.min(0)]],
          minutosFraccionMoto: [sede.minutosFraccionMoto ?? 0, [Validators.required, Validators.min(0)]]
        })
      );
    });
  }
}