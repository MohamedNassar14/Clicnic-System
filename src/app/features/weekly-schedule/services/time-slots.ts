import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ClinicLocationOption {
  id: number;
  name: string;
}

export interface TimeSlot {
  id?: number | string;
  start_time: string;
  end_time?: string;
  clinic_location_id?: number | string;
  clinic_id?: number | string;
  location_id?: number | string;
  branch_id?: number | string;
  clinic_location_name?: string;
  clinic_name?: string;
  location_name?: string;
  branch_name?: string;
  clinic_location?: {
    id?: number | string;
    name?: string;
  };
  clinic?: {
    id?: number | string;
    name?: string;
  };
  branch?: {
    id?: number | string;
    name?: string;
  };
}

export interface CreateTimeSlotPayload {
  clinic_location_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

export interface CollectionResponse<T> {
  data?: T[];
  clinic_locations?: T[];
  time_slots?: T[];
}

@Injectable({ providedIn: 'root' })
export class TimeSlotsService {
  private readonly http = inject(HttpClient);

  getClinicLocations(): Observable<ClinicLocationOption[] | CollectionResponse<ClinicLocationOption>> {
    return this.http.get<ClinicLocationOption[] | CollectionResponse<ClinicLocationOption>>(
      `${environment.url}clinic-locations`,
    );
  }

  getTimeSlots(
    date: string,
  ): Observable<TimeSlot[] | CollectionResponse<TimeSlot>> {
    const params = new HttpParams()
      .set('date', date);

    return this.http.get<TimeSlot[] | CollectionResponse<TimeSlot>>(
      `${environment.url}admin/time-slots`,
      { params },
    );
  }

  createTimeSlot(payload: CreateTimeSlotPayload): Observable<unknown> {
    return this.http.post(`${environment.url}admin/time-slots`, payload);
  }
}