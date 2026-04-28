import { Role } from './auth.models';

export interface AppUser {
  id?: number;
  username: string;
  role: Role;
  empresaId: number;
  sedeId: number;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: Role;
  empresaId: number;
  sedeId: number;
}
