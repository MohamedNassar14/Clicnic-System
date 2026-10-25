import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  date_of_birth: string;
  gender: 'female' | 'male';
  address: string;
}

export interface PatientLoginPayload {
  phone: string;
  password: string;
}

export interface RegisterResponse {
  status: boolean;
  errNum: string;
  msg: string;
  user: {
    user: {
      id: number;
      name: string;
      email: string;
      phone: string;
      role: string;
    };
    token: string;
  };
}

export interface LoginResponse {
  status: boolean;
  errNum: string;
  msg: string;
  user: {
    user: {
      id: number;
      name: string;
      email: string;
      phone: string;
      created_at?: string;
      role?: string | number;
    };
    access_token: string;
  };
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  role?: string | number;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly httpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  signIn(data: object): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(`${environment.url}admin/login`, data);
  }

  patientSignIn(data: PatientLoginPayload): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(`${environment.url}login`, data);
  }

  register(data: RegisterPayload): Observable<RegisterResponse> {
    return this.httpClient.post<RegisterResponse>(`${environment.url}register`, data);
  }

  saveSession(response: LoginResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem('access_token', response.user.access_token);
    localStorage.setItem('user', JSON.stringify(response.user.user));
    if (response.user.user.role !== undefined) {
      localStorage.setItem('user_role', String(response.user.user.role));
    } else {
      localStorage.removeItem('user_role');
    }
    localStorage.removeItem('patient_token');
  }

  savePatientSession(response: RegisterResponse | LoginResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = 'token' in response.user ? response.user.token : response.user.access_token;
    localStorage.setItem('patient_token', token);
    localStorage.setItem('user', JSON.stringify(response.user.user));
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('register_form');
  }

  hasAdminSession(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return Boolean(localStorage.getItem('access_token'));
  }

  hasPatientSession(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return Boolean(localStorage.getItem('patient_token'));
  }

  getUserRole(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const storedRole = localStorage.getItem('user_role');
    if (storedRole) {
      return storedRole;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (typeof user !== 'object' || user === null || !('role' in user)) {
        return null;
      }

      const role = user.role;
      return typeof role === 'string' || typeof role === 'number' ? String(role) : null;
    } catch (error) {
      console.error('Unable to read the role from the stored user.', error);
      return null;
    }
  }

  getCurrentUser(): SessionUser | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (
        typeof user !== 'object' ||
        user === null ||
        !('id' in user) ||
        !('name' in user) ||
        !('email' in user) ||
        !('phone' in user) ||
        typeof user.id !== 'number' ||
        typeof user.name !== 'string' ||
        typeof user.email !== 'string' ||
        typeof user.phone !== 'string'
      ) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'role' in user && (typeof user.role === 'string' || typeof user.role === 'number')
          ? user.role
          : undefined,
        created_at: 'created_at' in user && typeof user.created_at === 'string'
          ? user.created_at
          : undefined,
      };
    } catch (error) {
      console.error('Unable to read the stored user.', error);
      return null;
    }
  }

  getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem('access_token') ?? localStorage.getItem('patient_token');
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
  }
}
