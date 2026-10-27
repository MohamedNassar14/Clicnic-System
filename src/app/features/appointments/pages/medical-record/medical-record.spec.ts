import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { readMedicalHistory } from './medical-record';
import { MedicalRecord } from './medical-record';
import { AppointmentsService } from '../../services/appointments';
import { environment } from '../../../../../environments/environment';

describe('AppointmentsService medical record', () => {
  let service: AppointmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideZonelessChangeDetection(), AppointmentsService],
    });

    service = TestBed.inject(AppointmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('saves a medical record for the selected appointment', () => {
    const payload = {
      record_type: 'checkup',
      diagnosis: 'التهاب في الحلق',
      treatment: 'مضاد حيوي لمدة 5 أيام',
      notes: 'المريضة تحسنت عن الزيارة اللي فاتت',
    };

    service.createMedicalRecord(1, payload).subscribe();

    const request = httpMock.expectOne(`${environment.url}doctor/appointments/1/medical-record`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ status: true, msg: 'Saved' });
  });

  it('loads previous history for the selected patient', () => {
    service.getPatientHistory(3).subscribe();

    const request = httpMock.expectOne(`${environment.url}doctor/patients/3/history`);
    expect(request.request.method).toBe('GET');
    request.flush({ status: true, data: [] });
  });

  it('creates a prescription for the selected medical record', () => {
    const payload = {
      notes: 'يفضل شرب سوائل دافئة',
      items: [
        {
          medicine_name: 'Augmentin 1g',
          dosage: 'قرص واحد',
          frequency: 'مرتين يوميًا',
          duration: '5 أيام',
        },
      ],
    };

    service.createPrescription(1, payload).subscribe();

    const request = httpMock.expectOne(
      `${environment.url}doctor/medical-records/1/prescription`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ status: true, msg: 'Saved' });
  });
});

describe('readMedicalHistory', () => {
  it('reads prescriptions nested under history.medical_records', () => {
    const result = readMedicalHistory({
      status: true,
      errNum: '0000',
      msg: 'success',
      history: {
        medical_records: [
          {
            id: 4,
            appointment_id: 45,
            patient_id: 35,
            record_type: 'checkup',
            diagnosis: 'التهاب في الحلق',
            treatment: 'نام كويس',
            notes: 'يرتاح',
            prescriptions: [
              {
                id: 5,
                medical_record_id: 4,
                patient_id: 35,
                notes: 'يفضل شرب سوائل دافئة',
                items: [
                  {
                    id: 2,
                    prescription_id: 5,
                    medicine_name: 'Augmentin 1g',
                    dosage: 'قرص واحد',
                    frequency: 'مرتين يوميًا',
                    duration: '5 أيام',
                  },
                ],
              },
            ],
            attachments: [],
          },
        ],
      },
    });

    expect(result.error).toBe('');
    expect(result.records.length).toBe(1);
    expect(result.records[0].prescriptions.length).toBe(1);
    expect(result.records[0].prescriptions[0].items[0]).toEqual({
      medicine_name: 'Augmentin 1g',
      dosage: 'قرص واحد',
      frequency: 'مرتين يوميًا',
      duration: '5 أيام',
    });
  });

  describe('MedicalRecord prescription display', () => {
    let fixture: ComponentFixture<MedicalRecord>;

    beforeEach(async () => {
      const historyResponse = {
        status: true,
        errNum: '0000',
        msg: 'success',
        history: {
          medical_records: [
            {
              id: 4,
              record_type: 'checkup',
              diagnosis: 'التهاب في الحلق',
              treatment: 'نام كويس',
              notes: 'يرتاح',
              prescriptions: [
                {
                  id: 5,
                  notes: 'يفضل شرب سوائل دافئة',
                  items: [
                    {
                      medicine_name: 'Augmentin 1g',
                      dosage: 'قرص واحد',
                      frequency: 'مرتين يوميًا',
                      duration: '5 أيام',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const prescriptionResponse = {
        status: true,
        errNum: '0000',
        msg: 'success',
        history: {
          medical_records: [
            {
              id: 4,
              record_type: 'checkup',
              diagnosis: 'التهاب في الحلق',
              treatment: 'نام كويس',
              notes: 'يرتاح',
              prescriptions: [
                {
                  id: 5,
                  notes: 'يفضل شرب سوائل دافئة',
                  items: [
                    {
                      medicine_name: 'Augmentin 1g',
                      dosage: 'قرص واحد',
                      frequency: 'مرتين يوميًا',
                      duration: '5 أيام',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      await TestBed.configureTestingModule({
        imports: [MedicalRecord],
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([]),
          {
            provide: AppointmentsService,
            useValue: {
              getPatientHistory: () => of(historyResponse),
              createPrescription: () => of(prescriptionResponse),
            },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                paramMap: convertToParamMap({ id: '45' }),
                queryParamMap: convertToParamMap({ patientId: '35' }),
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(MedicalRecord);
      fixture.detectChanges();
    });

    it('renders the prescription returned by the save request and hides its button', () => {
      const component = fixture.componentInstance;
      component.medicalRecords.set([{
        id: '4',
        record_type: 'checkup',
        diagnosis: 'التهاب في الحلق',
        treatment: 'نام كويس',
        notes: 'يرتاح',
        prescriptions: [],
      }]);
      component.openPrescriptionPopup(component.medicalRecords()[0]);
      component.prescriptionItems.at(0).setValue({
        medicine_name: 'Augmentin 1g',
        dosage: 'قرص واحد',
        frequency: 'مرتين يوميًا',
        duration: '5 أيام',
      });
      component.savePrescription();
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).map((button) => button.textContent?.trim() ?? '');

      expect(text).toContain('Augmentin 1g');
      expect(text).toContain('قرص واحد');
      expect(text).toContain('مرتين يوميًا');
      expect(text).toContain('5 أيام');
      expect(text).toContain('يفضل شرب سوائل دافئة');
      expect(buttons.some((label) => label.includes('إضافة روشتة'))).toBeFalse();
    });

    it('shows returned prescription items and hides the add-prescription button', () => {
      const text = fixture.nativeElement.textContent as string;
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).map((button) => button.textContent?.trim() ?? '');

      expect(text).toContain('Augmentin 1g');
      expect(text).toContain('قرص واحد');
      expect(text).toContain('مرتين يوميًا');
      expect(text).toContain('5 أيام');
      expect(text).toContain('يفضل شرب سوائل دافئة');
      expect(buttons.some((label) => label.includes('إضافة روشتة'))).toBeFalse();
    });
  });
});
