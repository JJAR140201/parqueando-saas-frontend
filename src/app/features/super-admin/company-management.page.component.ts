import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Company, CompanyPayload } from '../../core/models/company.models';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-company-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Empresas</h3>
          <p class="text-sm text-slate-500">CRUD de empresas y sedes para super administracion.</p>
        </div>
        <button class="btn-primary" type="button" (click)="openCreate()">
          <i class="fa-solid fa-plus mr-2"></i>Nueva empresa
        </button>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          class="input-base"
          placeholder="Buscar por NIT o nombre"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
        />
        <button class="btn-secondary" type="button" (click)="loadCompanies()">Buscar</button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">NIT</th>
              <th class="px-4 py-3 font-semibold">Nombre</th>
              <th class="px-4 py-3 font-semibold">Sedes</th>
              <th class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr *ngFor="let company of companies()">
              <td class="px-4 py-3 font-medium text-slate-800">{{ company.nit }}</td>
              <td class="px-4 py-3 text-slate-700">{{ company.nombre }}</td>
              <td class="px-4 py-3 text-slate-700">{{ getSedesLabel(company) }}</td>
              <td class="px-4 py-3 text-right">
                <button class="btn-secondary mr-2" (click)="openEdit(company)">Editar</button>
                <button class="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600" (click)="remove(company)">
                  Eliminar
                </button>
              </td>
            </tr>
            <tr *ngIf="!companies().length && !loading()">
              <td class="px-4 py-8 text-center text-slate-500" colspan="4">No hay empresas registradas.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" *ngIf="showForm()">
        <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-4 flex items-center justify-between">
            <h4 class="text-lg font-semibold text-slate-900">{{ editingId() ? 'Editar empresa' : 'Nueva empresa' }}</h4>
            <button class="text-slate-400" type="button" (click)="closeForm()">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="save()">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">NIT</span>
                <input class="input-base" formControlName="nit" />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Nombre</span>
                <input class="input-base" formControlName="nombre" />
              </label>
            </div>

            <div class="space-y-3" formArrayName="sedes">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-700">Sedes</span>
                <button class="btn-secondary" type="button" (click)="addSede()">Agregar sede</button>
              </div>

              <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3" *ngFor="let sede of sedes.controls; let i = index" [formGroupName]="i">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
                  <input class="input-base" placeholder="Nombre sede" formControlName="nombre" />
                  <input class="input-base" type="number" placeholder="Capacidad" formControlName="capacidad" />
                  <button class="rounded-lg border border-rose-200 px-3 py-2 text-rose-600" type="button" (click)="removeSede(i)">
                    Quitar
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <button class="btn-secondary" type="button" (click)="closeForm()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="form.invalid || loading()">
                {{ loading() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `
})
export class CompanyManagementPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly companies = signal<Company[]>([]);
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly search = signal('');

  readonly form = this.fb.nonNullable.group({
    nit: ['', Validators.required],
    nombre: ['', Validators.required],
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
      .getAll(this.search())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (companies) => this.companies.set(companies),
        error: () => this.errorToast('No se pudo cargar el listado de empresas.')
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nit: '', nombre: '', sedes: [] });
    this.sedes.clear();
    this.addSede();
    this.showForm.set(true);
  }

  openEdit(company: Company): void {
    this.editingId.set(company.id ?? null);
    this.form.patchValue({ nit: company.nit, nombre: company.nombre });
    this.sedes.clear();
    const companySedes = company.sedes ?? [];

    if (!companySedes.length) {
      this.addSede();
    } else {
      companySedes.forEach((sede) => {
        this.sedes.push(
          this.fb.nonNullable.group({
            nombre: [sede.nombre, Validators.required],
            capacidad: [sede.capacidad, [Validators.required, Validators.min(1)]]
          })
        );
      });
    }

    this.showForm.set(true);
  }

  addSede(): void {
    this.sedes.push(
      this.fb.nonNullable.group({
        nombre: ['', Validators.required],
        capacidad: [1, [Validators.required, Validators.min(1)]]
      })
    );
  }

  removeSede(index: number): void {
    this.sedes.removeAt(index);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as CompanyPayload;
    const request = this.editingId()
      ? this.companyService.update(this.editingId() as number, payload)
      : this.companyService.create(payload);

    this.loading.set(true);
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.toastService.show({
          title: 'Empresa guardada',
          description: 'Los datos de la empresa se actualizaron correctamente.',
          type: 'success'
        });
        this.closeForm();
        this.loadCompanies();
      },
      error: () => this.errorToast('No fue posible guardar la empresa.')
    });
  }

  remove(company: Company): void {
    if (!company.id) {
      return;
    }

    this.loading.set(true);
    this.companyService
      .delete(company.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({
            title: 'Empresa eliminada',
            description: `${company.nombre} fue removida correctamente.`,
            type: 'success'
          });
          this.loadCompanies();
        },
        error: () => this.errorToast('No fue posible eliminar la empresa.')
      });
  }

  private errorToast(description: string): void {
    this.toastService.show({
      title: 'Operacion fallida',
      description,
      type: 'error'
    });
  }

  getSedesLabel(company: Company): string {
    if (!company.sedes?.length) {
      return 'Sin sedes';
    }

    return company.sedes.map((sede) => sede.nombre).join(', ');
  }
}
