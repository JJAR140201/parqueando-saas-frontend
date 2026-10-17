import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Company } from '../../core/models/company.models';
import {
  Cliente,
  ClientePatch,
  WhatsappCuenta,
  WhatsappLatencia,
  WhatsappMensaje,
  WhatsappMessageStatus,
  WhatsappMessageType,
  WhatsappMetricas
} from '../../core/models/whatsapp.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { WHATSAPP_PAGE_SIZE, WhatsappService } from '../../core/services/whatsapp.service';

type Tab = 'cuenta' | 'bitacora' | 'clientes';

const TIPOS: Record<WhatsappMessageType, string> = {
  MENSUALIDAD_GENERADA: 'Mensualidad generada',
  RECORDATORIO_VENCIMIENTO: 'Recordatorio de vencimiento',
  CONFIRMACION_PAGO: 'Confirmacion de pago',
  MENSUALIDAD_VENCIDA: 'Mensualidad vencida'
};

const ESTADOS: Record<WhatsappMessageStatus, { label: string; clase: string }> = {
  NOT_SENT: { label: 'No enviado', clase: 'bg-amber-50 text-amber-700' },
  REQUESTED: { label: 'Solicitado', clase: 'bg-slate-100 text-slate-600' },
  ACCEPTED: { label: 'Aceptado', clase: 'bg-sky-50 text-sky-700' },
  SENT: { label: 'Enviado', clase: 'bg-sky-50 text-sky-700' },
  DELIVERED: { label: 'Entregado', clase: 'bg-emerald-50 text-emerald-700' },
  READ: { label: 'Leido', clase: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'Fallido', clase: 'bg-rose-50 text-rose-700' }
};

