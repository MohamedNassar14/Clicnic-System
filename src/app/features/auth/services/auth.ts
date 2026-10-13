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
      created_at: string;
    };
    access_token: string;
  };
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
  }

  savePatientSession(response: RegisterResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem('patient_token', response.user.token);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('register_form');
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
  }
}
