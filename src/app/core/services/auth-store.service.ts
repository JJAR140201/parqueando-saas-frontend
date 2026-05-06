import { computed, Injectable, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { Role, SessionUser } from '../models/auth.models';

const defaultRole: Role = 'OPERARIO';

@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  private readonly session = signal<SessionUser | null>(this.readSession());

  readonly token = computed(() => this.session()?.accessToken ?? '');
  readonly role = computed<Role>(() => this.session()?.role ?? defaultRole);
  readonly username = computed(() => this.session()?.username ?? '');
  readonly nombre = computed(() => this.session()?.nombre ?? '');
  readonly displayName = computed(() => this.session()?.nombre || this.session()?.username || '');
  readonly empresaId = computed(() => this.session()?.empresaId ?? null);
  readonly empresaNombre = computed(() => this.session()?.empresaNombre ?? '');
  readonly sedeId = computed(() => this.session()?.sedeId ?? null);
  readonly sedeNombre = computed(() => this.session()?.sedeNombre ?? '');
  readonly usuarioId = computed(() => this.session()?.usuarioId ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.session()?.accessToken));

  setSession(session: SessionUser): void {
    this.session.set(session);
    this.safeStorageSet(STORAGE_KEYS.token, session.accessToken);
    this.safeStorageSet(STORAGE_KEYS.role, session.role);
    this.safeStorageSet(STORAGE_KEYS.username, session.username);
    this.safeStorageSet(STORAGE_KEYS.nombre, session.nombre);
    this.safeStorageSet(STORAGE_KEYS.empresaId, String(session.empresaId ?? ''));
    this.safeStorageSet(STORAGE_KEYS.empresaNombre, session.empresaNombre ?? '');
    this.safeStorageSet(STORAGE_KEYS.sedeId, String(session.sedeId ?? ''));
    this.safeStorageSet(STORAGE_KEYS.sedeNombre, session.sedeNombre ?? '');
    this.safeStorageSet(STORAGE_KEYS.usuarioId, String(session.usuarioId ?? ''));
  }

  clearSession(): void {
    this.session.set(null);
    this.safeStorageRemove(STORAGE_KEYS.token);
    this.safeStorageRemove(STORAGE_KEYS.role);
    this.safeStorageRemove(STORAGE_KEYS.username);
    this.safeStorageRemove(STORAGE_KEYS.nombre);
    this.safeStorageRemove(STORAGE_KEYS.empresaId);
    this.safeStorageRemove(STORAGE_KEYS.empresaNombre);
    this.safeStorageRemove(STORAGE_KEYS.sedeId);
    this.safeStorageRemove(STORAGE_KEYS.sedeNombre);
    this.safeStorageRemove(STORAGE_KEYS.usuarioId);
  }

  private readSession(): SessionUser | null {
    if (!this.hasStorage()) {
      return null;
    }

    const accessToken = localStorage.getItem(STORAGE_KEYS.token) ?? '';
    if (!accessToken) {
      return null;
    }

    const role = (localStorage.getItem(STORAGE_KEYS.role) as Role | null) ?? defaultRole;
    const username = localStorage.getItem(STORAGE_KEYS.username) ?? '';
    const storedNombre = localStorage.getItem(STORAGE_KEYS.nombre);
    const nombre = storedNombre || this.extractNameFromToken(accessToken) || username;
    const empresaIdRaw = localStorage.getItem(STORAGE_KEYS.empresaId);
    const empresaNombreRaw = localStorage.getItem(STORAGE_KEYS.empresaNombre);
    const sedeIdRaw = localStorage.getItem(STORAGE_KEYS.sedeId);
    const sedeNombreRaw = localStorage.getItem(STORAGE_KEYS.sedeNombre);
    const usuarioIdRaw = localStorage.getItem(STORAGE_KEYS.usuarioId);

    return {
      accessToken,
      role,
      username,
      nombre,
      empresaId: empresaIdRaw ? Number(empresaIdRaw) : null,
      empresaNombre: empresaNombreRaw || this.extractClaimFromToken(accessToken, ['empresaNombre', 'nombreEmpresa', 'empresa']) || undefined,
      sedeId: sedeIdRaw ? Number(sedeIdRaw) : null,
      sedeNombre: sedeNombreRaw || this.extractClaimFromToken(accessToken, ['sedeNombre', 'nombreSede', 'sede']) || undefined,
      usuarioId: usuarioIdRaw ? Number(usuarioIdRaw) : null
    };
  }

  private safeStorageSet(key: string, value: string): void {
    if (this.hasStorage()) {
      localStorage.setItem(key, value);
    }
  }

  private safeStorageRemove(key: string): void {
    if (this.hasStorage()) {
      localStorage.removeItem(key);
    }
  }

  private hasStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private extractNameFromToken(token: string): string | null {
    return this.extractClaimFromToken(token, ['nombre', 'name', 'given_name', 'preferred_username', 'unique_name']) ?? null;
  }

  private extractClaimFromToken(token: string, keys: string[]): string | undefined {
    const parts = token.split('.');
    if (parts.length < 2 || typeof atob !== 'function') {
      return undefined;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
      const candidate = keys.map((key) => payload[key]).find((value) => value !== null && value !== undefined && value !== '');

      if (candidate === null || candidate === undefined || candidate === '') {
        return undefined;
      }

      return String(candidate);
    } catch {
      return undefined;
    }
  }
}
