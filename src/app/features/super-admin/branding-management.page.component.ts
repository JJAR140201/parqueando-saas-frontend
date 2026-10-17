import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Company } from '../../core/models/company.models';
import { BrandingService, DEFAULT_BRAND_COLOR, contrastColor } from '../../core/services/branding.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_SIZE_PX = 256;

@Component({
    selector: 'app-branding-management-page',
    imports: [FormsModule],
    template: `
    <section class="space-y-5">
      <header>
        <h3 class="text-xl font-semibold text-slate-900">Marca de la empresa</h3>
        <p class="text-sm text-slate-500">Color y logo propios de cada parqueadero. Se aplican a todos sus usuarios al iniciar sesion.</p>
      </header>

      <label class="block max-w-md space-y-1">
        <span class="text-sm font-medium text-slate-700">Empresa</span>
        <select class="input-base" [ngModel]="selectedId()" (ngModelChange)="selectCompany($event)">
          <option [ngValue]="null" disabled>Selecciona una empresa</option>
          @for (company of companies(); track company.id) {
            <option [ngValue]="company.id">{{ company.nombre }}</option>
          }
        </select>
      </label>

      @if (selected(); as company) {
        <div class="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div class="space-y-6 rounded-xl border border-slate-200 p-5">
            <div class="space-y-2">
              <span class="text-sm font-medium text-slate-700">Color de marca</span>
              <div class="flex flex-wrap items-center gap-3">
                @for (swatch of swatches; track swatch) {
                  <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition"
                    [class.ring-2]="color().toLowerCase() === swatch"
                    [style.background-color]="swatch"
                    [style.--tw-ring-color]="swatch"
                    [attr.aria-label]="'Color ' + swatch"
                    (click)="color.set(swatch)"
                  >
                    @if (color().toLowerCase() === swatch) {
                      <i class="fa-solid fa-check text-xs" [style.color]="contrast(swatch)"></i>
                    }
                  </button>
                }
                <label class="flex items-center gap-2 text-sm text-slate-600">
                  <input type="color" class="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1" [value]="color()" (input)="onPickColor($event)" />
                  Personalizado
                </label>
                <span class="font-mono text-xs text-slate-500">{{ color() }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <span class="text-sm font-medium text-slate-700">Logo</span>
              <div class="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  @if (logo()) {
                    <img [src]="logo()" alt="Logo" class="h-full w-full object-contain" />
                  } @else {
                    <i class="fa-solid fa-image text-slate-300"></i>
                  }
                </div>
                <label class="btn-secondary cursor-pointer">
                  <i class="fa-solid fa-upload mr-2"></i>{{ logo() ? 'Cambiar' : 'Subir logo' }}
                  <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp" (change)="onPickLogo($event)" />
                </label>
                @if (logo()) {
                  <button type="button" class="btn-secondary" (click)="logo.set(null)">
                    <i class="fa-solid fa-trash mr-2"></i>Quitar
                  </button>
                }
              </div>
              <p class="text-xs text-slate-500">PNG, JPG o WebP. Se reduce automaticamente a {{ logoSize }}px.</p>
            </div>

            <div class="flex gap-2">
              <button type="button" class="btn-primary" [disabled]="saving() || !dirty()" (click)="save()">
                <i class="fa-solid fa-floppy-disk mr-2"></i>{{ saving() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
              <button type="button" class="btn-secondary" (click)="restoreDefault()">Color por defecto</button>
            </div>
          </div>

          <aside class="space-y-2">
            <span class="text-sm font-medium text-slate-700">Vista previa</span>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div class="mb-4 border-b border-slate-200 pb-3">
                @if (logo()) {
                  <img [src]="logo()" alt="Logo" class="mb-2 h-14 w-14 rounded-xl object-contain" />
                }
                <p class="text-xs uppercase tracking-[0.16em] text-slate-500">{{ company.nombre }}</p>
                <p class="text-base font-semibold text-slate-900">Operacion</p>
              </div>
              <div class="space-y-2">
                <div class="rounded-xl px-3 py-2 text-sm font-medium" [style.background-color]="color()" [style.color]="contrast(color())">
                  <i class="fa-solid fa-car-side mr-2"></i>Operaciones
                </div>
                <div class="rounded-xl px-3 py-2 text-sm font-medium text-slate-700">
                  <i class="fa-solid fa-chart-simple mr-2"></i>Resumen del dia
                </div>
              </div>
              <button type="button" class="mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold" [style.background-color]="color()" [style.color]="contrast(color())">
                Registrar entrada
              </button>
            </div>
          </aside>
        </div>
      }
    </section>
    `
})
export class BrandingManagementPageComponent {
  private readonly companyService = inject(CompanyService);
  private readonly brandingService = inject(BrandingService);
  private readonly toast = inject(ToastService);

  readonly swatches = ['#2563eb', '#15803d', '#7c3aed', '#b45309', '#b91c1c', '#1f2937', '#be185d', '#0e7490', '#854d0e'];
  readonly logoSize = LOGO_SIZE_PX;

  readonly companies = signal<Company[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly color = signal(DEFAULT_BRAND_COLOR);
  readonly logo = signal<string | null>(null);
  readonly saving = signal(false);

  readonly selected = computed(() => this.companies().find((company) => company.id === this.selectedId()) ?? null);
  readonly dirty = computed(() => {
    const company = this.selected();
    return !!company && (this.color() !== (company.colorMarca || DEFAULT_BRAND_COLOR) || this.logo() !== (company.logo || null));
  });

  constructor() {
    this.companyService.getAll().subscribe({
      next: (companies) => this.companies.set(companies),
      error: () => this.error('No se pudo cargar el listado de empresas.')
    });
  }

  contrast(color: string): string {
    return contrastColor(color);
  }

  selectCompany(id: number | null): void {
    this.selectedId.set(id);
    const company = this.companies().find((item) => item.id === id);
    this.color.set(company?.colorMarca || DEFAULT_BRAND_COLOR);
    this.logo.set(company?.logo || null);
  }

  onPickColor(event: Event): void {
    this.color.set((event.target as HTMLInputElement).value);
  }

  restoreDefault(): void {
    this.color.set(DEFAULT_BRAND_COLOR);
  }

  onPickLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > MAX_LOGO_BYTES) {
      this.error('El logo debe ser PNG, JPG o WebP de maximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => this.logo.set(this.resize(image));
      image.onerror = () => this.error('No se pudo leer la imagen.');
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    const id = this.selectedId();
    if (id === null) {
      return;
    }

    this.saving.set(true);
    const colorMarca = this.color().toLowerCase() === DEFAULT_BRAND_COLOR ? null : this.color();
    this.brandingService
      .update(id, { colorMarca, logo: this.logo() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (branding) => {
          this.companies.update((list) =>
            list.map((company) =>
              company.id === id ? { ...company, colorMarca: branding.colorMarca ?? undefined, logo: branding.logo ?? undefined } : company
            )
          );
          this.toast.show({ title: 'Marca guardada', description: 'Los usuarios de la empresa la veran al iniciar sesion.', type: 'success' });
        },
        error: () => this.error('No fue posible guardar la marca.')
      });
  }

  /** Reduce el logo a un cuadrado maximo de LOGO_SIZE_PX conservando proporcion y transparencia. */
  private resize(image: HTMLImageElement): string {
    const scale = Math.min(1, LOGO_SIZE_PX / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  private error(description: string): void {
    this.toast.show({ title: 'Operacion fallida', description, type: 'error' });
  }
}
