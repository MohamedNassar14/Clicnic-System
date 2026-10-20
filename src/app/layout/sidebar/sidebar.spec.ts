import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let userRole: string | null;

  beforeEach(async () => {
    userRole = '1';
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            getUserRole: () => userRole,
            logout: () => undefined,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the assistant navigation for role 1', () => {
    expect(fixture.nativeElement.textContent).toContain('نظرة عامة');
    expect(fixture.nativeElement.textContent).not.toContain('الموعد الحالي');
    expect(fixture.nativeElement.textContent).not.toContain('مواعيد اليوم');
  });

  it('shows doctor navigation and hides assistant navigation for role 2', () => {
    fixture.destroy();
    userRole = '2';
    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('الموعد الحالي');
    expect(fixture.nativeElement.textContent).toContain('مواعيد اليوم');
    expect(fixture.nativeElement.textContent).not.toContain('نظرة عامة');
    expect(fixture.nativeElement.textContent).not.toContain('الجدول الأسبوعي');
  });
});
