import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ROLE_HOME } from '../../core/constants/role-home.constants';
import { AuthService } from '../../core/services/auth.service';
import { LicenciaService } from '../../core/services/licencia.service';
import { ToastService } from '../../core/services/toast.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-license-activation-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl animate-fade-in-up rounded-3xl bg-white p-6 shadow-card sm:p-10">
        <div class="mb-6">
          <h1 class="text-2xl font-semibold text-slate-900">Activa tu licencia</h1>
          <p class="mt-1 text-sm text-slate-500">
            Ingresa el codigo de licencia que te entrego tu proveedor para crear la cuenta de tu empresa.
          </p>
        </div>

        <form *ngIf="step() === 'code'" class="space-y-5" [formGroup]="codeForm" (ngSubmit)="onValidateCode()">
          <label class="block space-y-1">
            <span class="text-sm font-medium text-slate-700">Codigo de licencia</span>
            <input
              class="input-base uppercase tracking-wider"
              formControlName="codigo"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXX"
            />
          </label>
          <p class="text-sm text-rose-500" *ngIf="codeError()">{{ codeError() }}</p>

          <div class="flex items-center justify-between gap-2">
            <a routerLink="/login" class="text-sm font-medium text-slate-500 hover:text-slate-700">
              <i class="fa-solid fa-arrow-left mr-1"></i>Volver a iniciar sesion
            </a>
            <button class="btn-primary" type="submit" [disabled]="codeForm.invalid || loading()">
              {{ loading() ? 'Validando...' : 'Validar codigo' }}
            </button>
          </div>
        </form>

        <form *ngIf="step() === 'form'" class="space-y-6" [formGroup]="registrationForm" (ngSubmit)="onSubmit()">
          <div class="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <i class="fa-solid fa-circle-check mr-2"></i>Codigo valido. Completa los datos para crear tu cuenta.
          </div>

          <div>
            <h3 class="mb-3 text-sm font-semibold text-slate-700">Datos de tu empresa</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">NIT</span>
                <input class="input-base" formControlName="nit" />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Nombre de la empresa</span>
                <input class="input-base" formControlName="nombre" />
              </label>
            </div>
          </div>

          <div class="space-y-3" formArrayName="sedes">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">Sedes</span>
              <button class="btn-secondary" type="button" (click)="addSede()">Agregar sede</button>
            </div>

            <div
              class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_140px_auto]"
              *ngFor="let sede of sedes.controls; let i = index"
              [formGroupName]="i"
            >
              <input class="input-base" placeholder="Nombre sede" formControlName="nombre" />
              <input class="input-base" type="number" placeholder="Capacidad" formControlName="capacidadTotal" />
              <button
                class="rounded-lg border border-rose-200 px-3 py-2 text-rose-600"
                type="button"
                (click)="removeSede(i)"
                [disabled]="sedes.length <= 1"
              >
                Quitar
              </button>
            </div>
          </div>

          <div formGroupName="admin">
            <h3 class="mb-3 text-sm font-semibold text-slate-700">Usuario administrador</h3>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Nombre completo</span>
                <input class="input-base" formControlName="nombre" />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Username</span>
                <input class="input-base" formControlName="username" />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Password</span>
                <input class="input-base" type="password" formControlName="password" />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium text-slate-700">Confirmar password</span>
                <input class="input-base" type="password" formControlName="confirmPassword" />
              </label>
            </div>
            <p class="mt-1 text-xs text-rose-500" *ngIf="adminGroup.errors?.['passwordMismatch'] && adminGroup.touched">
              Las contrasenas no coinciden.
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <button class="btn-secondary" type="button" (click)="backToCode()">Volver</button>
            <button class="btn-primary" type="submit" [disabled]="registrationForm.invalid || loading()">
              {{ loading() ? 'Creando cuenta...' : 'Crear mi cuenta' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class LicenseActivationPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly licenciaService = inject(LicenciaService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly step = signal<'code' | 'form'>('code');
  readonly codeError = signal<string | null>(null);
  private codigoValidado = '';

  readonly codeForm = this.fb.nonNullable.group({
    codigo: ['', Validators.required]
  });

  readonly registrationForm = this.fb.nonNullable.group({
    nit: ['', Validators.required],
    nombre: ['', Validators.required],
    sedes: this.fb.array([this.buildSedeGroup()]),
    admin: this.fb.nonNullable.group(
      {
        nombre: [''],
        username: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordsMatchValidator }
    )
  });

  get sedes(): FormArray {
    return this.registrationForm.controls.sedes;
  }

  get adminGroup() {
    return this.registrationForm.controls.admin;
  }

  private buildSedeGroup() {
    return this.fb.nonNullable.group({
      nombre: ['', Validators.required],
      capacidadTotal: [1, [Validators.required, Validators.min(1)]]
    });
  }

  addSede(): void {
    this.sedes.push(this.buildSedeGroup());
  }

  removeSede(index: number): void {
    if (this.sedes.length > 1) {
      this.sedes.removeAt(index);
    }
  }

  onValidateCode(): void {
    if (this.codeForm.invalid || this.loading()) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.codeError.set(null);
    this.loading.set(true);
    const codigo = this.codeForm.getRawValue().codigo.trim();

    this.licenciaService
      .validar(codigo)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (result.valida) {
            this.codigoValidado = codigo;
            this.step.set('form');
          } else {
            this.codeError.set(result.mensaje);
          }
        },
        error: () => this.codeError.set('No fue posible validar el codigo. Intenta nuevamente.')
      });
  }

  backToCode(): void {
    this.step.set('code');
  }

  onSubmit(): void {
    if (this.registrationForm.invalid || this.loading()) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const value = this.registrationForm.getRawValue();
    this.loading.set(true);

    this.authService
      .activateLicencia({
        codigo: this.codigoValidado,
        empresa: {
          nit: value.nit,
          nombre: value.nombre,
          sedes: value.sedes.map((sede) => ({ nombre: sede.nombre, capacidadTotal: sede.capacidadTotal }))
        },
        admin: {
          nombre: value.admin.nombre || undefined,
          username: value.admin.username,
          password: value.admin.password
        }
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (session) => {
          this.toastService.show({
            title: 'Cuenta creada',
            description: `Bienvenido ${session.nombre || session.username}`,
            type: 'success'
          });
          void this.router.navigateByUrl(ROLE_HOME[session.role]);
        },
        error: (error) => {
          const description =
            error?.error?.message || 'No fue posible activar la licencia. Verifica los datos e intenta nuevamente.';
          this.toastService.show({ title: 'Error al activar la licencia', description, type: 'error' });
        }
      });
  }
}
