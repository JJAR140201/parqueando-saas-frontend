import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[92vw] max-w-sm flex-col gap-3">
      <article
        *ngFor="let toast of toastService.toasts()"
        class="pointer-events-auto animate-fade-in-up rounded-xl border bg-white p-4 shadow-card"
        [ngClass]="{
          'border-emerald-400': toast.type === 'success',
          'border-rose-400': toast.type === 'error',
          'border-cyan-400': toast.type === 'info'
        }"
      >
        <div class="flex items-start gap-3">
          <i
            class="mt-0.5 text-sm"
            [ngClass]="{
              'fa-solid fa-circle-check text-emerald-500': toast.type === 'success',
              'fa-solid fa-circle-xmark text-rose-500': toast.type === 'error',
              'fa-solid fa-circle-info text-cyan-500': toast.type === 'info'
            }"
          ></i>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-slate-900">{{ toast.title }}</h4>
            <p class="text-xs text-slate-600">{{ toast.description }}</p>
          </div>
          <button
            type="button"
            class="text-slate-400 transition hover:text-slate-700"
            (click)="toastService.dismiss(toast.id)"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </article>
    </div>
  `
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
