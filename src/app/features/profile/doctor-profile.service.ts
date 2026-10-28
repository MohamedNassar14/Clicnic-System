import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorProfileService {
  private readonly http = inject(HttpClient);

  getDoctorProfile(): Observable<unknown> {
    return this.http.get<unknown>(`${environment.url}doctor-profile`);
  }

  updateDoctorProfile(payload: DoctorProfileUpdatePayload): Observable<unknown> {
    return this.http.put<unknown>(`${environment.url}doctor/profile`, payload);
  }
}

export interface DoctorProfileUpdatePayload {
  specialty: string;
  title: string;
  years_of_experience: number;
  bio: string;
  qualifications: string[];
  experiences: DoctorExperience[];
}

export interface DoctorExperience {
  place: string;
  position: string;
  from: number;
  to: number;
}
