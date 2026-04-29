export type ReportStatus = 'ACTIVO' | 'FINALIZADO';

export interface ParkingReportFilters {
  empresaId?: number;
  sedeId?: number;
  estado?: ReportStatus;
  desde?: string;
  hasta?: string;
}

export interface ParkingReportItem {
  id?: number;
  empresaId?: number;
  sedeId?: number;
  placa: string;
  tipoVehiculo: string;
  estado: string;
  fechaIngreso?: string;
  fechaSalida?: string;
  totalCobrado?: number;
  nombreEmpresa?: string;
  nombreSede?: string;
}
