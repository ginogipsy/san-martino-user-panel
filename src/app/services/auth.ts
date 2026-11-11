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
            const realmRoles: string[] = decoded.realm_access?.roles || [];
            const userRole =
              realmRoles.find((r: string) => r.startsWith('ROLE_')) ||
              decoded.role ||
              realmRoles[0] ||
              '';

            localStorage.setItem('role', userRole);
            localStorage.setItem('username', decoded.preferred_username || decoded.sub || '');
            if (decoded.standId) {
              localStorage.setItem('standId', decoded.standId);
            }
          } catch (e) {
            console.error('Errore durante la decodifica del token JWT', e);
          }
        }
      }),
    );
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
    return null;
  }

  getUserRole(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('role') || '';
    }
    return '';
  }

  getStandId(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('standId');
    }
    return null;
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'ROLE_ADMIN' || role === 'ROLE_STAND_OWNER';
  }

  logout() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('standId');
    }
  }
}
