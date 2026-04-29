import { VehicleType } from './parking.models';

export interface MensualidadFilters {
  empresaId?: number;
  sedeId?: number;
  placa?: string;
}

export interface MensualidadPayload {
  placa: string;
  tipoVehiculo: VehicleType;
  valorMensual: number;
  fechaInicio: string;
  fechaFin: string;
  empresaId: number;
  sedeId: number;
  activa?: boolean;
}

export interface MensualidadItem {
  id: number;
  placa: string;
  tipoVehiculo: VehicleType;
  valorMensual: number;
  fechaInicio: string;
  fechaFin: string;
  empresaId: number;
  sedeId: number;
  activa: boolean;
}
