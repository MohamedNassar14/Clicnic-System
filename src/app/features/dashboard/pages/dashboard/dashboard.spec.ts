import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../../auth/services/auth';
import { AppointmentsService } from '../../../appointments/services/appointments';
import { environment } from '../../../../../environments/environment';
import { DashboardService } from '../../services/dashboard';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let userRole = '1';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            getUserRole: () => userRole,
            getCurrentUser: () => ({ name: 'Omar' }),
          },
        },
        {
          provide: DashboardService,
          useValue: {
            getDoctorCurrentAppointment: () => of({
              status: true,
              data: {
                patient_name: 'سارة عادل',
                start_time: '05:00',
                branch: { name: 'فرع المعادي' },
              },
            }),
            getTodayAppointments: () => of([]),
            getTodayStats: () => of({
              status: true,
              errNum: '0000',
              msg: 'ok',
              today_stats: {
                date: '2026-10-20',
                today_revenue: 0,
                today_appointments_count: 0,
                unpaid_appointments_count: 0,
                appointments_by_status: {
                  confirmed: 0,
                  in_progress: 0,
                  completed: 0,
                  cancelled: 0,
                },
              },
            }),
          },
        },
        { provide: AppointmentsService, useValue: { getVisitTypes: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the doctor dashboard when the login role is 2', async () => {
    fixture.destroy();
    userRole = '2';
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('أهلاً دكتور Omar');
    expect(fixture.nativeElement.textContent).toContain('سارة عادل');
    expect(fixture.nativeElement.textContent).toContain('05:00');
    expect(fixture.nativeElement.textContent).toContain('باقي مواعيد اليوم');
    expect(fixture.nativeElement.textContent).not.toContain('حجوزات النهاردة');
  });
});

describe('DashboardService today stats', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideZonelessChangeDetection(), DashboardService],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the today stats endpoint', () => {
    service.getTodayStats().subscribe();

    const req = httpMock.expectOne(`${environment.url}admin/stats/today`);
    expect(req.request.method).toBe('GET');
    req.flush({
      status: true,
      errNum: '0000',
      msg: 'ok',
      today_stats: {
        date: '2026-10-20',
        today_revenue: 1200,
        today_appointments_count: 4,
        unpaid_appointments_count: 2,
        appointments_by_status: {
          confirmed: 1,
          in_progress: 1,
          completed: 1,
          cancelled: 1,
        },
      },
    });
  });

  it('loads the doctor current appointment endpoint', () => {
    service.getDoctorCurrentAppointment().subscribe();

    const req = httpMock.expectOne(`${environment.url}doctor/current-appointment`);
    expect(req.request.method).toBe('GET');
    req.flush({
      status: true,
      data: {
        id: 19,
        patient: { name: 'سارة عادل' },
        start_time: '05:00',
        branch: { name: 'فرع المعادي' },
      },
    });
  });
});
