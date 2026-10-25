import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../../auth/services/auth';
import { AppointmentsService } from '../../services/appointments';
import { environment } from '../../../../../environments/environment';

import { Appointments } from './appointments';

describe('Appointments', () => {
  let component: Appointments;
  let fixture: ComponentFixture<Appointments>;
  let userRole = '1';
  let getAppointments: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Appointments],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: Auth,
          useValue: { getUserRole: () => userRole },
        },
        {
          provide: AppointmentsService,
          useValue: {
            getAppointments: jasmine.createSpy('getAppointments').and.returnValue(of([])),
            getVisitTypes: () => of([]),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Appointments);
    component = fixture.componentInstance;
    getAppointments = TestBed.inject(AppointmentsService).getAppointments as jasmine.Spy;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads only today appointments for doctor role 2', () => {
    fixture.destroy();
    userRole = '2';
    fixture = TestBed.createComponent(Appointments);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(getAppointments).toHaveBeenCalledWith(1, jasmine.objectContaining({ is_today: 1 }), 5);
    expect(fixture.nativeElement.textContent).toContain('مواعيد اليوم');
    expect(fixture.nativeElement.textContent).not.toContain('حجز موعد من العيادة');
  });
});

describe('AppointmentsService', () => {
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

  afterEach(() => {
    httpMock.verify();
  });

  it('should send the confirmed consultation query params expected by the API', () => {
    service.getAppointments(1, {
      status: 'confirmed',
      visit_type: 'consultation',
      is_today: 1,
    }).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('admin/appointments'));

    expect(req.request.params.get('status')).toBe('confirmed');
    expect(req.request.params.get('visit_type')).toBe('consultation');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('is_today')).toBe('1');
    expect(req.request.params.get('per_page')).toBe('5');

    req.flush([]);
  });

  it('sets the selected appointment as current with a PUT request', () => {
    service.setAppointmentCurrent(42).subscribe();

    const req = httpMock.expectOne(`${environment.url}admin/appointments/42/set-current`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('loads visit types for the selected clinic location', () => {
    service.getVisitTypes(12).subscribe();

    const req = httpMock.expectOne(`${environment.url}clinics/12/visit-types`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: true, visit_types: [] });
  });

  it('creates a patient appointment with the selected slot and visit type', () => {
    const payload = { time_slot_id: 17, visit_type: 'checkup' };

    service.createAppointment(payload).subscribe();

    const req = httpMock.expectOne(`${environment.url}appointments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: true, appointment_id: 42 });
  });

  it('submits the selected payment method for the created appointment', () => {
    const payload = {
      appointment_id: 42,
      pay_method: 'wallet' as const,
      wallet_phone: '01013808583',
    };

    service.createAppointmentPayment(payload).subscribe();

    const req = httpMock.expectOne(`${environment.url}payments/pay`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: true, url: 'https://payments.example/checkout' });
  });
});
