import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AppointmentPerson {
  id?: number | string;
  name?: string;
  full_name?: string;
  phone?: string;
}

export interface AppointmentTime {
  start_time?: string;
  end_time?: string;
  clinic_location?: AppointmentLocation;
}

export interface AppointmentLocation {
  name?: string;
  address?: string;
}

export interface TodayAppointmentResponse {
  id?: number | string;
  appointment_id?: number | string;
  patient_id?: number | string;
  patient_name?: string;
  patient_phone?: string;
  patient?: AppointmentPerson;
  visit_type?: string;
  visit_type_label?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  end_time?: string;
  time_slot?: AppointmentTime;
  clinic_location_name?: string;
  clinic_location?: AppointmentLocation;
  branch?: AppointmentLocation;
}

export interface TodayAppointmentsResponse {
  appointments?: TodayAppointmentResponse[];
  data?: TodayAppointmentResponse[] | { data?: TodayAppointmentResponse[]; total?: number };
  total?: number;
  pagination?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
}

export interface DoctorCurrentAppointmentResponse {
  status?: boolean;
  errNum?: string;
  msg?: string;
  current_appointment?: TodayAppointmentResponse | null;
  appointment?: TodayAppointmentResponse | null;
  data?: TodayAppointmentResponse | {
    current_appointment?: TodayAppointmentResponse | null;
    appointment?: TodayAppointmentResponse | null;
    data?: TodayAppointmentResponse | null;
  } | null;
}

export interface TodayAppointmentFilters {
  date?: string;
  status?: string;
  visit_type?: string;
}

export interface TodayStats {
  date: string;
  today_revenue: number;
  today_appointments_count: number;
  unpaid_appointments_count: number;
  appointments_by_status: {
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
}

export interface TodayStatsResponse {
  status: boolean;
  errNum: string;
  msg: string;
  today_stats: TodayStats;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDoctorCurrentAppointment(): Observable<DoctorCurrentAppointmentResponse> {
    return this.http.get<DoctorCurrentAppointmentResponse>(
      `${environment.url}doctor/current-appointment`,
    );
  }

  getTodayStats(): Observable<TodayStatsResponse> {
    return this.http.get<TodayStatsResponse>(`${environment.url}admin/stats/today`);
  }

  getTodayAppointments(
    page = 1,
    filters: TodayAppointmentFilters = {},
    perPage = 5,
  ): Observable<TodayAppointmentResponse[] | TodayAppointmentsResponse> {
    let params = new HttpParams().set('page', page).set('per_page', perPage);

    if (filters.date) {
      params = params.set('date', filters.date);
    } else {
      params = params.set('is_today', 1);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.visit_type) {
      params = params.set('visit_type', filters.visit_type);
    }

    return this.http.get<TodayAppointmentResponse[] | TodayAppointmentsResponse>(
      `${environment.url}admin/appointments`,
      { params },
    );
  }
}