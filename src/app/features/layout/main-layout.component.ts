
import { Component, computed, inject, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Role } from '../../core/models/auth.models';
import { BrandingService } from '../../core/services/branding.service';
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
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <div class="min-h-screen p-3 sm:p-4 lg:p-6">
      <div class="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <aside class="app-surface p-4 lg:p-5">
          <div class="mb-6 border-b border-slate-200 pb-4">
            @if (branding.logo(); as logo) {
              <img [src]="logo" alt="Logo" class="mb-3 h-14 w-14 rounded-xl object-contain" />
            }
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500">{{ authStore.empresaNombre() || 'Parqueando' }}</p>
            <h1 class="text-lg font-semibold text-slate-900">Operacion</h1>
          </div>
    
          <nav class="space-y-2">
            @for (item of navItems(); track item) {
              <a
                [routerLink]="item.route"
                routerLinkActive="nav-active"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                <i [class]="item.icon"></i>
                {{ item.label }}
              </a>
            }
          </nav>
        </aside>
    
        <section class="flex min-h-0 flex-col gap-4">
          <header class="app-surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Usuario actual</p>
              <h2 class="text-lg font-semibold text-slate-900">{{ authStore.displayName() || 'Invitado' }}</h2>
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
  readonly branding = inject(BrandingService);
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
      label: 'Tarifas',
      route: '/app/tarifas',
      icon: 'fa-solid fa-tags',
      roles: ['SUPER_ADMIN']
    },
    {
      label: 'Marca',
      route: '/app/marca',
      icon: 'fa-solid fa-palette',
      roles: ['SUPER_ADMIN']
    },
    {
      label: 'Licencias',
      route: '/app/licencias',
      icon: 'fa-solid fa-key',
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
      label: 'Resumen del dia',
      route: '/app/resumen-dia',
      icon: 'fa-solid fa-chart-simple',
      roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO']
    },
    {
      label: 'Mensualidades',
      route: '/app/mensualidades',
      icon: 'fa-solid fa-calendar-check',
      roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO']
    },
    {
      label: 'WhatsApp',
      route: '/app/whatsapp',
      icon: 'fa-brands fa-whatsapp',
      roles: ['SUPER_ADMIN', 'ADMIN']
    },
    {
      label: 'Reportes',
      route: '/app/reportes',
      icon: 'fa-solid fa-chart-column',
      roles: ['SUPER_ADMIN', 'ADMIN', 'OPERARIO']
    }
  ];

  constructor() {
    // SUPER_ADMIN no pertenece a una empresa: usa la marca por defecto.
    effect(() => {
      if (this.authStore.isAuthenticated() && this.authStore.empresaId() !== null) {
        this.branding.loadMine();
      }
    });
  }

  readonly navItems = computed(() => {
    const role = this.authStore.role();
    return this.allItems.filter((item) => item.roles.includes(role));
  });

  logout(): void {
    this.authService.logout();
    this.branding.reset();
    void this.router.navigateByUrl('/login');
  }
}
