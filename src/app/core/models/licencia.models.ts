export type EstadoLicencia = 'PENDIENTE' | 'REDIMIDA' | 'REVOCADA';

export interface LicenciaSummary {
  id: number;
  codigoEnmascarado: string;
  estado: EstadoLicencia;
  fechaEmision: string;
  fechaExpiracion: string;
  fechaRedencion: string | null;
  fechaRevocacion: string | null;
  empresaId: number | null;
  empresaNombre: string | null;
  nota: string | null;
  prueba: boolean;
}

export interface LicenciaIssuedResult {
  id: number;
  codigo: string;
  estado: EstadoLicencia;
  fechaEmision: string;
  fechaExpiracion: string;
  nota: string | null;
  prueba: boolean;
}

export interface IssueLicenciaPayload {
  duracionDias?: number;
  prueba?: boolean;
  nota?: string;
}

export interface ValidateLicenciaResult {
  valida: boolean;
  mensaje: string;
  fechaExpiracion: string | null;
}

export interface RenewLicenciaPayload {
  codigo: string;
  username: string;
  password: string;
}

export interface RedeemLicenciaPayload {
  codigo: string;
  empresa: {
    nit: string;
    nombre: string;
    sedes: { nombre: string; capacidadTotal: number }[];
  };
  admin: {
    nombre?: string;
    username: string;
    password: string;
  };
}
