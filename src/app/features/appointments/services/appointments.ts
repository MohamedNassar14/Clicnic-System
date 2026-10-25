import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ClinicLocationOption {
  id: number;
  name: string;
  address?: string;
}

export interface ClinicLocationsResponse {
  status?: boolean;
  msg?: string;
  data?: ClinicLocationOption[];
  clinic_locations?: ClinicLocationOption[];
}

export interface AppointmentTimeSlot {
  id: number | string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface AppointmentTimeSlotsResponse {
  status?: boolean;
  msg?: string;
  data?: AppointmentTimeSlot[];
  time_slots?: AppointmentTimeSlot[];
}

export interface VisitTypeOption {
  key?: string;
  label?: string;
  name?: string;
  price?: number;
  formatted?: string;
}

export interface VisitTypesResponse {
  status?: boolean;
  errNum?: string;
  msg?: string;
  data?: VisitTypeOption[];
  visit_types?: VisitTypeOption[];
}

export interface NewWalkInAppointmentPayload {
  name: string;
  phone: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  address: string;
  time_slot_id: number;
  visit_type: string;
}

export interface ExistingWalkInAppointmentPayload {
  patient_id: number;
  time_slot_id: number;
  visit_type: string;
  pay_method: 'cash';
}

export type AppointmentPayMethod = 'card' | 'wallet' | 'cash';

export interface AppointmentBookingPayload {
  time_slot_id: number;
  visit_type: string;
}

export interface AppointmentBookingResponse {
  status?: boolean;
  msg?: string;
  appointment_id?: number | string;
  appointment?: {
    id?: number | string;
    data?: { appointment_id?: number | string };
  };
  data?: { appointment_id?: number | string };
}

export interface AppointmentPaymentPayload {
  appointment_id: number;
  pay_method: AppointmentPayMethod;
  wallet_phone?: string;
}

export interface AppointmentPaymentResponse {
  status?: boolean;
  msg?: string;
  url?: string;
  payment?: {
    type?: string;
    url?: string;
  }
}

export interface MedicalRecordPayload {
  record_type: string;
  diagnosis: string;
  treatment: string;
  notes: string;
}

export interface MedicalRecordResponse {
  status?: boolean;
  msg?: string;
}

export interface AppointmentListPerson {
  name?: string;
  full_name?: string;
  phone?: string;
}

export interface AppointmentListTimeSlot {
  start_time?: string;
  end_time?: string;
  clinic_location?: AppointmentListLocation;
}

export interface AppointmentListLocation {
  name?: string;
  address?: string;
}

export interface AppointmentListItem {
  id?: number | string;
  patient_name?: string;
  patient_phone?: string;
  patient?: AppointmentListPerson;
  visit_type?: string;
  visit_type_label?: string;
  status?: string;
  payment_status?: string;
  start_time?: string;
  time_slot?: AppointmentListTimeSlot;
  clinic_location_name?: string;
  clinic_location?: AppointmentListLocation;
  branch?: AppointmentListLocation;
}

export interface AppointmentListResponse {
  appointments?: AppointmentListItem[];
  data?: AppointmentListItem[] | {
    data?: AppointmentListItem[];
    total?: number;
  };
  total?: number;
  meta?: { total?: number };
  pagination?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
  links?: unknown;
}

export interface AppointmentQueryFilters {
  date?: string;
  status?: string;
  visit_type?: string;
  is_today?: number | string;
}

export const APPOINTMENT_STATUS_OPTIONS = [
  { label: 'تم الحجز', value: 'confirmed' },
  { label: 'بيكشف حالا', value: 'in_progress' },
  { label: 'اكتمل', value: 'completed' },
  { label: 'ملغي', value: 'cancelled' },
];

export function getAppointmentStatusLabel(status?: string): string {
  if (!status) {
    return '';
  }

  switch (status) {
    case 'no_show':
      return '';
    case 'in_progress':
      return 'بيكشف حالا';
    case 'confirmed':
      return 'تم الحجز';
    case 'completed':
      return 'اكتمل';
    default:
      return APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  }
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private readonly http = inject(HttpClient);

  getClinicLocations(): Observable<ClinicLocationOption[] | ClinicLocationsResponse> {
    return this.http.get<ClinicLocationOption[] | ClinicLocationsResponse>(
      `${environment.url}clinic-locations`,
    );
  }

  searchPatientByPhone(phone: string): Observable<unknown> {
    const params = new HttpParams().set('query', phone);
    return this.http.get(`${environment.url}admin/patients/search`, { params });
  }

  getTimeSlots(
    clinicLocationId: number,
    date: string,
  ): Observable<AppointmentTimeSlot[] | AppointmentTimeSlotsResponse> {
    const params = new HttpParams().set('date', date);
    return this.http.get<AppointmentTimeSlot[] | AppointmentTimeSlotsResponse>(
      `${environment.url}clinic-locations/${clinicLocationId}/time-slots`,
      { params },
    );
  }

  getVisitTypes(clinicLocationId = 13): Observable<VisitTypeOption[] | VisitTypesResponse> {
    return this.http.get<VisitTypeOption[] | VisitTypesResponse>(
      `${environment.url}clinics/${clinicLocationId}/visit-types`,
    );
  }

  createNewPatientAppointment(payload: NewWalkInAppointmentPayload): Observable<unknown> {
    return this.http.post(`${environment.url}admin/appointments/walk-in/new-patient`, payload);
  }

  createExistingPatientAppointment(payload: ExistingWalkInAppointmentPayload): Observable<unknown> {
    return this.http.post(`${environment.url}admin/appointments/walk-in`, payload);
  }

  createAppointment(payload: AppointmentBookingPayload): Observable<AppointmentBookingResponse> {
    return this.http.post<AppointmentBookingResponse>(`${environment.url}appointments`, payload);
  }

  createAppointmentPayment(payload: AppointmentPaymentPayload): Observable<AppointmentPaymentResponse> {
    return this.http.post<AppointmentPaymentResponse>(`${environment.url}payments/pay`, payload);
  }

  getAppointments(
    page = 1,
    filters: AppointmentQueryFilters = {},
    perPage = 5,
  ): Observable<AppointmentListItem[] | AppointmentListResponse> {
    let params = new HttpParams().set('page', page).set('per_page', perPage);

    if (filters.date) {
      params = params.set('date', filters.date);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.visit_type) {
      params = params.set('visit_type', filters.visit_type);
    }

    if (filters.is_today !== undefined) {
      params = params.set('is_today', String(filters.is_today));
    }

    return this.http.get<AppointmentListItem[] | AppointmentListResponse>(
      `${environment.url}admin/appointments`,
      { params },
    );
  }

  setAppointmentCurrent(appointmentId: number | string): Observable<void> {
    return this.http.put<void>(
      `${environment.url}admin/appointments/${appointmentId}/set-current`,
      {},
    );
  }

  createMedicalRecord(
    appointmentId: number | string,
    payload: MedicalRecordPayload,
  ): Observable<MedicalRecordResponse> {
    return this.http.post<MedicalRecordResponse>(
      `${environment.url}doctor/appointments/${appointmentId}/medical-record`,
      payload,
    );
  }
}