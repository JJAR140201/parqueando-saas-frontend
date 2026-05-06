export interface Sede {
  id?: number;
  nombre: string;
  capacidad: number;
  empresaNombre?: string;
  valorFraccionCarro?: number;
  minutosFraccionCarro?: number;
  valorFraccionMoto?: number;
  minutosFraccionMoto?: number;
}

export interface Company {
  id?: number;
  nit: string;
  nombre: string;
  sedes?: Sede[];
}

export interface CompanyPayload {
  nit: string;
  nombre: string;
  sedes: Sede[];
}