@Component({
  selector: 'app-whatsapp-page',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold text-slate-900">WhatsApp</h3>
          <p class="text-sm text-slate-500">Notificaciones de mensualidades por WhatsApp Business (Meta).</p>
        </div>

        @if (isSuperAdmin()) {
          <label class="flex items-center gap-2 text-sm text-slate-600">
            Empresa
            <select class="input-base" [value]="empresaId() ?? ''" (change)="onEmpresaChange($event)">
              <option value="">Selecciona...</option>
              @for (company of companies(); track company.id) {
                <option [value]="company.id">{{ company.nombre }}</option>
              }
            </select>
          </label>
        }
      </header>

      @if (!empresaListo()) {
        <p class="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Selecciona una empresa para continuar.</p>
      } @else {
        <nav class="flex gap-2 border-b border-slate-200">
          @for (item of tabs; track item.id) {
            <button
              type="button"
              class="-mb-px border-b-2 px-4 py-2 text-sm font-semibold"
              [class]="tab() === item.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'"
              (click)="selectTab(item.id)"
            >
              {{ item.label }}
            </button>
          }
        </nav>

        @switch (tab()) {
          @case ('cuenta') {
            <div class="space-y-5">
              @if (cuenta(); as c) {
                <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                  <span class="font-semibold text-slate-700">Estado de la cuenta:</span>
                  <span [class]="estadoCuentaClase(c.status)">{{ c.status }}</span>
                  <span class="text-slate-500">{{ c.enabled ? 'Envios habilitados' : 'Envios deshabilitados' }}</span>
                  @if (c.status === 'ERROR') {
                    <span class="text-rose-600">Meta rechazo el token: actualizalo y vuelve a guardar.</span>
                  }
                </div>
              } @else if (!loading()) {
                <p class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Esta empresa todavia no tiene WhatsApp configurado.
                </p>
              }

              <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2" [formGroup]="cuentaForm" (ngSubmit)="guardarCuenta()">
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">WABA ID</span>
                  <input class="input-base" formControlName="wabaId" />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Business ID (opcional)</span>
                  <input class="input-base" formControlName="businessId" />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone Number ID</span>
                  <input class="input-base" formControlName="phoneNumberId" />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Numero de WhatsApp</span>
                  <input class="input-base" formControlName="displayPhoneNumber" placeholder="+57 302 608 8215" />
                </label>
                <label class="space-y-1 sm:col-span-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Token de acceso</span>
                  <input
                    class="input-base"
                    type="password"
                    autocomplete="new-password"
                    formControlName="accessToken"
                    [placeholder]="cuenta()?.tokenConfigurado ? 'Token guardado: deja vacio para conservarlo' : 'Pega el token permanente de Meta'"
                  />
                  <span class="text-xs text-slate-400">Se guarda cifrado y no vuelve a mostrarse.</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" formControlName="enabled" />
                  Enviar notificaciones por WhatsApp
                </label>
                <div class="sm:col-span-2">
                  <button class="btn-primary" type="submit" [disabled]="cuentaForm.invalid || saving()">
                    {{ saving() ? 'Guardando...' : 'Guardar configuracion' }}
                  </button>
                </div>
              </form>

              @if (cuenta()) {
                <form class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4" [formGroup]="pruebaForm" (ngSubmit)="enviarPrueba()">
                  <label class="space-y-1">
                    <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Enviar mensaje de prueba a</span>
                    <input class="input-base" formControlName="telefono" placeholder="+573001234567" />
                  </label>
                  <button class="btn-secondary" type="submit" [disabled]="pruebaForm.invalid || testing()">
                    {{ testing() ? 'Enviando...' : 'Enviar prueba' }}
                  </button>
                  @if (ultimaPrueba(); as p) {
                    <span [class]="estadoClase(p.status)">{{ estadoLabel(p.status) }}</span>
                    @if (p.errorMessage) {
                      <span class="text-xs text-rose-600">{{ p.errorCode }}: {{ p.errorMessage }}</span>
                    }
                  }
                </form>
              }
            </div>
          }

          @case ('bitacora') {
            <div class="space-y-5">
              @if (metricas(); as m) {
                <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <article class="rounded-xl border border-slate-200 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensajes</p>
                    <p class="mt-1 text-2xl font-bold text-slate-900">{{ m.totalMensajes | number }}</p>
                  </article>
                  <article class="rounded-xl border border-slate-200 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Entregados / leidos</p>
                    <p class="mt-1 text-2xl font-bold text-slate-900">{{ (m.porEstado['DELIVERED'] ?? 0) + (m.porEstado['READ'] ?? 0) | number }}</p>
                  </article>
                  <article class="rounded-xl border border-slate-200 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-rose-700">Fallidos / no enviados</p>
                    <p class="mt-1 text-2xl font-bold text-slate-900">{{ (m.porEstado['FAILED'] ?? 0) + (m.porEstado['NOT_SENT'] ?? 0) | number }}</p>
                  </article>
                  <article class="rounded-xl border border-slate-200 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Latencia API</p>
                    <p class="mt-1 text-lg font-bold text-slate-900">{{ latencia(m.latenciaApi) }}</p>
                    <p class="text-xs text-slate-400">promedio ({{ m.latenciaApi.muestras }} muestras)</p>
                  </article>
                  <article class="rounded-xl border border-slate-200 p-4">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Latencia de entrega</p>
                    <p class="mt-1 text-lg font-bold text-slate-900">{{ latencia(m.latenciaEntrega) }}</p>
                    <p class="text-xs text-slate-400">p95 {{ ms(m.latenciaEntrega.p95Ms) }} ({{ m.latenciaEntrega.muestras }} muestras)</p>
                  </article>
                </div>
              }

              <form class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-5" [formGroup]="filtroForm" (ngSubmit)="aplicarFiltros()">
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
                  <select class="input-base" formControlName="estado">
                    <option value="">Todos</option>
                    @for (e of estadosOpciones; track e) {
                      <option [value]="e">{{ estadoLabel(e) }}</option>
                    }
                  </select>
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</span>
                  <select class="input-base" formControlName="tipo">
                    <option value="">Todos</option>
                    @for (t of tiposOpciones; track t) {
                      <option [value]="t">{{ tipoLabel(t) }}</option>
                    }
                  </select>
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</span>
                  <input class="input-base" type="date" formControlName="desde" />
                </label>
                <label class="space-y-1">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</span>
                  <input class="input-base" type="date" formControlName="hasta" />
                </label>
                <div class="flex items-end">
                  <button class="btn-primary w-full" type="submit" [disabled]="loading()">{{ loading() ? 'Consultando...' : 'Consultar' }}</button>
                </div>
              </form>

              <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th class="px-4 py-3 font-semibold">Fecha</th>
                      <th class="px-4 py-3 font-semibold">Tipo</th>
                      <th class="px-4 py-3 font-semibold">Destino</th>
                      <th class="px-4 py-3 font-semibold">Estado</th>
                      <th class="px-4 py-3 font-semibold">API</th>
                      <th class="px-4 py-3 font-semibold">Entrega</th>
                      <th class="px-4 py-3 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    @for (m of mensajes(); track m.id) {
                      <tr>
                        <td class="whitespace-nowrap px-4 py-3 text-slate-700">{{ m.requestedAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                        <td class="px-4 py-3 text-slate-700">{{ tipoLabel(m.messageType) }}</td>
                        <td class="px-4 py-3 text-slate-700">{{ m.destination }}</td>
                        <td class="px-4 py-3"><span [class]="estadoClase(m.status)">{{ estadoLabel(m.status) }}</span></td>
                        <td class="px-4 py-3 text-slate-600">{{ ms(m.latenciaApiMs) }}</td>
                        <td class="px-4 py-3 text-slate-600">{{ ms(m.latenciaEntregaMs) }}</td>
                        <td class="px-4 py-3 text-xs text-rose-600">{{ m.errorCode ? m.errorCode + ': ' + (m.errorMessage ?? '') : '' }}</td>
                      </tr>
                    }
                    @if (!mensajes().length && !loading()) {
                      <tr>
                        <td class="px-4 py-8 text-center text-slate-500" colspan="7">No hay mensajes para los filtros seleccionados.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (totalMensajes() > pageSize) {
                <div class="flex items-center justify-between text-sm text-slate-600">
                  <span>Pagina {{ pagina() + 1 }} de {{ totalPaginas() }} ({{ totalMensajes() | number }} mensajes)</span>
                  <span class="flex gap-2">
                    <button class="btn-secondary" type="button" [disabled]="pagina() === 0 || loading()" (click)="irAPagina(pagina() - 1)">Anterior</button>
                    <button class="btn-secondary" type="button" [disabled]="pagina() + 1 >= totalPaginas() || loading()" (click)="irAPagina(pagina() + 1)">Siguiente</button>
                  </span>
                </div>
              }
            </div>
          }

          @case ('clientes') {
            <div class="space-y-3">
              <p class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Marca <strong>WhatsApp</strong> solo para los clientes que hayan dado su autorizacion para recibir mensajes.
                Cada tipo de mensaje se puede activar o desactivar por separado.
              </p>
              <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="min-w-full text-sm">
                  <thead class="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th class="px-4 py-3 font-semibold">Cliente</th>
                      <th class="px-4 py-3 font-semibold">Telefono</th>
                      <th class="px-4 py-3 text-center font-semibold">WhatsApp</th>
                      <th class="px-4 py-3 text-center font-semibold">Facturacion</th>
                      <th class="px-4 py-3 text-center font-semibold">Mensualidades</th>
                      <th class="px-4 py-3 text-center font-semibold">Pagos</th>
                      <th class="px-4 py-3 text-center font-semibold">Operativas</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    @for (c of clientes(); track c.id) {
                      <tr>
                        <td class="px-4 py-3 font-medium text-slate-800">{{ c.nombre }}</td>
                        <td class="px-4 py-3 text-slate-700">{{ c.telefono }}</td>
                        <td class="px-4 py-3 text-center">
                          <input type="checkbox" [checked]="c.whatsappHabilitado" (change)="toggle(c, 'whatsappHabilitado', $event)" />
                        </td>
                        <td class="px-4 py-3 text-center">
                          <input type="checkbox" [checked]="c.prefFacturacion" [disabled]="!c.whatsappHabilitado" (change)="toggle(c, 'prefFacturacion', $event)" />
                        </td>
                        <td class="px-4 py-3 text-center">
                          <input type="checkbox" [checked]="c.prefMensualidades" [disabled]="!c.whatsappHabilitado" (change)="toggle(c, 'prefMensualidades', $event)" />
                        </td>
                        <td class="px-4 py-3 text-center">
                          <input type="checkbox" [checked]="c.prefConfirmacionesPago" [disabled]="!c.whatsappHabilitado" (change)="toggle(c, 'prefConfirmacionesPago', $event)" />
                        </td>
                        <td class="px-4 py-3 text-center">
                          <input type="checkbox" [checked]="c.prefOperativas" [disabled]="!c.whatsappHabilitado" (change)="toggle(c, 'prefOperativas', $event)" />
                        </td>
                      </tr>
                    }
                    @if (!clientes().length && !loading()) {
                      <tr>
                        <td class="px-4 py-8 text-center text-slate-500" colspan="7">Aun no hay clientes. Se crean al registrar mensualidades.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      }
    </section>
  `
})
export class WhatsappPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly whatsappService = inject(WhatsappService);
  private readonly companyService = inject(CompanyService);
  private readonly toastService = inject(ToastService);
  private readonly authStore = inject(AuthStoreService);

  readonly pageSize = WHATSAPP_PAGE_SIZE;
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'cuenta', label: 'Cuenta' },
    { id: 'bitacora', label: 'Bitacora y metricas' },
    { id: 'clientes', label: 'Clientes' }
  ];
  readonly estadosOpciones = Object.keys(ESTADOS) as WhatsappMessageStatus[];
  readonly tiposOpciones = Object.keys(TIPOS) as WhatsappMessageType[];

  readonly isSuperAdmin = computed(() => this.authStore.role() === 'SUPER_ADMIN');
  readonly companies = signal<Company[]>([]);
  readonly empresaId = signal<number | null>(null);
  readonly empresaListo = computed(() => !this.isSuperAdmin() || this.empresaId() !== null);

  readonly tab = signal<Tab>('cuenta');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly testing = signal(false);

  readonly cuenta = signal<WhatsappCuenta | null>(null);
  readonly ultimaPrueba = signal<WhatsappMensaje | null>(null);
  readonly mensajes = signal<WhatsappMensaje[]>([]);
  readonly totalMensajes = signal(0);
  readonly pagina = signal(0);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalMensajes() / this.pageSize)));
  readonly metricas = signal<WhatsappMetricas | null>(null);
  readonly clientes = signal<Cliente[]>([]);

  readonly cuentaForm = this.fb.nonNullable.group({
    wabaId: ['', Validators.required],
    businessId: [''],
    phoneNumberId: ['', Validators.required],
    displayPhoneNumber: ['', Validators.required],
    accessToken: [''],
    enabled: [false]
  });

  readonly pruebaForm = this.fb.nonNullable.group({
    telefono: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{7,14}$/)]]
  });

  readonly filtroForm = this.fb.nonNullable.group({
    estado: [''],
    tipo: [''],
    desde: [''],
    hasta: ['']
  });

  ngOnInit(): void {
    if (this.isSuperAdmin()) {
      this.companyService.getAll().subscribe({
        next: (companies) => this.companies.set(companies),
        error: () => this.companies.set([])
      });
    } else {
      this.cargarCuenta();
    }
  }

  onEmpresaChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.empresaId.set(value > 0 ? value : null);
    this.cuenta.set(null);
    this.mensajes.set([]);
    this.metricas.set(null);
    this.clientes.set([]);
    if (value > 0) {
      this.selectTab('cuenta');
    }
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'cuenta') {
      this.cargarCuenta();
    } else if (tab === 'bitacora') {
      this.aplicarFiltros();
    } else {
      this.cargarClientes();
    }
  }

  // ---------------------------------------------------------------- cuenta

  cargarCuenta(): void {
    this.loading.set(true);
    this.whatsappService
      .getCuenta(this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cuenta) => {
          this.cuenta.set(cuenta);
          this.cuentaForm.reset({
            wabaId: cuenta?.wabaId ?? '',
            businessId: cuenta?.businessId ?? '',
            phoneNumberId: cuenta?.phoneNumberId ?? '',
            displayPhoneNumber: cuenta?.displayPhoneNumber ?? '',
            accessToken: '',
            enabled: cuenta?.enabled ?? false
          });
        },
        error: (error) => this.avisarError('No se pudo cargar la configuracion', error)
      });
  }

  guardarCuenta(): void {
    if (this.cuentaForm.invalid) {
      this.cuentaForm.markAllAsTouched();
      return;
    }
    const raw = this.cuentaForm.getRawValue();
    this.saving.set(true);
    this.whatsappService
      .saveCuenta(
        {
          wabaId: raw.wabaId.trim(),
          businessId: raw.businessId.trim(),
          phoneNumberId: raw.phoneNumberId.trim(),
          displayPhoneNumber: raw.displayPhoneNumber.trim(),
          accessToken: raw.accessToken.trim(),
          enabled: raw.enabled
        },
        this.scope()
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (cuenta) => {
          this.cuenta.set(cuenta);
          this.cuentaForm.patchValue({ accessToken: '' });
          this.toastService.show({ title: 'Configuracion guardada', description: 'La cuenta de WhatsApp quedo actualizada.', type: 'success' });
        },
        error: (error) => this.avisarError('No se pudo guardar', error)
      });
  }

  enviarPrueba(): void {
    if (this.pruebaForm.invalid) {
      this.pruebaForm.markAllAsTouched();
      return;
    }
    this.testing.set(true);
    this.whatsappService
      .sendTest(this.pruebaForm.getRawValue().telefono.trim(), this.scope())
      .pipe(finalize(() => this.testing.set(false)))
      .subscribe({
        next: (mensaje) => {
          this.ultimaPrueba.set(mensaje);
          this.cargarCuenta();
          this.toastService.show({
            title: mensaje.status === 'ACCEPTED' ? 'Mensaje aceptado por Meta' : 'La prueba no se envio',
            description: mensaje.status === 'ACCEPTED' ? 'Revisa el telefono y la bitacora.' : (mensaje.errorMessage ?? 'Revisa la configuracion.'),
            type: mensaje.status === 'ACCEPTED' ? 'success' : 'error'
          });
        },
        error: (error) => this.avisarError('No se pudo enviar la prueba', error)
      });
  }

  // ---------------------------------------------------------------- bitacora

  aplicarFiltros(): void {
    this.pagina.set(0);
    this.cargarMensajes();
    this.cargarMetricas();
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarMensajes();
  }

  private cargarMensajes(): void {
    this.loading.set(true);
    this.whatsappService
      .getMensajes(this.filtros(), this.pagina(), this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ items, total }) => {
          this.mensajes.set(items);
          this.totalMensajes.set(total);
        },
        error: (error) => {
          this.mensajes.set([]);
          this.totalMensajes.set(0);
          this.avisarError('No se pudo consultar la bitacora', error);
        }
      });
  }

  private cargarMetricas(): void {
    this.whatsappService.getMetricas(this.filtros(), this.scope()).subscribe({
      next: (metricas) => this.metricas.set(metricas),
      error: () => this.metricas.set(null)
    });
  }

  private filtros() {
    const raw = this.filtroForm.getRawValue();
    return {
      estado: raw.estado as WhatsappMessageStatus | '',
      tipo: raw.tipo as WhatsappMessageType | '',
      desde: raw.desde,
      hasta: raw.hasta
    };
  }

  // ---------------------------------------------------------------- clientes

  cargarClientes(): void {
    this.loading.set(true);
    this.whatsappService
      .getClientes(this.scope())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (clientes) => this.clientes.set(clientes),
        error: (error) => this.avisarError('No se pudieron cargar los clientes', error)
      });
  }

  toggle(cliente: Cliente, campo: keyof ClientePatch & keyof Cliente, event: Event): void {
    const valor = (event.target as HTMLInputElement).checked;
    const actualizado = { ...cliente, [campo]: valor } as Cliente;
    this.clientes.update((lista) => lista.map((c) => (c.id === cliente.id ? actualizado : c)));

    this.whatsappService.updateCliente(cliente.id, { [campo]: valor } as ClientePatch).subscribe({
      next: (guardado) => this.clientes.update((lista) => lista.map((c) => (c.id === guardado.id ? guardado : c))),
      error: (error) => {
        // Se revierte el cambio local si el servidor no lo acepto
        this.clientes.update((lista) => lista.map((c) => (c.id === cliente.id ? cliente : c)));
        this.avisarError('No se pudo actualizar el cliente', error);
      }
    });
  }

  // ---------------------------------------------------------------- presentacion

  tipoLabel(tipo: WhatsappMessageType): string {
    return TIPOS[tipo] ?? tipo;
  }

  estadoLabel(estado: WhatsappMessageStatus): string {
    return ESTADOS[estado]?.label ?? estado;
  }

  estadoClase(estado: WhatsappMessageStatus): string {
    return `rounded-full px-3 py-1 text-xs font-semibold ${ESTADOS[estado]?.clase ?? 'bg-slate-100 text-slate-600'}`;
  }

  estadoCuentaClase(estado: string): string {
    const clase = estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-700' : estado === 'ERROR' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
    return `rounded-full px-3 py-1 text-xs font-semibold ${clase}`;
  }

  ms(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '-';
    }
    return valor >= 1000 ? `${(valor / 1000).toFixed(1)} s` : `${valor} ms`;
  }

  latencia(stats: WhatsappLatencia): string {
    return this.ms(stats.promedioMs);
  }

  private scope(): number | undefined {
    return this.isSuperAdmin() ? (this.empresaId() ?? undefined) : undefined;
  }

  private avisarError(titulo: string, error: unknown): void {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    this.toastService.show({ title: titulo, description: mensaje ?? 'Intenta nuevamente en unos segundos.', type: 'error' });
  }
}
