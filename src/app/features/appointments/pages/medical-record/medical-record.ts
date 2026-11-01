import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AppointmentsService,
  MedicalRecordPayload,
  PrescriptionItemPayload,
  PrescriptionPayload,
} from '../../services/appointments';
import Swal from 'sweetalert2';

interface PatientNavigationState {
  patientId?: number | string;
  patientName?: string;
  patientPhone?: string;
}

interface PrescriptionDisplayItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionDisplay {
  id?: number | string;
  notes: string;
  items: PrescriptionDisplayItem[];
}

interface MedicalHistoryRecord extends MedicalRecordPayload {
  id?: number | string;
  date?: string;
  prescriptions: PrescriptionDisplay[];
}

interface MedicalHistoryResult {
  records: MedicalHistoryRecord[];
  error: string;
}

type PrescriptionItemForm = FormGroup<{
  medicine_name: FormControl<string>;
  dosage: FormControl<string>;
  frequency: FormControl<string>;
  duration: FormControl<string>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      return value.trim();
    }
  }
  return '';
}

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  return isRecord(value) ? [value] : [];
}

function sameMedicalRecordId(left: number | string | undefined, right: number | string | undefined): boolean {
  return left !== undefined && right !== undefined && String(left) === String(right);
}

const MEDICAL_RECORD_ARRAY_KEYS = [
  'medical_records',
  'diagnosis_records',
  'medical_history',
  'records',
  'diagnoses',
  'appointments',
  'history',
  'data',
];

function findMedicalRecordEntries(
  value: unknown,
  visited = new Set<object>(),
): unknown[] | null {
  if (!isRecord(value) || visited.has(value)) {
    return null;
  }
  visited.add(value);

  for (const key of MEDICAL_RECORD_ARRAY_KEYS) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  for (const key of ['history', 'data', 'patient', 'medical_history']) {
    const nestedEntries = findMedicalRecordEntries(value[key], visited);
    if (nestedEntries) {
      return nestedEntries;
    }
  }

  return null;
}

export function readMedicalHistory(response: unknown): MedicalHistoryResult {
  if (!isRecord(response) && !Array.isArray(response)) {
    return { records: [], error: 'تعذر قراءة سجل التشخيصات من الخادم.' };
  }

  if (isRecord(response) && response['status'] === false) {
    const message = typeof response['msg'] === 'string' ? response['msg'] : '';
    return { records: [], error: message || 'تعذر تحميل سجل التشخيصات السابقة.' };
  }

  const entries = Array.isArray(response)
    ? response
    : findMedicalRecordEntries(response);
  if (!entries) {
    return { records: [], error: 'تنسيق سجل التشخيصات المستلم غير معروف.' };
  }

  return { records: readMedicalHistoryRecords(entries), error: '' };
}

function readMedicalHistoryRecords(entries: unknown[]): MedicalHistoryRecord[] {
  return entries.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    const nestedRecords = entry['medical_records'] ?? entry['records'];
    if (Array.isArray(nestedRecords)) {
      return nestedRecords.flatMap((nestedRecord, nestedIndex) =>
        isRecord(nestedRecord) ? [toMedicalHistoryRecord(nestedRecord)] : [],
      );
    }

    const nestedRecord = entry['medical_record'];
    if (isRecord(nestedRecord)) {
      return [toMedicalHistoryRecord(nestedRecord)];
    }

    return [toMedicalHistoryRecord(entry)];
  });
}

function toMedicalHistoryRecord(record: Record<string, unknown>): MedicalHistoryRecord {
  const id = record['id'];
  const recordType = readString(record, 'record_type', 'visit_type', 'type');
  const prescriptions = readArray(record['prescriptions'])
    .flatMap((prescription) => {
      if (!isRecord(prescription)) {
        return [];
      }

      const prescriptionId = prescription['id'];
      const items = readArray(prescription['items'])
        .flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }
          return [{
            medicine_name: readString(item, 'medicine_name'),
            dosage: readString(item, 'dosage'),
            frequency: readString(item, 'frequency'),
            duration: readString(item, 'duration'),
          }];
        });

      return [{
        ...(typeof prescriptionId === 'string' || typeof prescriptionId === 'number'
          ? { id: prescriptionId }
          : {}),
        notes: readString(prescription, 'notes'),
        items,
      }];
    });

  return {
    ...(typeof id === 'string' || typeof id === 'number' ? { id } : {}),
    record_type: recordType || 'checkup',
    diagnosis: readString(record, 'diagnosis', 'name'),
    treatment: readString(record, 'treatment', 'plan'),
    notes: readString(record, 'notes', 'medical_notes'),
    date: readString(record, 'date', 'created_at', 'visit_date'),
    prescriptions,
  };
}

