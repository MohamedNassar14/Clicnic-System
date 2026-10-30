import { TestBed } from '@angular/core/testing';
import { CanMatchFn } from '@angular/router';

import { baseUrlGuard } from './base-url-guard';

describe('baseUrlGuard', () => {
  const executeGuard: CanMatchFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => baseUrlGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
