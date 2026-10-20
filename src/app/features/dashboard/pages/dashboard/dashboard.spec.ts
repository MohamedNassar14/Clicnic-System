import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppointmentsService } from '../../../appointments/services/appointments';
import { environment } from '../../../../../environments/environment';
import { DashboardService } from '../../services/dashboard';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: DashboardService,
          useValue: {
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
});
