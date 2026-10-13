import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(Auth);
  });

  afterEach(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('patient_token');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses the patient token when no access token is stored', () => {
    localStorage.setItem('patient_token', 'patient-token-value');

    expect(service.getAccessToken()).toBe('patient-token-value');
  });
});
