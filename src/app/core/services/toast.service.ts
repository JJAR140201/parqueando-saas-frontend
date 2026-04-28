import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: Omit<ToastMessage, 'id'>): void {
    const toast: ToastMessage = {
      ...message,
      id: Date.now() + Math.floor(Math.random() * 1000)
    };

    this.toasts.update((state) => [...state, toast]);
    setTimeout(() => this.dismiss(toast.id), 3500);
  }

  dismiss(id: number): void {
    this.toasts.update((state) => state.filter((toast) => toast.id !== id));
  }
}
