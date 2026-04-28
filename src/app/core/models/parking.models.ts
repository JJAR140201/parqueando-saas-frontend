export type VehicleType = 'CARRO' | 'MOTO';

export interface EntradaPayload {
  placa: string;
  tipoVehiculo: VehicleType;
}

export interface SalidaPayload {
  placa: string;
}

export interface SalidaResumen {
  placa: string;
  tipoVehiculo: VehicleType;
  tipo?: string;
  fechaEntrada?: string;
  fechaSalida?: string;
  minutosEstadia?: number;
  horas: number;
  totalPagado: number;
}