@Component({
  selector: 'app-medical-record',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './medical-record.html',
  styleUrl: './medical-record.scss',
})
export class MedicalRecord implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly appointmentId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly patientState = this.readPatientState();
  readonly patientId = this.route.snapshot.queryParamMap.get('patientId') ?? this.patientState.patientId;
  readonly patientName = this.patientState.patientName ?? 'المريض';
  readonly patientPhone = this.patientState.patientPhone ?? '';
  readonly isDiagnosisPopupOpen = signal(false);
  readonly isPrescriptionPopupOpen = signal(false);
  readonly isMedicalFilePopupOpen = signal(false);
  readonly medicalFileCategory = signal<'radiology' | 'analysis'>('radiology');
  readonly selectedMedicalFile = signal<File | null>(null);
  readonly selectedMedicalFileRecord = signal<MedicalHistoryRecord | null>(null);
  readonly isUploadingMedicalFile = signal(false);
  readonly medicalFileError = signal('');
  readonly medicalFileSuccess = signal('');
  readonly isLoadingHistory = signal(true);
  readonly historyError = signal('');
  readonly isSaving = signal(false);
  readonly isSavingPrescription = signal(false);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly prescriptionError = signal('');
  readonly prescriptionSuccess = signal('');
  readonly selectedPrescriptionRecord = signal<MedicalHistoryRecord | null>(null);
  readonly medicalRecords = signal<MedicalHistoryRecord[]>([]);
  readonly isFinishingAppointment = signal(false);
  readonly finishAppointmentError = signal('');

  readonly diagnosisForm = this.formBuilder.nonNullable.group({
    record_type: ['checkup', Validators.required],
    diagnosis: ['', Validators.required],
    treatment: ['', Validators.required],
    notes: [''],
  });

  readonly prescriptionForm = new FormGroup({
    notes: new FormControl('', { nonNullable: true }),
    items: new FormArray<PrescriptionItemForm>([this.createPrescriptionItemForm()]),
  });

  ngOnInit(): void {
    this.loadPatientHistory();
  }

  loadPatientHistory(): void {
    if (!this.patientId) {
      this.medicalRecords.set([]);
      this.historyError.set('رقم المريض غير متوفر، لا يمكن تحميل التشخيصات السابقة.');
      this.isLoadingHistory.set(false);
      return;
    }

    this.isLoadingHistory.set(true);
    this.historyError.set('');
    this.appointmentsService.getPatientHistory(this.patientId).subscribe({
      next: (response) => {
        const history = readMedicalHistory(response);
        this.medicalRecords.set(history.records);
        this.historyError.set(history.error);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.medicalRecords.set([]);
        this.historyError.set('تعذر تحميل التشخيصات السابقة. تحقق من اتصالك وحاول مرة أخرى.');
        this.isLoadingHistory.set(false);
      },
    });
  }

  openDiagnosisPopup(): void {
    this.saveError.set('');
    this.saveSuccess.set('');
    this.isDiagnosisPopupOpen.set(true);
  }

  closeDiagnosisPopup(): void {
    if (!this.isSaving()) {
      this.isDiagnosisPopupOpen.set(false);
    }
  }

  saveDiagnosis(): void {
    if (this.diagnosisForm.invalid || this.isSaving()) {
      this.diagnosisForm.markAllAsTouched();
      return;
    }

    if (!this.appointmentId) {
      this.saveError.set('رقم الموعد غير متوفر، لا يمكن حفظ التشخيص.');
      return;
    }

    const payload = this.diagnosisForm.getRawValue();
    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    this.appointmentsService.createMedicalRecord(this.appointmentId, payload).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (response.status === false) {
          this.saveError.set(response.msg || 'تعذر حفظ التشخيص.');
          return;
        }

        const medicalRecordId = this.readMedicalRecordId(response);
        this.medicalRecords.update((records) => [
          {
            ...payload,
            ...(medicalRecordId === null ? {} : { id: medicalRecordId }),
            prescriptions: [],
          },
          ...records,
        ]);
        this.isDiagnosisPopupOpen.set(false);
        this.diagnosisForm.reset();
        this.loadPatientHistory();
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('تعذر حفظ التشخيص. حاول مرة أخرى.');
      },
    });
  }

  get prescriptionItems(): FormArray<PrescriptionItemForm> {
    return this.prescriptionForm.controls.items;
  }

  openPrescriptionPopup(record: MedicalHistoryRecord): void {
    if (record.id === undefined) {
      this.prescriptionError.set('معرّف التشخيص غير متوفر، لا يمكن إضافة روشتة.');
      return;
    }

    this.selectedPrescriptionRecord.set(record);
    this.prescriptionError.set('');
    this.prescriptionSuccess.set('');
    this.prescriptionForm.reset({ notes: '' });
    this.prescriptionItems.clear();
    this.prescriptionItems.push(this.createPrescriptionItemForm());
    this.isPrescriptionPopupOpen.set(true);
  }

  closePrescriptionPopup(): void {
    if (this.isSavingPrescription()) {
      return;
    }

    this.isPrescriptionPopupOpen.set(false);
    this.prescriptionError.set('');
    this.selectedPrescriptionRecord.set(null);
  }

  onRecordActionClick(event: MouseEvent, record: MedicalHistoryRecord): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[data-record-action="upload-medical-file"]')) {
      this.openMedicalFilePopup(record);
    }
  }

  openMedicalFilePopup(record: MedicalHistoryRecord): void {
    this.selectedMedicalFileRecord.set(record);
    this.selectedMedicalFile.set(null);
    this.medicalFileCategory.set('radiology');
    this.medicalFileError.set(
      record.id === undefined ? 'معرّف التشخيص غير متوفر، لا يمكن رفع الملف.' : '',
    );
    this.medicalFileSuccess.set('');
    this.isMedicalFilePopupOpen.set(true);
  }

  closeMedicalFilePopup(): void {
    if (this.isUploadingMedicalFile()) {
      return;
    }

    this.isMedicalFilePopupOpen.set(false);
    this.selectedMedicalFile.set(null);
    this.selectedMedicalFileRecord.set(null);
    this.medicalFileError.set('');
  }

  onMedicalFileSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.selectedMedicalFile.set(input.files?.[0] ?? null);
    this.medicalFileError.set('');
  }

  uploadMedicalFile(): void {
    const record = this.selectedMedicalFileRecord();
    const file = this.selectedMedicalFile();
    if (!record || record.id === undefined || !file || this.isUploadingMedicalFile()) {
      return;
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('category', this.medicalFileCategory());

    this.isUploadingMedicalFile.set(true);
    this.medicalFileError.set('');
    this.appointmentsService.uploadMedicalRecordAttachment(record.id, payload).subscribe({
      next: (response) => {
        this.isUploadingMedicalFile.set(false);
        if (isRecord(response) && response['status'] === false) {
          this.medicalFileError.set(
            typeof response['msg'] === 'string' && response['msg']
              ? response['msg']
              : 'تعذر رفع الملف.',
          );
          return;
        }

        this.medicalFileSuccess.set('تم رفع الملف بنجاح.');
        this.closeMedicalFilePopup();
      },
      error: () => {
        this.isUploadingMedicalFile.set(false);
        this.medicalFileError.set('تعذر رفع الملف. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  addPrescriptionItem(): void {
    this.prescriptionItems.push(this.createPrescriptionItemForm());
  }

  removePrescriptionItem(index: number): void {
    if (this.prescriptionItems.length > 1) {
      this.prescriptionItems.removeAt(index);
    }
  }

  savePrescription(): void {
    const record = this.selectedPrescriptionRecord();
    if (!record || record.id === undefined) {
      this.prescriptionError.set('معرّف التشخيص غير متوفر، لا يمكن إضافة روشتة.');
      return;
    }

    if (this.prescriptionForm.invalid || this.isSavingPrescription()) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const formValue = this.prescriptionForm.getRawValue();
    const payload: PrescriptionPayload = {
      notes: formValue.notes.trim(),
      items: formValue.items.map((item): PrescriptionItemPayload => ({
        medicine_name: item.medicine_name.trim(),
        dosage: item.dosage.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
      })),
    };

    this.isSavingPrescription.set(true);
    this.prescriptionError.set('');
    this.appointmentsService.createPrescription(record.id, payload).subscribe({
      next: (response) => {
        this.isSavingPrescription.set(false);
        if (isRecord(response) && response['status'] === false) {
          this.prescriptionError.set(
            typeof response['msg'] === 'string' && response['msg']
              ? response['msg']
              : 'تعذر حفظ الروشتة.',
          );
          return;
        }

        const responseRecords = readMedicalHistory(response).records;
        const updatedRecord = responseRecords.find(
          (historyRecord) => sameMedicalRecordId(historyRecord.id, record.id),
        );
        if (updatedRecord?.prescriptions.length) {
          this.medicalRecords.update((records) => records.map((historyRecord) =>
            sameMedicalRecordId(historyRecord.id, record.id)
              ? { ...historyRecord, ...updatedRecord }
              : historyRecord,
          ));
        } else {
          this.medicalRecords.update((records) => records.map((historyRecord) =>
            sameMedicalRecordId(historyRecord.id, record.id)
              ? {
                ...historyRecord,
                prescriptions: [{
                  notes: payload.notes,
                  items: payload.items,
                }],
              }
              : historyRecord,
          ));
        }

        this.isPrescriptionPopupOpen.set(false);
        this.selectedPrescriptionRecord.set(null);
        this.prescriptionSuccess.set('تم حفظ الروشتة بنجاح.');
      },
      error: () => {
        this.isSavingPrescription.set(false);
        this.prescriptionError.set('تعذر حفظ الروشتة. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  private createPrescriptionItemForm(): PrescriptionItemForm {
    return new FormGroup({
      medicine_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      dosage: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      frequency: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      duration: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    });
  }

  private readMedicalRecordId(response: unknown): number | string | null {
    const candidates: unknown[] = [];
    if (isRecord(response)) {
      candidates.push(response['id']);
      candidates.push(response['medical_record_id']);
      for (const key of ['data', 'medical_record', 'record']) {
        const value = response[key];
        if (isRecord(value)) {
          candidates.push(value['id']);
          candidates.push(value['medical_record_id']);
          for (const nestedKey of ['medical_record', 'record']) {
            const nestedValue = value[nestedKey];
            if (isRecord(nestedValue)) {
              candidates.push(nestedValue['id']);
            }
          }
        }
      }
    }

    const id = candidates.find((candidate) =>
      typeof candidate === 'number' || (typeof candidate === 'string' && candidate.trim().length > 0),
    );
    return typeof id === 'number' || typeof id === 'string' ? id : null;
  }

  private readPatientState(): PatientNavigationState {
    const state: unknown = this.router.getCurrentNavigation()?.extras.state;
    if (typeof state !== 'object' || state === null) {
      return {};
    }

    return {
      patientId: 'patientId' in state
        && (typeof state.patientId === 'string' || typeof state.patientId === 'number')
        ? state.patientId
        : undefined,
      patientName: 'patientName' in state && typeof state.patientName === 'string'
        ? state.patientName
        : undefined,
      patientPhone: 'patientPhone' in state && typeof state.patientPhone === 'string'
        ? state.patientPhone
        : undefined,
    };
  }

  finishAppointment(): void {
    if (!this.appointmentId || this.isFinishingAppointment()) {
      return;
    }

    const id = Number(this.appointmentId);

    if (!Number.isInteger(id) || id <= 0) {
      this.finishAppointmentError.set('رقم الزيارة غير صحيح.');
      return;
    }

    this.isFinishingAppointment.set(true);
    this.finishAppointmentError.set('');

    this.appointmentsService.completeAppointment(id).subscribe({
      next: () => {
        this.isFinishingAppointment.set(false);

        Swal.fire({
          html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div>
              <svg width="75" height="75" viewBox="0 0 113 113"
                fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="56.5" cy="56.5" r="51.5"
                  stroke="#009917" stroke-width="10" />
                <path fill-rule="evenodd" clip-rule="evenodd"
                  d="M26.8863 57.7045C25.7046 58.8707 25.7046 60.7628 26.8863 61.9289L43.299 78.1254C44.4807 79.2915 46.3981 79.2915 47.5798 78.1254L86.113 40.1C87.2957 38.9328 87.2957 37.0417 86.113 35.8746C84.9313 34.7085 83.0139 34.7085 81.8322 35.8746L45.4394 71.7878L31.1681 57.7035C29.9854 56.5374 28.069 56.5374 26.8863 57.7045Z"
                  fill="#009917" />
              </svg>
            </div>
            <h2 style="margin-top: 16px; font-size: 20px; font-weight: bold;">
              تم إنهاء الزيارة بنجاح
            </h2>
          </div>
        `,
          confirmButtonColor: '#1aaa55',
          confirmButtonText: 'يمكنك المتابعة',
          customClass: {
            confirmButton: 'custom-confirm-btn',
            popup: 'custom-swal-popup',
            htmlContainer: 'custom-text',
          },
        }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/admin/dashboard']);
            }
          });
      },

      error: (error) => {
        console.error('Finish appointment error:', error);

        this.isFinishingAppointment.set(false);
        this.finishAppointmentError.set('تعذر إنهاء الزيارة. حاول مرة أخرى.');
      },
    });
  }
}
