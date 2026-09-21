import { Role } from '../models/auth.models';

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/app/empresas',
  ADMIN: '/app/usuarios',
  OPERARIO: '/app/operaciones'
};
