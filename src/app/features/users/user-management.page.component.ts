import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { Role } from '../../core/models/auth.models';
import { Company } from '../../core/models/company.models';
import { AppUser } from '../../core/models/user.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="space-y-5">
      <header>
        <h3 class="text-xl font-semibold text-slate-900">Gestion de Usuarios</h3>
        <p class="text-sm text-slate-500">
          {{ isSuperAdmin() ? 'SUPER_ADMIN: visualiza todos los usuarios del sistema.' : 'ADMIN: visualiza operarios de su empresa y sedes.' }}
        </p>
      </header>

      <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3" [formGroup]="form" (ngSubmit)="save()">
        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input class="input-base" formControlName="nombre" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</span>
          <input class="input-base" formControlName="username" />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
          <div class="relative">
            <input
              class="input-base pr-10"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
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
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</span>
          <select class="input-base" formControlName="role" [disabled]="isAdmin()">
            <option *ngFor="let role of roles" [value]="role">{{ role }}</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</span>
          <select class="input-base" formControlName="empresaId" (change)="onCompanyChange()" [disabled]="isAdmin()">
            <option value="">Selecciona</option>
            <option *ngFor="let company of companies()" [value]="company.id">{{ company.nombre }}</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Sede</span>
          <select class="input-base" formControlName="sedeId">
            <option value="">Selecciona</option>
            <option *ngFor="let sede of sedes()" [value]="sede.id">{{ sede.nombre }}</option>
          </select>
        </label>

        <div class="flex items-end">
          <button class="btn-primary w-full" type="submit" [disabled]="form.invalid || loading()">Crear usuario</button>
        </div>
      </form>

      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Nombre</th>
              <th class="px-4 py-3 font-semibold">Usuario</th>
              <th class="px-4 py-3 font-semibold">Rol</th>
              <th class="px-4 py-3 font-semibold">Empresa</th>
              <th class="px-4 py-3 font-semibold">Sede</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr *ngFor="let user of users()">
              <td class="px-4 py-3">{{ user.nombre || '-' }}</td>
              <td class="px-4 py-3">{{ user.username }}</td>
              <td class="px-4 py-3"><span class="badge-role">{{ user.role }}</span></td>
              <td class="px-4 py-3">{{ getCompanyName(user.empresaId) }}</td>
              <td class="px-4 py-3">{{ getSedeName(user.sedeId) }}</td>
            </tr>
            <tr *ngIf="!users().length && !loading()">
              <td class="px-4 py-8 text-center text-slate-500" colspan="5">No hay usuarios para el alcance actual.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class UserManagementPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);
  private readonly authStore = inject(AuthStoreService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly companies = signal<Company[]>([]);
  readonly sedes = signal<Array<{ id?: number; nombre: string }>>([]);
  readonly users = signal<AppUser[]>([]);
  readonly sedeNames = signal<Record<number, string>>({});

  readonly isSuperAdmin = computed(() => this.authStore.role() === 'SUPER_ADMIN');
  readonly isAdmin = computed(() => this.authStore.role() === 'ADMIN');

  readonly roles: Role[] = this.isSuperAdmin() ? ['ADMIN', 'OPERARIO'] : ['OPERARIO'];

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['OPERARIO' as Role, Validators.required],
    empresaId: [0, [Validators.required, Validators.min(1)]],
    sedeId: [0, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.initializeScope();
  }

  private initializeScope(): void {
    this.loadCompanies();

    if (this.isAdmin()) {
      const empresaId = this.authStore.empresaId() ?? 0;
      if (empresaId > 0) {
        this.form.patchValue({
          role: 'OPERARIO',
          empresaId
        });
      }
    }
  }

  loadCompanies(): void {
    this.companyService.getAll().subscribe({
      next: (companies) => {
        this.companies.set(companies);

        if (this.isSuperAdmin()) {
          this.loadAllUsersForSuperAdmin(companies);
          return;
        }

        if (this.isAdmin()) {
          const empresaId = this.authStore.empresaId() ?? 0;
          if (empresaId > 0) {
            this.loadSedesAndUsersForAdmin(empresaId);
          }
        }
      },
      error: () => this.errorToast('No se pudo cargar el listado de empresas.')
    });
  }

  private loadAllUsersForSuperAdmin(companies: Company[]): void {
    const companyIds = companies.map((company) => company.id).filter((id): id is number => Boolean(id));
    if (!companyIds.length) {
      this.users.set([]);
      return;
    }

    const usersRequests = companyIds.map((companyId) =>
      this.userService.getUsersByCompany(companyId).pipe(catchError(() => of([] as AppUser[])))
    );

    const sedesRequests = companyIds.map((companyId) =>
      this.companyService.getSedesByCompany(companyId).pipe(catchError(() => of([])))
    );

    forkJoin({ usersByCompany: forkJoin(usersRequests), sedesByCompany: forkJoin(sedesRequests) }).subscribe({
      next: ({ usersByCompany, sedesByCompany }) => {
        const allUsers = usersByCompany.flat();
        const uniqueByKey = new Map<string, AppUser>();
        allUsers.forEach((user) => {
          const key = user.id ? `id-${user.id}` : `${user.username}-${user.empresaId}-${user.sedeId}`;
          uniqueByKey.set(key, user);
        });
        this.users.set(Array.from(uniqueByKey.values()));

        const nextSedeNames: Record<number, string> = {};
        sedesByCompany.flat().forEach((sede) => {
          if (sede.id) {
            nextSedeNames[sede.id] = sede.nombre;
          }
        });
        this.sedeNames.set(nextSedeNames);
      },
      error: () => this.errorToast('No se pudo cargar el listado global de usuarios.')
    });
  }

  private loadSedesAndUsersForAdmin(companyId: number): void {
    this.form.patchValue({ empresaId: companyId });
    this.companyService.getSedesByCompany(companyId).subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        const nextSedeNames: Record<number, string> = {};
        sedes.forEach((sede) => {
          if (sede.id) {
            nextSedeNames[sede.id] = sede.nombre;
          }
        });
        this.sedeNames.set(nextSedeNames);
      },
      error: () => this.errorToast('No se pudieron cargar las sedes de la empresa.')
    });

    this.userService.getUsersByCompany(companyId).pipe(
      map((users) => users.filter((user) => user.role === 'OPERARIO'))
    ).subscribe({
      next: (users) => this.users.set(users),
      error: () => this.errorToast('No se pudo cargar el listado de usuarios.')
    });
  }

  onCompanyChange(): void {
    if (this.isAdmin()) {
      return;
    }

    const companyId = Number(this.form.controls.empresaId.value);
    if (!companyId) {
      this.sedes.set([]);
      this.form.patchValue({ sedeId: 0 });
      return;
    }

    this.form.patchValue({ sedeId: 0 });
    this.companyService.getSedesByCompany(companyId).subscribe({
      next: (sedes) => {
        this.sedes.set(sedes);
        const nextSedeNames: Record<number, string> = {};
        sedes.forEach((sede) => {
          if (sede.id) {
            nextSedeNames[sede.id] = sede.nombre;
          }
        });
        this.sedeNames.set(nextSedeNames);
      },
      error: () => this.errorToast('No se pudieron cargar las sedes de la empresa.')
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.userService
      .createUser(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({
            title: 'Usuario creado',
            description: 'El usuario fue registrado correctamente.',
            type: 'success'
          });

          if (this.isSuperAdmin()) {
            this.loadAllUsersForSuperAdmin(this.companies());
          } else {
            const companyId = this.authStore.empresaId() ?? 0;
            if (companyId > 0) {
              this.loadSedesAndUsersForAdmin(companyId);
            }
          }

          this.form.patchValue({ nombre: '', username: '', password: '', role: 'OPERARIO' });
        },
        error: () => this.errorToast('No fue posible crear el usuario.')
      });
  }

  private errorToast(description: string): void {
    this.toastService.show({
      title: 'Operacion fallida',
      description,
      type: 'error'
    });
  }

  getCompanyName(companyId: number): string {
    return this.companies().find((company) => company.id === companyId)?.nombre ?? `Empresa #${companyId}`;
  }

  getSedeName(sedeId: number): string {
    return this.sedeNames()[sedeId] ?? this.sedes().find((sede) => sede.id === sedeId)?.nombre ?? `Sede #${sedeId}`;
  }
}
