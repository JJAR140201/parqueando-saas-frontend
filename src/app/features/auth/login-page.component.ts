import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Role } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

const roleHome: Record<Role, string> = {
  SUPER_ADMIN: '/app/empresas',
  ADMIN: '/app/usuarios',
  OPERARIO: '/app/operaciones'
};

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto grid min-h-[88vh] max-w-5xl animate-fade-in-up grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-card lg:grid-cols-[1.2fr_1fr]">
        <div class="hidden bg-slate-900 p-10 text-white lg:block">
          <span class="mb-6 inline-flex rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
            Parqueando
          </span>
          <h1 class="text-3xl font-semibold leading-tight">Control total de operación, facturación y seguridad.</h1>
          <p class="mt-4 text-sm text-slate-300">
            Plataforma multisedes para gestionar entradas, salidas, usuarios operativos y administración de empresas.
          </p>
          <div class="mt-8 space-y-3 text-sm text-slate-200">
            <p><i class="fa-solid fa-check mr-2 text-emerald-400"></i>Flujo optimizado por rol</p>
            <p><i class="fa-solid fa-check mr-2 text-emerald-400"></i>Registro de cobros en tiempo real</p>
            <p><i class="fa-solid fa-check mr-2 text-emerald-400"></i>Diseño responsivo para operación en campo</p>
          </div>
        </div>

        <div class="flex items-center p-6 sm:p-10">
          <form class="w-full space-y-5" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div>
              <h2 class="text-2xl font-semibold text-slate-900">Iniciar Sesion</h2>
              <p class="text-sm text-slate-500">Accede con tus credenciales para continuar.</p>
            </div>

            <label class="block space-y-1">
              <span class="text-sm font-medium text-slate-700">Username</span>
              <input class="input-base" formControlName="username" placeholder="ej: admin.parqueadero" />
              <small class="text-xs text-rose-500" *ngIf="form.controls.username.invalid && form.controls.username.touched">
                El username es obligatorio.
              </small>
            </label>

            <label class="block space-y-1">
              <span class="text-sm font-medium text-slate-700">Password</span>
              <div class="relative">
                <input
                  class="input-base pr-10"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="********"
                />
                <button
                  class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-700"
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ocultar password' : 'Mostrar password'"
                >
                  <i class="fa-solid" [class.fa-eye]="!showPassword()" [class.fa-eye-slash]="showPassword()"></i>
                </button>
              </div>
              <small class="text-xs text-rose-500" *ngIf="form.controls.password.invalid && form.controls.password.touched">
                El password es obligatorio.
              </small>
            </label>

            <button class="btn-primary w-full" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Validando...' : 'Entrar' }}
            </button>
          </form>
        </div>
      </div>
    </section>
  `
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (session) => {
          this.toastService.show({
            title: 'Sesion iniciada',
            description: `Bienvenido ${session.nombre || session.username}`,
            type: 'success'
          });
          void this.router.navigateByUrl(roleHome[session.role]);
        },
        error: () => {
          this.toastService.show({
            title: 'Error de acceso',
            description: 'Verifica tus credenciales e intenta nuevamente.',
            type: 'error'
          });
        }
      });
  }
}
