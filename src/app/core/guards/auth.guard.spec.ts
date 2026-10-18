import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Auth } from '../../features/auth/services/auth';
import { authGuard } from './auth.guard';
import { patientGuard } from './patient.guard';

describe('route guards', () => {
  let hasAdminSession: boolean;
  let hasPatientSession: boolean;
  let platformId: string;
  let router: Router;

  beforeEach(() => {
    hasAdminSession = false;
    hasPatientSession = false;
    platformId = 'browser';
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useFactory: () => platformId },
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            hasAdminSession: () => hasAdminSession,
            hasPatientSession: () => hasPatientSession,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('allows a valid admin session and redirects unauthenticated users to admin login', () => {
    hasAdminSession = true;
    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe(true);

    hasAdminSession = false;
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/admin-login');
  });

  it('allows a valid patient session and redirects unauthenticated users to registration', () => {
    hasPatientSession = true;
    expect(TestBed.runInInjectionContext(() => patientGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe(true);

    hasPatientSession = false;
    const result = TestBed.runInInjectionContext(() => patientGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/register');
  });

  it('defers session checks during server rendering', () => {
    platformId = 'server';

    expect(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe(true);
    expect(TestBed.runInInjectionContext(() => patientGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)))
      .toBe(true);
  });
});
