import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ResumenDia } from '../../core/models/report.models';
import { ReportService } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-resumen-dia-page',
    imports: [CommonModule],
    template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">Resumen del dia</h3>
          <p class="text-sm text-slate-500">{{ fechaLabel() }}</p>
        </div>
        <button class="btn-secondary" type="button" (click)="cargar()" [disabled]="loading()">
          <i class="fa-solid fa-arrows-rotate mr-2"></i>{{ loading() ? 'Actualizando...' : 'Actualizar' }}
        </button>
      </header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3" *ngIf="resumen() as r">
        <article class="rounded-2xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-cyan-700">Dentro ahora</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ r.dentro.total }}</p>
          <dl class="mt-4 space-y-1 text-sm text-slate-600">
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-car mr-2 text-slate-400"></i>Carros</dt>
              <dd class="font-semibold text-slate-800">{{ r.dentro.carros }}</dd>
            </div>
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-motorcycle mr-2 text-slate-400"></i>Motos</dt>
              <dd class="font-semibold text-slate-800">{{ r.dentro.motos }}</dd>
            </div>
          </dl>
        </article>

        <article class="rounded-2xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Entradas hoy</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ r.entradasHoy.total }}</p>
          <dl class="mt-4 space-y-1 text-sm text-slate-600">
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-car mr-2 text-slate-400"></i>Carros</dt>
              <dd class="font-semibold text-slate-800">{{ r.entradasHoy.carros }}</dd>
            </div>
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-motorcycle mr-2 text-slate-400"></i>Motos</dt>
              <dd class="font-semibold text-slate-800">{{ r.entradasHoy.motos }}</dd>
            </div>
          </dl>
        </article>

        <article class="rounded-2xl border border-slate-200 p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">Salidas hoy</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ r.salidasHoy.total }}</p>
          <dl class="mt-4 space-y-1 text-sm text-slate-600">
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-car mr-2 text-slate-400"></i>Carros</dt>
              <dd class="font-semibold text-slate-800">{{ r.salidasHoy.carros }}</dd>
            </div>
            <div class="flex justify-between">
              <dt><i class="fa-solid fa-motorcycle mr-2 text-slate-400"></i>Motos</dt>
              <dd class="font-semibold text-slate-800">{{ r.salidasHoy.motos }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <p class="text-sm text-slate-500" *ngIf="!resumen() && !loading()">No hay datos disponibles.</p>
    </section>
  `
})
export class ResumenDiaPageComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly resumen = signal<ResumenDia | null>(null);

  readonly fechaLabel = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.reportService
      .getResumenDia()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (resumen) => {
          this.resumen.set(resumen);
          this.fechaLabel.set(this.formatFecha(resumen.fecha));
        },
        error: () => {
          this.toastService.show({
            title: 'No se pudo cargar el resumen',
            description: 'Intenta nuevamente en unos segundos.',
            type: 'error'
          });
        }
      });
  }

  private formatFecha(fecha: string): string {
    if (!fecha) {
      return '';
    }
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  }
}
