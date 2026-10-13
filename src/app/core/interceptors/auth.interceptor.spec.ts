import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('patient_token', 'patient-token-value');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('patient_token');
    localStorage.removeItem('access_token');
  });

  it('sends the stored patient token as a Bearer authorization header', () => {
    http.get(`${environment.url}admin/clinics/12/visit-types`).subscribe();

    const request = httpTestingController.expectOne(
      `${environment.url}admin/clinics/12/visit-types`,
    );
    expect(request.request.headers.get('Authorization')).toBe('Bearer patient-token-value');
    request.flush({ status: true, visit_types: [] });
  });
});
