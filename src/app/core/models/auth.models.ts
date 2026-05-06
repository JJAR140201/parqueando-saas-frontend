export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'OPERARIO';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  nombre?: string;
  username: string;
  password: string;
  role: Role;
  empresaId?: number;
  sedeId?: number;
}

export interface SessionUser {
  accessToken: string;
  empresaId: number | null;
  empresaNombre?: string;
  sedeId: number | null;
  sedeNombre?: string;
  usuarioId: number | null;
  role: Role;
  username: string;
  nombre: string;
}
