import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';

import { WeeklySchedule } from './weekly-schedule';

describe('WeeklySchedule', () => {
  let component: WeeklySchedule;
  let fixture: ComponentFixture<WeeklySchedule>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklySchedule],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WeeklySchedule);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpTestingController.expectOne(`${environment.url}clinic-locations`).flush([]);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads slots by branch and displays the branch name returned by request context', () => {
    component.loadLocations();
    httpTestingController.expectOne(`${environment.url}clinic-locations`).flush([
      { id: 12, name: 'فرع المعادي' },
      { id: 13, name: 'فرع دمياط' },
    ]);

    const date = new Date();
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const requests = httpTestingController.match((request) =>
      request.url.startsWith(`${environment.url}clinic-locations/`)
      && request.url.endsWith('/time-slots'),
    );

    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(request.request.params.get('date')).toBe(dateKey);
    }

    const maadiRequest = requests.find((request) => request.request.url.includes('/12/'));
    const damiettaRequest = requests.find((request) => request.request.url.includes('/13/'));
    expect(maadiRequest).toBeDefined();
    expect(damiettaRequest).toBeDefined();

    maadiRequest!.flush({
      time_slots: [
        {
          id: 1,
          start_time: '09:00',
        },
      ],
    });
    damiettaRequest!.flush({ time_slots: [] });

    expect(component.slotsForDay(dateKey)).toEqual([
      jasmine.objectContaining({
        id: 1,
        clinicLocationName: 'فرع المعادي',
        start_time: '09:00',
      }),
    ]);
  });
});
