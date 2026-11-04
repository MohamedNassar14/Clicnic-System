import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PatientProfile } from './patient-profile';
import { PatientProfileService } from './patient-profile.service';

describe('PatientProfile', () => {
  let fixture: ComponentFixture<PatientProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientProfile],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: PatientProfileService,
          useValue: {
            getPatientProfile: () => of({
              status: true,
              errNum: '0000',
              msg: 'success',
              profile: {
                id: 1,
                personal_information: {
                  name: 'مريض',
                  email: 'patient@example.com',
                  phone: '01000000000',
                  date_of_birth: '1990-01-01',
                  gender: 'male',
                  address: 'القاهرة',
                },
                medical_information: {
                  blood_type: null,
                  has_hypertension: null,
                  has_diabetes: null,
                  has_heart_disease: null,
                  has_previous_stroke: null,
                  medical_notes: null,
                },
              },
            }),
            getPatientAppointments: () => of({
              status: true,
              errNum: '0000',
              msg: 'success',
              appointments: [
                {
                  appointment_id: 99,
                  status: 'no_show',
                  payment_status: 'unpaid',
                  visit_type: 'checkup',
                  date: '2026-11-04',
                  start_time: '10:07 PM',
                  end_time: '10:09 PM',
                  duration_minutes: 2,
                  clinic_name: 'دمياط',
                  price: 200,
                  total_amount: 200,
                },
                {
                  appointment_id: 95,
                  status: 'completed',
                  payment_status: 'paid',
                  visit_type: 'consultation',
                  date: '2026-11-04',
                  start_time: '08:12 PM',
                  end_time: '08:13 PM',
                  duration_minutes: 1,
                  clinic_name: 'دمياط',
                  price: 100,
                  total_amount: 100,
                },
              ],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientProfile);
    fixture.detectChanges();
  });

  it('shows a compact appointment row and opens the remaining details in a dialog', () => {
    const text = fixture.nativeElement.textContent as string;
    const rows = fixture.nativeElement.querySelectorAll('.appointment-summary-row') as NodeListOf<HTMLElement>;

    expect(text).toContain('سجل المواعيد');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('كشف');
    expect(rows[0].textContent).toContain('04/11/2026');
    expect(rows[0].textContent).toContain('دمياط');
    expect(rows[1].textContent).toContain('استشارة');
    expect(rows[1].textContent).toContain('04/11/2026');
    expect(rows[1].textContent).toContain('دمياط');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(text).not.toContain('لم يحضر');

    const detailsButton = rows[0].querySelector('.appointment-details-button') as HTMLButtonElement;
    detailsButton.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('10:07 PM');
    expect(dialog.textContent).toContain('10:09 PM');
    expect(dialog.textContent).toContain('لم يحضر');
    expect(dialog.textContent).toContain('غير مدفوع');
    expect(dialog.textContent).toContain('200 جنيه');
    expect(dialog.textContent).toContain('دمياط');

    const closeButton = dialog.querySelector('.appointment-dialog-close') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(text).not.toContain('لا توجد مواعيد مسجلة حتى الآن.');
  });
});
