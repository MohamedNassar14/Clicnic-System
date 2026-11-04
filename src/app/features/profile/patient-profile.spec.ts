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

  it('displays the appointment fields returned by the patient appointments API', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('سجل المواعيد');
    expect(text).toContain('04/11/2026');
    expect(text).toContain('كشف');
    expect(text).toContain('استشارة');
    expect(text).toContain('لم يحضر');
    expect(text).toContain('مكتمل');
    expect(text).toContain('غير مدفوع');
    expect(text).toContain('مدفوع');
    expect(text).toContain('10:07 PM');
    expect(text).toContain('10:09 PM');
    expect(text).toContain('دمياط');
    expect(text).toContain('200 جنيه');
    expect(text).toContain('100 جنيه');
    expect(text).not.toContain('لا توجد مواعيد مسجلة حتى الآن.');
  });
});
