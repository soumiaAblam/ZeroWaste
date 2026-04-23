import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthMeResponse, AuthSessionResponse, UserProfileSummary } from '../types/resource.types';

interface StoredSession {
  access: string;
  refresh: string;
  authUser: AuthSessionResponse['auth_user'] | null;
  userProfile: UserProfileSummary | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionState = signal<StoredSession | null>(this.readStoredSession());
  private initialized = false;

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.access));
  readonly authUser = computed(() => this.sessionState()?.authUser ?? null);
  readonly userProfile = computed(() => this.sessionState()?.userProfile ?? null);
  readonly displayName = computed(() => this.userProfile()?.nombre_usuario || this.authUser()?.username || 'Invitado');

  accessToken(): string | null {
    return this.sessionState()?.access ?? null;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const currentSession = this.sessionState();
    if (!currentSession?.access) {
      return;
    }

    const meResult = await firstValueFrom(
      this.http.get<AuthMeResponse>(`${API_BASE_URL}/auth/me/`).pipe(
        tap((response) => {
          this.persistSession({
            access: currentSession.access,
            refresh: currentSession.refresh,
            authUser: response.auth_user,
            userProfile: response.usuario,
          });
        }),
        catchError(() => of(null)),
      ),
    );

    if (meResult) {
      return;
    }

    // Si el access token caduca, pruebo a refrescarlo antes de limpiar la sesion entera.
    if (!currentSession.refresh) {
      this.clearSession();
      return;
    }

    const refreshed = await firstValueFrom(
      this.http.post<{ access: string }>(`${API_BASE_URL}/auth/refresh/`, { refresh: currentSession.refresh }).pipe(
        catchError(() => of(null)),
      ),
    );

    if (!refreshed?.access) {
      this.clearSession();
      return;
    }

    this.persistSession({
      access: refreshed.access,
      refresh: currentSession.refresh,
      authUser: currentSession.authUser,
      userProfile: currentSession.userProfile,
    });

    const meAfterRefresh = await firstValueFrom(
      this.http.get<AuthMeResponse>(`${API_BASE_URL}/auth/me/`).pipe(catchError(() => of(null))),
    );

    if (!meAfterRefresh) {
      this.clearSession();
      return;
    }

    this.persistSession({
      access: refreshed.access,
      refresh: currentSession.refresh,
      authUser: meAfterRefresh.auth_user,
      userProfile: meAfterRefresh.usuario,
    });
  }

  login(payload: { username: string; password: string }) {
    return this.http.post<AuthSessionResponse>(`${API_BASE_URL}/auth/login/`, payload).pipe(
      tap((response) => {
        this.persistSession({
          access: response.access,
          refresh: response.refresh,
          authUser: response.auth_user,
          userProfile: response.usuario,
        });
      }),
    );
  }

  register(payload: { username: string; email: string; password: string; password_confirm: string }) {
    return this.http.post<AuthSessionResponse>(`${API_BASE_URL}/auth/register/`, payload).pipe(
      tap((response) => {
        this.persistSession({
          access: response.access,
          refresh: response.refresh,
          authUser: response.auth_user,
          userProfile: response.usuario,
        });
      }),
    );
  }

  updateCurrentUserProfile(payload: Partial<Pick<UserProfileSummary, 'nombre_usuario' | 'email'>> & { password?: string }) {
    const currentSession = this.sessionState();
    const userProfileId = currentSession?.userProfile?.id_usuario;
    if (!currentSession || !userProfileId) {
      return throwError(() => new Error('No hay un usuario de aplicacion asociado a esta sesion.'));
    }

    return this.http.patch<UserProfileSummary>(`${API_BASE_URL}/usuarios/${userProfileId}/`, payload).pipe(
      tap((userProfile) => {
        this.persistSession({
          ...currentSession,
          userProfile,
          authUser: currentSession.authUser
            ? {
                ...currentSession.authUser,
                username: userProfile.nombre_usuario,
                email: userProfile.email,
              }
            : currentSession.authUser,
        });
      }),
    );
  }

  logout() {
    const hadSession = this.isAuthenticated();
    if (hadSession) {
      this.http.post(`${API_BASE_URL}/auth/logout/`, {}).pipe(catchError(() => of(null))).subscribe();
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  private readStoredSession(): StoredSession | null {
    const access = localStorage.getItem('zw.access');
    const refresh = localStorage.getItem('zw.refresh');
    const authUser = localStorage.getItem('zw.authUser');
    const userProfile = localStorage.getItem('zw.userProfile');

    if (!access || !refresh) {
      return null;
    }

    return {
      access,
      refresh,
      authUser: authUser ? JSON.parse(authUser) : null,
      userProfile: userProfile ? JSON.parse(userProfile) : null,
    };
  }

  private persistSession(session: StoredSession): void {
    this.sessionState.set(session);
    localStorage.setItem('zw.access', session.access);
    localStorage.setItem('zw.refresh', session.refresh);
    localStorage.setItem('zw.authUser', JSON.stringify(session.authUser));
    localStorage.setItem('zw.userProfile', JSON.stringify(session.userProfile));
  }

  private clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem('zw.access');
    localStorage.removeItem('zw.refresh');
    localStorage.removeItem('zw.authUser');
    localStorage.removeItem('zw.userProfile');
  }
}
