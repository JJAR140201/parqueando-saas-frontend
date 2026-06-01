import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap, of } from 'rxjs';
import { SalidaResumen } from '../../core/models/parking.models';
import { ParkingService } from '../../core/services/parking.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-operator-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <article class="rounded-2xl border border-slate-200 p-5">
        <h3 class="text-lg font-semibold text-slate-900">Registro de Entrada</h3>
        <p class="mb-4 text-sm text-slate-500">Registra la llegada de un vehiculo al parqueadero.</p>

        <form class="space-y-3" [formGroup]="entradaForm" (ngSubmit)="registrarEntrada()">
          <label class="space-y-1">
            <span class="text-sm font-medium text-slate-700">Placa</span>
            <input class="input-base uppercase" formControlName="placa" placeholder="ABC123" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-slate-700">Tipo de vehiculo</span>
            <select class="input-base" formControlName="tipoVehiculo">
              <option value="CARRO">CARRO</option>
              <option value="MOTO">MOTO</option>
            </select>
          </label>

          <button class="btn-primary w-full" [disabled]="loadingEntrada() || entradaForm.invalid" type="submit">
            {{ loadingEntrada() ? 'Registrando...' : 'Registrar entrada' }}
          </button>
        </form>
      </article>

      <article class="rounded-2xl border border-slate-200 p-5">
        <h3 class="text-lg font-semibold text-slate-900">Registro de Salida</h3>
        <p class="mb-4 text-sm text-slate-500">Consulta la placa, valida cobro y confirma salida.</p>

        <form class="space-y-3" [formGroup]="salidaForm" (ngSubmit)="consultarCobro()">
          <label class="space-y-1">
            <span class="text-sm font-medium text-slate-700">Placa</span>
            <input class="input-base uppercase" formControlName="placa" placeholder="ABC123" />
          </label>

          <button class="btn-secondary w-full" type="submit" [disabled]="loadingSalida() || salidaForm.invalid">
            {{ loadingSalida() ? 'Consultando...' : 'Calcular cobro' }}
          </button>
        </form>

        <div class="mt-4 rounded-xl bg-slate-50 p-4" *ngIf="resumenSalida() as resumen">
          <h4 class="font-semibold text-slate-900">Resumen de cobro</h4>
          <dl class="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
            <dt>Placa</dt>
            <dd class="text-right font-semibold">{{ resumen.placa }}</dd>
            <dt>Tipo</dt>
            <dd class="text-right font-semibold">{{ resumen.tipoVehiculo }}</dd>
            <dt *ngIf="resumen.minutosEstadia !== undefined">Minutos</dt>
            <dd *ngIf="resumen.minutosEstadia !== undefined" class="text-right font-semibold">{{ resumen.minutosEstadia }}</dd>
            <dt>Horas</dt>
            <dd class="text-right font-semibold">{{ resumen.horas | number:'1.1-2' }}</dd>
            <dt>Total</dt>
            <dd class="text-right text-base font-bold text-emerald-600">$ {{ resumen.totalPagado | number }}</dd>
          </dl>

          <div class="space-y-3 pt-3" *ngIf="!salidaConfirmada()" [formGroup]="smsForm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Opciones antes de confirmar</p>
            <button class="btn-secondary w-full" type="button" (click)="descargarTicket()" [disabled]="loadingTicket()">
              {{ loadingTicket() ? 'Generando ticket...' : 'Imprimir ticket' }}
            </button>
            <div class="flex items-center gap-2">
              <span class="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700">+57</span>
              <input class="input-base flex-1" formControlName="numeroTelefono" placeholder="3001234567 (SMS opcional)" inputmode="numeric" />
            </div>
          </div>

          <div class="mt-3 space-y-3">
            <button class="btn-primary w-full" type="button" (click)="confirmarSalida()" [disabled]="loadingSalida() || salidaConfirmada()">
              {{ loadingSalida() ? 'Confirmando salida...' : salidaConfirmada() ? 'Salida confirmada' : 'Confirmar salida' }}
            </button>
            <button *ngIf="salidaConfirmada()" class="btn-secondary w-full" type="button" (click)="nuevaSalida()">
              Nueva salida
            </button>
          </div>
        </div>
      </article>
    </section>
  `
})
export class OperatorDashboardPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly parkingService = inject(ParkingService);
  private readonly toastService = inject(ToastService);

  readonly loadingEntrada = signal(false);
  readonly loadingSalida = signal(false);
  readonly loadingTicket = signal(false);
  readonly resumenSalida = signal<SalidaResumen | null>(null);
  readonly salidaConfirmada = signal(false);

  readonly entradaForm = this.fb.nonNullable.group({
    placa: ['', Validators.required],
    tipoVehiculo: ['CARRO' as 'CARRO' | 'MOTO', Validators.required]
  });

  readonly salidaForm = this.fb.nonNullable.group({
    placa: ['', Validators.required]
  });

  readonly smsForm = this.fb.nonNullable.group({
    numeroTelefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
  });

  registrarEntrada(): void {
    if (this.entradaForm.invalid) {
      return;
    }

    this.loadingEntrada.set(true);
    const payload = {
      ...this.entradaForm.getRawValue(),
      placa: this.entradaForm.controls.placa.value.toUpperCase()
    };

    this.parkingService
      .registrarEntrada(payload)
      .pipe(finalize(() => this.loadingEntrada.set(false)))
      .subscribe({
        next: () => {
          this.toastService.show({
            title: 'Entrada registrada',
            description: `Vehiculo ${payload.placa} ingresado correctamente.`,
            type: 'success'
          });
          this.entradaForm.reset({ placa: '', tipoVehiculo: 'CARRO' });
        },
        error: () => {
          this.toastService.show({
            title: 'No se pudo registrar',
            description: 'Verifica la placa e intenta nuevamente.',
            type: 'error'
          });
        }
      });
  }

  consultarCobro(): void {
    if (this.salidaForm.invalid) {
      return;
    }

    this.loadingSalida.set(true);
    const placa = this.salidaForm.controls.placa.value.toUpperCase();

    this.parkingService
      .previsualizarSalida(placa)
      .pipe(finalize(() => this.loadingSalida.set(false)))
      .subscribe({
        next: (resumen) => this.resumenSalida.set(resumen),
        error: () => {
          this.resumenSalida.set(null);
          this.toastService.show({
            title: 'No se pudo calcular cobro',
            description: 'No se encontro una entrada activa para esta placa.',
            type: 'error'
          });
        }
      });
  }

  confirmarSalida(): void {
    const resumen = this.resumenSalida();
    if (!resumen) {
      return;
    }

    const numeroRaw = this.smsForm.controls.numeroTelefono.value?.trim() ?? '';
    const numeroDigitos = numeroRaw.replace(/\D/g, '');
    const enviarSms = numeroDigitos.length === 10;
    const numeroCompleto = `+57${numeroDigitos}`;

    this.loadingSalida.set(true);

    const sms$ = enviarSms
      ? this.parkingService.enviarReciboPorSms(resumen.placa, numeroCompleto)
      : of(null);

    sms$.pipe(
      switchMap(() => this.parkingService.registrarSalida({ placa: resumen.placa })),
      finalize(() => this.loadingSalida.set(false))
    ).subscribe({
      next: () => {
        this.toastService.show({
          title: 'Salida registrada',
          description: `Vehiculo ${resumen.placa} retirado. Total: $${resumen.totalPagado}`,
          type: 'success'
        });
        if (enviarSms) {
          this.toastService.show({
            title: 'SMS enviado',
            description: 'El comprobante se envió correctamente.',
            type: 'success'
          });
        }
        this.salidaConfirmada.set(true);
        this.smsForm.reset({ numeroTelefono: '' });
      },
      error: () => {
        this.toastService.show({
          title: 'No se pudo registrar salida',
          description: 'Intenta nuevamente en unos segundos.',
          type: 'error'
        });
      }
    });
  }

  nuevaSalida(): void {
    this.resumenSalida.set(null);
    this.salidaConfirmada.set(false);
    this.salidaForm.reset({ placa: '' });
    this.salidaForm.controls.placa.enable();
    this.smsForm.reset({ numeroTelefono: '' });
  }

  descargarTicket(): void {
    const resumen = this.resumenSalida();
    if (!resumen) {
      return;
    }

    this.loadingTicket.set(true);
    this.parkingService
      .generarTicketPdf(resumen.placa)
      .pipe(finalize(() => this.loadingTicket.set(false)))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ticket-${resumen.placa}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.toastService.show({
            title: 'No se pudo generar ticket',
            description: 'Intenta nuevamente en unos segundos.',
            type: 'error'
          });
        }
      });
  }

}
