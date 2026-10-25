import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PatientProfile {
  id: number;
  personal_information: {
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: 'male' | 'female';
    address: string;
  };
  medical_information: {
    blood_type: string | null;
    has_hypertension: boolean | null;
    has_diabetes: boolean | null;
    has_heart_disease: boolean | null;
    has_previous_stroke: boolean | null;
    medical_notes: string | null;
  };
}

export interface PatientProfileResponse {
  status: boolean;
  errNum: string;
  msg: string;
  profile: PatientProfile;
}

@Injectable({ providedIn: 'root' })
export class PatientProfileService {
  private readonly http = inject(HttpClient);

  getPatientProfile(): Observable<PatientProfileResponse> {
    return this.http.get<PatientProfileResponse>(`${environment.url}patient/profile`);
  }

  getPatientAppointments(): Observable<unknown> {
    return this.http.get<unknown>(`${environment.url}appointments/my`);
  }
}
