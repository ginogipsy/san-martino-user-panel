import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { jwtDecode } from 'jwt-decode';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export type AppRole = 'ROLE_ADMIN' | 'ROLE_STAND_OWNER' | 'ROLE_MODERATOR' | string;

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.authUrl;

  /**
   * Effettua il login inviando le credenziali al backend (auth-service tramite Gateway)
   */
  login(credentials: { username?: string | null; password?: string | null }) {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((res) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          const token = res?.access_token;

          if (!token) {
            console.error('Nessun access_token presente nella risposta del server:', res);
            return;
          }

          localStorage.setItem('token', token);
          if (res.refresh_token) {
            localStorage.setItem('refresh_token', res.refresh_token);
          }

          try {
            const decoded: any = jwtDecode(token);
            const rawRoles: string[] = [
              ...(Array.isArray(decoded.realm_access?.roles) ? decoded.realm_access.roles : []),
              ...(Array.isArray(decoded.roles) ? decoded.roles : []),
              ...(typeof decoded.role === 'string' ? [decoded.role] : []),
            ];

            const normalizedRoles = Array.from(
              new Set(rawRoles.map((r) => this.normalizeRole(r)).filter(Boolean)),
            );

            // Se l'utente è ginogipsy o admin e Keycloak non ha ancora mappato ruoli custom, garantiamo ROLE_ADMIN
            const username = decoded.preferred_username || decoded.sub || '';
            if (
              normalizedRoles.length === 0 &&
              (username === 'ginogipsy' || username === 'admin')
            ) {
              normalizedRoles.push('ROLE_ADMIN');
            }

            const primaryRole =
              normalizedRoles.find((r) => r === 'ROLE_ADMIN') ||
              normalizedRoles.find((r) => r === 'ROLE_STAND_OWNER') ||
              normalizedRoles.find((r) => r === 'ROLE_MODERATOR') ||
              normalizedRoles[0] ||
              '';

            localStorage.setItem('role', primaryRole);
            localStorage.setItem('roles', JSON.stringify(normalizedRoles));
            localStorage.setItem('username', username);
            if (decoded.standId) {
              localStorage.setItem('standId', String(decoded.standId));
            } else {
              localStorage.removeItem('standId');
            }
          } catch (e) {
            console.error('Errore durante la decodifica del token JWT', e);
          }
        }
      }),
    );
  }

  private normalizeRole(role: string): string {
    if (!role) return '';
    const upper = role.trim().toUpperCase();
    if (upper === 'ADMIN' || upper === 'ROLE_ADMIN') return 'ROLE_ADMIN';
    if (upper === 'STAND_OWNER' || upper === 'ROLE_STAND_OWNER' || upper === 'OWNER') {
      return 'ROLE_STAND_OWNER';
    }
    if (upper === 'MODERATOR' || upper === 'ROLE_MODERATOR') return 'ROLE_MODERATOR';
    return role;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUsername(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('username') || 'Utente';
    }
    return 'Utente';
  }

  getUserRole(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('role') || '';
    }
    return '';
  }

  getUserRoles(): string[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('roles');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
      const single = localStorage.getItem('role');
      return single ? [single] : [];
    }
    return [];
  }

  hasRole(role: AppRole): boolean {
    const normalized = this.normalizeRole(role);
    const roles = this.getUserRoles().map((r) => this.normalizeRole(r));
    return roles.includes(normalized);
  }

  hasAnyRole(allowedRoles: AppRole[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return this.isAuthenticated();
    }
    return allowedRoles.some((r) => this.hasRole(r));
  }

  getStandId(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('standId');
    }
    return null;
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isStandOwner(): boolean {
    return this.hasRole('ROLE_STAND_OWNER');
  }

  isModerator(): boolean {
    return this.hasRole('ROLE_MODERATOR');
  }

  canManageEvents(): boolean {
    return this.isAdmin();
  }

  canManageStands(): boolean {
    return this.isAdmin() || this.isStandOwner();
  }

  canModerateReviews(): boolean {
    return this.isAdmin() || this.isModerator();
  }

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('role');
      localStorage.removeItem('roles');
      localStorage.removeItem('username');
      localStorage.removeItem('standId');
    }
  }
}
