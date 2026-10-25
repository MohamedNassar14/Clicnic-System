import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CreateClinicLocationPayload {
  name: string;
  address: string;
  consultation_price: number;
  checkup_price: number;
}

export type UpdateClinicLocationPayload = CreateClinicLocationPayload;

export interface ClinicLocation {
  id: number;
  name: string;
  address: string;
  checkup_price: number;
  consultation_price: number;
}

export interface ClinicLocationsResponse {
  data?: ClinicLocation[];
  clinic_locations?: ClinicLocation[];
}

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly http = inject(HttpClient);
  private readonly clinicLocationsUrl = 'https://api.flexlify.live/api/admin/clinic-locations';

  getClinicLocations(): Observable<ClinicLocation[] | ClinicLocationsResponse> {
    return this.http.get<ClinicLocation[] | ClinicLocationsResponse>(`${environment.url}admin/get-clinic-locations`);
  }

  createClinicLocation(payload: CreateClinicLocationPayload): Observable<unknown> {
    return this.http.post(`${environment.url}admin/clinic-locations`, payload);
  }

  updateClinicLocation(
    locationId: number,
    payload: UpdateClinicLocationPayload,
  ): Observable<unknown> {
    return this.http.put(`${this.clinicLocationsUrl}/${locationId}`, payload);
  }

  deleteClinicLocation(locationId: number): Observable<unknown> {
    return this.http.delete(`${this.clinicLocationsUrl}/${locationId}`);
  }
}