import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ROLE_HOME } from '../../core/constants/role-home.constants';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-license-renewal-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-lg animate-fade-in-up rounded-3xl bg-white p-6 shadow-card sm:p-10">
        <div class="mb-6">
          <h1 class="text-2xl font-semibold text-slate-900">Renueva tu licencia</h1>
          <p class="mt-1 text-sm text-slate-500">
            Ingresa el nuevo codigo de licencia y las credenciales del administrador de tu empresa.
            El tiempo se suma a lo que te quede de licencia.
          </p>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <label class="block space-y-1">
            <span class="text-sm font-medium text-slate-700">Codigo de licencia</span>
            <input
              class="input-base uppercase tracking-wider"
              formControlName="codigo"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXX"
            />
          </label>
          <label class="block space-y-1">
            <span class="text-sm font-medium text-slate-700">Usuario administrador</span>
            <input class="input-base" formControlName="username" autocomplete="username" />
          </label>
          <label class="block space-y-1">
            <span class="text-sm font-medium text-slate-700">Password</span>
            <input class="input-base" type="password" formControlName="password" autocomplete="current-password" />
          </label>

          <div class="flex items-center justify-between gap-2 pt-2">
            <a routerLink="/login" class="text-sm font-medium text-slate-500 hover:text-slate-700">
              <i class="fa-solid fa-arrow-left mr-1"></i>Volver a iniciar sesion
            </a>
            <button class="btn-primary" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Renovando...' : 'Renovar licencia' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class LicenseRenewalPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading.set(true);

    this.authService
      .renewLicencia({ codigo: value.codigo.trim(), username: value.username.trim(), password: value.password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (session) => {
          this.toastService.show({
            title: 'Licencia renovada',
            description: `Bienvenido ${session.nombre || session.username}`,
            type: 'success'
          });
          void this.router.navigateByUrl(ROLE_HOME[session.role]);
        },
        error: (error) => {
          const description = error?.error?.message || 'No fue posible renovar la licencia. Verifica los datos.';
          this.toastService.show({ title: 'Error al renovar la licencia', description, type: 'error' });
        }
      });
  }
}
