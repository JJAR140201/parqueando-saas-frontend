import { Role } from './auth.models';

export interface AppUser {
  id?: number;
  nombre?: string;
  username: string;
  role: Role;
  empresaId: number;
  sedeId: number;
}

export interface CreateUserPayload {
  nombre: string;
  username: string;
  password: string;
  role: Role;
  empresaId: number;
  sedeId: number;
}
