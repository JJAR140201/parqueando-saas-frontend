import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Role } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { AuthStoreService } from '../../core/services/auth-store.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: Role[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen p-3 sm:p-4 lg:p-6">
      <div class="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside class="app-surface p-4 lg:p-5">
          <div class="mb-6 border-b border-slate-200 pb-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Parqueando</p>
            <h1 class="text-lg font-semibold text-slate-900">Operacion</h1>
          </div>

          <nav class="space-y-2">
            <a
              *ngFor="let item of navItems()"
              [routerLink]="item.route"
              routerLinkActive="bg-slate-900 text-white"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <i [class]="item.icon"></i>
              {{ item.label }}
            </a>
          </nav>
        </aside>

        <section class="flex min-h-0 flex-col gap-4">
          <header class="app-surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Usuario actual</p>
              <h2 class="text-lg font-semibold text-slate-900">{{ authStore.username() || 'Invitado' }}</h2>
            </div>

            <div class="flex items-center gap-2">
              <span class="badge-role">{{ authStore.role() }}</span>
              <button type="button" class="btn-secondary" (click)="logout()">
                <i class="fa-solid fa-right-from-bracket mr-2"></i>Cerrar sesion
              </button>
            </div>
          </header>

          <main class="app-surface min-h-0 flex-1 p-4 sm:p-6">
            <router-outlet></router-outlet>
          </main>
        </section>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  readonly authStore = inject(AuthStoreService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly allItems: NavItem[] = [
    {
      label: 'Empresas',
      route: '/app/empresas',
      icon: 'fa-solid fa-building',
      roles: ['SUPER_ADMIN']
    },
    {
      label: 'Usuarios',
      route: '/app/usuarios',
      icon: 'fa-solid fa-users-gear',
      roles: ['SUPER_ADMIN', 'ADMIN']
    },
    {
      label: 'Operaciones',
      route: '/app/operaciones',
      icon: 'fa-solid fa-car-side',
      roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO']
    },
    {
      label: 'Reportes',
      route: '/app/reportes',
      icon: 'fa-solid fa-chart-column',
      roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO']
    }
  ];

  readonly navItems = computed(() => {
    const role = this.authStore.role();
    return this.allItems.filter((item) => item.roles.includes(role));
  });

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
