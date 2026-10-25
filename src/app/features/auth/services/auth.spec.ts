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
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uses the patient token when no access token is stored', () => {
    localStorage.setItem('patient_token', 'patient-token-value');

    expect(service.getAccessToken()).toBe('patient-token-value');
  });

  it('reads the role saved with the user session', () => {
    localStorage.setItem('user', JSON.stringify({ role: '2' }));

    expect(service.getUserRole()).toBe('2');
  });

  it('prefers the explicitly stored role', () => {
    localStorage.setItem('user', JSON.stringify({ role: '1' }));
    localStorage.setItem('user_role', '2');

    expect(service.getUserRole()).toBe('2');
  });

  it('reads the current user details saved from the login response', () => {
    localStorage.setItem('user', JSON.stringify({
      id: 19,
      name: 'Omar',
      email: 'omar123@gmail.com',
      phone: '01013141516',
      role: '2',
    }));

    expect(service.getCurrentUser()).toEqual({
      id: 19,
      name: 'Omar',
      email: 'omar123@gmail.com',
      phone: '01013141516',
      role: '2',
      created_at: undefined,
    });
  });
});
