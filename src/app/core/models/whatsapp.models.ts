export type WhatsappAccountStatus = 'PENDIENTE' | 'ACTIVA' | 'ERROR';

export type WhatsappMessageStatus =
  | 'NOT_SENT'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';

export type WhatsappMessageType =
  | 'MENSUALIDAD_GENERADA'
  | 'RECORDATORIO_VENCIMIENTO'
  | 'CONFIRMACION_PAGO'
  | 'MENSUALIDAD_VENCIDA';

/** Configuracion de WhatsApp de una empresa. El token nunca llega al frontend. */
export interface WhatsappCuenta {
  id: number;
  empresaId: number;
  provider: string;
  wabaId: string;
  businessId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string;
  status: WhatsappAccountStatus;
  enabled: boolean;
  tokenConfigurado: boolean;
}

export interface WhatsappCuentaPayload {
  wabaId: string;
  businessId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  /** Vacio al actualizar = conservar el token actual. */
  accessToken: string;
  enabled: boolean;
}

export interface WhatsappMensaje {
  id: number;
  clienteId: number | null;
  suscripcionId: number | null;
  destination: string;
  messageType: WhatsappMessageType;
  templateName: string;
  providerMessageId: string | null;
  status: WhatsappMessageStatus;
  requestedAt: string;
  providerAcceptedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  latenciaApiMs: number | null;
  latenciaEnvioMs: number | null;
  latenciaEntregaMs: number | null;
}

export interface WhatsappMensajeFilters {
  estado?: WhatsappMessageStatus | '';
  tipo?: WhatsappMessageType | '';
  desde?: string;
  hasta?: string;
}

export interface WhatsappMensajesPagina {
  items: WhatsappMensaje[];
  total: number;
}

export interface WhatsappLatencia {
  muestras: number;
  promedioMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface WhatsappMetricas {
  totalMensajes: number;
  porEstado: Partial<Record<string, number>>;
  latenciaApi: WhatsappLatencia;
  latenciaEnvio: WhatsappLatencia;
  latenciaEntrega: WhatsappLatencia;
}

export interface Cliente {
  id: number;
  empresaId: number;
  nombre: string;
  telefono: string;
  whatsappHabilitado: boolean;
  prefFacturacion: boolean;
  prefMensualidades: boolean;
  prefConfirmacionesPago: boolean;
  prefOperativas: boolean;
}

export type ClientePatch = Partial<
  Pick<
    Cliente,
    'nombre' | 'whatsappHabilitado' | 'prefFacturacion' | 'prefMensualidades' | 'prefConfirmacionesPago' | 'prefOperativas'
  >
>;
