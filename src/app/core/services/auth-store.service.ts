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
  readonly sedeId = computed(() => this.session()?.sedeId ?? null);
  readonly usuarioId = computed(() => this.session()?.usuarioId ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.session()?.accessToken));

  setSession(session: SessionUser): void {
    this.session.set(session);
    this.safeStorageSet(STORAGE_KEYS.token, session.accessToken);
    this.safeStorageSet(STORAGE_KEYS.role, session.role);
    this.safeStorageSet(STORAGE_KEYS.username, session.username);
    this.safeStorageSet(STORAGE_KEYS.nombre, session.nombre);
    this.safeStorageSet(STORAGE_KEYS.empresaId, String(session.empresaId ?? ''));
    this.safeStorageSet(STORAGE_KEYS.sedeId, String(session.sedeId ?? ''));
    this.safeStorageSet(STORAGE_KEYS.usuarioId, String(session.usuarioId ?? ''));
  }

  clearSession(): void {
    this.session.set(null);
    this.safeStorageRemove(STORAGE_KEYS.token);
    this.safeStorageRemove(STORAGE_KEYS.role);
    this.safeStorageRemove(STORAGE_KEYS.username);
    this.safeStorageRemove(STORAGE_KEYS.nombre);
    this.safeStorageRemove(STORAGE_KEYS.empresaId);
    this.safeStorageRemove(STORAGE_KEYS.sedeId);
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
    const sedeIdRaw = localStorage.getItem(STORAGE_KEYS.sedeId);
    const usuarioIdRaw = localStorage.getItem(STORAGE_KEYS.usuarioId);

    return {
      accessToken,
      role,
      username,
      nombre,
      empresaId: empresaIdRaw ? Number(empresaIdRaw) : null,
      sedeId: sedeIdRaw ? Number(sedeIdRaw) : null,
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
    const parts = token.split('.');
    if (parts.length < 2 || typeof atob !== 'function') {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
      const candidate =
        payload['nombre'] ??
        payload['name'] ??
        payload['given_name'] ??
        payload['preferred_username'] ??
        payload['unique_name'];

      if (candidate === null || candidate === undefined || candidate === '') {
        return null;
      }

      return String(candidate);
    } catch {
      return null;
    }
  }
}
