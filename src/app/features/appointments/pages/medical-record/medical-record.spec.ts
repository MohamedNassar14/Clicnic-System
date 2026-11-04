import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { readMedicalHistory } from './medical-record';
import { MedicalRecord } from './medical-record';
import { AppointmentsService } from '../../services/appointments';
import { environment } from '../../../../../environments/environment';
import { DashboardService } from '../../../dashboard/services/dashboard';

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

  it('searches medicines with the typed query', () => {
    service.searchMedicines('بنادول').subscribe();

    const request = httpMock.expectOne(
      `${environment.url}doctor/medicines/search?q=%D8%A8%D9%86%D8%A7%D8%AF%D9%88%D9%84`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      status: true,
      medicines: [{
        id: 1,
        commercial_name_ar: 'بنادول',
        commercial_name_en: 'Panadol',
        scientific_name: 'Paracetamol',
        price_egp: '1.00',
      }],
    });
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

  it('uploads an attachment to the selected medical record', () => {
    const payload = new FormData();
    payload.append('file', new File(['scan'], 'scan.png', { type: 'image/png' }));
    payload.append('type', 'xray');

    service.uploadMedicalRecordAttachment(4, payload).subscribe();

    const request = httpMock.expectOne(
      `${environment.url}doctor/medical-records/4/attachments`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBe(payload);
    expect(payload.get('type')).toBe('xray');
    expect((payload.get('file') as File).name).toBe('scan.png');
    request.flush({ status: true, msg: 'Uploaded' });
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
            attachments: [{
              id: 2,
              type: 'xray',
              file_path: 'medical-attachments/scan.png',
              original_name: 'scan.png',
            }],
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
    expect(result.records[0].attachments).toEqual([{
      id: 2,
      typeLabel: 'أشعة',
      originalName: 'scan.png',
      url: `${new URL(environment.url).origin}/storage/medical-attachments/scan.png`,
    }]);
  });

  describe('MedicalRecord prescription display', () => {
    let fixture: ComponentFixture<MedicalRecord>;
    let getPatientHistory: jasmine.Spy;
    let getDoctorCurrentAppointment: jasmine.Spy;
    let searchMedicines: jasmine.Spy;
    const uploadMedicalRecordAttachment = jasmine.createSpy()
      .and.returnValue(of({ status: true, msg: 'Uploaded' }));

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
              attachments: [{
                id: 2,
                type: 'xray',
                file_path: 'medical-attachments/scan.png',
                original_name: 'scan.png',
              }],
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
      getPatientHistory = jasmine.createSpy().and.returnValue(of(historyResponse));
      getDoctorCurrentAppointment = jasmine.createSpy().and.returnValue(of({
        status: true,
        data: { visit_type: 'consultation' },
      }));
      searchMedicines = jasmine.createSpy().and.returnValue(of({
        status: true,
        medicines: [{
          id: 12,
          commercial_name_ar: 'بنادول',
          commercial_name_en: 'Panadol',
          scientific_name: 'Paracetamol',
          price_egp: '1.00',
        }],
      }));

      await TestBed.configureTestingModule({
        imports: [MedicalRecord],
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([]),
          {
            provide: AppointmentsService,
            useValue: {
              getPatientHistory,
              searchMedicines,
              createPrescription: () => of(prescriptionResponse),
              uploadMedicalRecordAttachment,
            },
          },
          {
            provide: DashboardService,
            useValue: { getDoctorCurrentAppointment },
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

    it('shows the visit type from the current appointment', () => {
      expect(getDoctorCurrentAppointment).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.currentVisitType()).toBe('استشارة');
    });

    it('renders the saved prescription and keeps the add-prescription button visible', () => {
      const component = fixture.componentInstance;
      component.medicalRecords.set([{
        id: '4',
        record_type: 'checkup',
        diagnosis: 'التهاب في الحلق',
        treatment: 'نام كويس',
        notes: 'يرتاح',
        created_at: '',
        prescriptions: [],
        attachments: [],
      }]);
      component.openPrescriptionPopup(component.medicalRecords()[0]);
      const item = component.prescriptionItems.at(0);
      component.selectMedicine(item, { id: 5, name: 'Augmentin 1g' });
      item.patchValue({
        frequency: 'مرتين يوميًا',
        duration: '5 أيام',
      });
      expect(item.contains('dosage')).toBeFalse();
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
      expect(buttons.some((label) => label.includes('إضافة روشتة'))).toBeTrue();
      expect(getPatientHistory).toHaveBeenCalledTimes(2);
    });

    it('searches and lets the doctor select a medicine suggestion', async () => {
      const component = fixture.componentInstance;
      component.openPrescriptionPopup({
        id: 4,
        record_type: 'checkup',
        diagnosis: 'التهاب في الحلق',
        treatment: '',
        notes: '',
        created_at: '',
        prescriptions: [],
        attachments: [],
      });
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector(
        'input[formControlName="medicine_name"]',
      ) as HTMLInputElement;
      input.value = 'بنادول';
      input.dispatchEvent(new Event('input'));
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();

      expect(searchMedicines).toHaveBeenCalledOnceWith('بنادول');
      const option = fixture.nativeElement.querySelector(
        '.medicine-suggestions [role="option"]',
      ) as HTMLButtonElement;
      expect(option.textContent).toContain('بنادول');
      option.click();
      fixture.detectChanges();

      expect(input.value).toBe('بنادول');
      expect(fixture.nativeElement.querySelector('.medicine-suggestions')).toBeNull();
    });

    it('shows returned prescription items and the add-prescription button', () => {
      const text = fixture.nativeElement.textContent as string;
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
      ).map((button) => button.textContent?.trim() ?? '');

      expect(text).toContain('Augmentin 1g');
      expect(text).toContain('قرص واحد');
      expect(text).toContain('مرتين يوميًا');
      expect(text).toContain('5 أيام');
      expect(text).toContain('يفضل شرب سوائل دافئة');
      expect(text).toContain('الملفات الطبية');
      expect(text).toContain('scan.png');
      const attachmentLink = fixture.nativeElement.querySelector(
        '.medical-attachment-link',
      ) as HTMLAnchorElement;
      expect(attachmentLink.href).toBe(
        `${new URL(environment.url).origin}/storage/medical-attachments/scan.png`,
      );
      expect(buttons.some((label) => label.includes('إضافة روشتة'))).toBeTrue();
    });

    it('opens the medical file popup from the upload button', () => {
      const uploadButton = Array.from(
        fixture.nativeElement.querySelectorAll('.record-action-button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('رفع أشعة أو تحاليل'));

      expect(uploadButton).toBeDefined();
      uploadButton?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('رفع ملف طبي');
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('opens the medical file popup when clicking the upload icon', () => {
      const uploadIcon = fixture.nativeElement.querySelector(
        '[data-record-action="upload-medical-file"] svg path',
      ) as SVGPathElement | null;
      expect(uploadIcon).not.toBeNull();

      uploadIcon?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('opens the medical file popup when the record has no id', () => {
      fixture.componentInstance.medicalRecords.set([{
        record_type: 'checkup',
        diagnosis: 'التهاب في الحلق',
        treatment: 'نام كويس',
        notes: '',
        created_at: '',
        prescriptions: [],
        attachments: [],
      }]);
      fixture.detectChanges();

      const uploadButton = Array.from(
        fixture.nativeElement.querySelectorAll('.record-action-button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('رفع أشعة أو تحاليل'));
      expect(uploadButton?.disabled).toBeFalse();
      uploadButton?.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        'معرّف التشخيص غير متوفر، لا يمكن رفع الملف.',
      );
    });

    it('uploads the selected file immediately as an xray attachment', () => {
      const component = fixture.componentInstance;
      const record = {
        id: 4,
        record_type: 'checkup',
        diagnosis: 'التهاب في الحلق',
        treatment: 'نام كويس',
        notes: '',
        created_at: '',
        prescriptions: [],
        attachments: [],
      };
      component.medicalRecords.set([record]);
      fixture.detectChanges();

      const uploadButton = Array.from(
        fixture.nativeElement.querySelectorAll('.record-action-button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('رفع أشعة أو تحاليل'));
      uploadButton?.click();
      fixture.detectChanges();

      const fileInput = fixture.nativeElement.querySelector(
        '#medical-file-input',
      ) as HTMLInputElement;
      const file = new File(['scan'], 'scan.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', { value: [file] });
      fileInput.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(uploadMedicalRecordAttachment).toHaveBeenCalled();
      const [recordId, payload] = uploadMedicalRecordAttachment.calls.mostRecent().args as [
        number,
        FormData,
      ];
      expect(recordId).toBe(4);
      expect(payload.get('file')).toBe(file);
      expect(payload.get('type')).toBe('xray');
      expect(fixture.nativeElement.textContent).toContain('تم رفع الملف بنجاح.');
    });
  });
});
