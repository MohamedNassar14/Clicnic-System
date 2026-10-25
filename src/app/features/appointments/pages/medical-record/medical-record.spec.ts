import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppointmentsService } from '../../services/appointments';
import { environment } from '../../../../../environments/environment';

describe('AppointmentsService medical record', () => {
  let service: AppointmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideZonelessChangeDetection(), AppointmentsService],
    });

    service = TestBed.inject(AppointmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('saves a medical record for the selected appointment', () => {
    const payload = {
      record_type: 'checkup',
      diagnosis: 'التهاب في الحلق',
      treatment: 'مضاد حيوي لمدة 5 أيام',
      notes: 'المريضة تحسنت عن الزيارة اللي فاتت',
    };

    service.createMedicalRecord(1, payload).subscribe();

    const request = httpMock.expectOne(`${environment.url}doctor/appointments/1/medical-record`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ status: true, msg: 'Saved' });
  });
});
