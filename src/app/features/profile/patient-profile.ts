import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientProfile as PatientProfileData, PatientProfileService } from './patient-profile.service';

interface PatientAppointmentRecord {
  id: string | number;
  type: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  clinicName: string;
  status: string;
  paymentStatus: string;
  durationMinutes: number | null;
  price: number | null;
  totalAmount: number | null;
}

interface DiagnosisHistory {
  records: PatientAppointmentRecord[];
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readHistoryDate(record: Record<string, unknown>, parent?: Record<string, unknown>): string {
  const directDate = readString(record, 'date', 'created_at', 'visit_date', 'start_time');
  if (directDate) {
    return directDate;
  }

  const parentDate = parent ? readString(parent, 'date', 'created_at', 'visit_date', 'start_time') : '';
  if (parentDate) {
    return parentDate;
  }

  for (const candidate of [record['time_slot'], parent?.['time_slot']]) {
    if (isRecord(candidate)) {
      const timeSlotDate = readString(candidate, 'start_time', 'date');
      if (timeSlotDate) {
        return timeSlotDate;
      }
    }
  }

  return '';
}

function toDiagnosisRecord(
  record: Record<string, unknown>,
  parent?: Record<string, unknown>,
): PatientAppointmentRecord | null {
  const diagnosis = readString(record, 'diagnosis') || (parent ? readString(parent, 'diagnosis') : '');
  const date = readHistoryDate(record, parent);
  const startTime = readString(record, 'start_time') || (parent ? readString(parent, 'start_time') : '');
  const endTime = readString(record, 'end_time') || (parent ? readString(parent, 'end_time') : '');
  const clinicName = readString(record, 'clinic_name') || (parent ? readString(parent, 'clinic_name') : '');
  const status = readString(record, 'status') || (parent ? readString(parent, 'status') : '');
  const paymentStatus = readString(record, 'payment_status')
    || (parent ? readString(parent, 'payment_status') : '');
  const durationMinutes = readNumber(record, 'duration_minutes')
    ?? (parent ? readNumber(parent, 'duration_minutes') : null);
  const price = readNumber(record, 'price') ?? (parent ? readNumber(parent, 'price') : null);
  const totalAmount = readNumber(record, 'total_amount')
    ?? (parent ? readNumber(parent, 'total_amount') : null);
  const type = readString(record, 'record_type', 'type')
    || (parent ? readString(parent, 'visit_type') : '')
    || readString(record, 'visit_type');

  if (
    !diagnosis &&
    !date &&
    !startTime &&
    !endTime &&
    !clinicName &&
    !status &&
    !paymentStatus &&
    !type &&
    durationMinutes === null &&
    price === null &&
    totalAmount === null
  ) {
    return null;
  }

  const id = record['appointment_id'] ?? record['id'] ?? parent?.['appointment_id'] ?? parent?.['id']
    ?? diagnosis
    ?? `${date}-${startTime}`;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : diagnosis,
    type,
    diagnosis,
    treatment: readString(record, 'treatment') || (parent ? readString(parent, 'treatment') : ''),
    notes: readString(record, 'notes', 'medical_notes') || (parent ? readString(parent, 'notes') : ''),
    date,
    startTime,
    endTime,
    clinicName,
    status,
    paymentStatus,
    durationMinutes,
    price,
    totalAmount,
  };
}

function readDiagnosisHistory(response: unknown): DiagnosisHistory {
  if (!isRecord(response)) {
    return { records: [], error: 'تعذر قراءة سجل التشخيص من الخادم.' };
  }

  if (response['status'] === false) {
    const message = typeof response['msg'] === 'string' ? response['msg'] : '';
    return { records: [], error: message || 'تعذر تحميل سجل التشخيص.' };
  }

  const data = response['data'];
  const containers = [response, ...(isRecord(data) ? [data] : [])];
  let entries: unknown[] | null = null;

  if (Array.isArray(data)) {
    entries = data;
  } else {
    for (const container of containers) {
      for (const key of ['appointments', 'medical_records', 'records', 'history']) {
        const value = container[key];
        if (Array.isArray(value)) {
          entries = value;
          break;
        }
      }
      if (entries) {
        break;
      }
    }
  }

  if (!entries) {
    return { records: [], error: 'تنسيق سجل التشخيص المستلم غير معروف.' };
  }

  const records: PatientAppointmentRecord[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
    }

    const medicalRecords = entry['medical_records'];
    if (Array.isArray(medicalRecords)) {
      for (const medicalRecord of medicalRecords) {
        if (isRecord(medicalRecord)) {
          const record = toDiagnosisRecord(medicalRecord, entry);
          if (record) {
            records.push(record);
          }
        }
      }
      continue;
    }

    const medicalRecord = entry['medical_record'];
    if (isRecord(medicalRecord)) {
      const record = toDiagnosisRecord(medicalRecord, entry);
      if (record) {
        records.push(record);
      }
      continue;
    }

    const record = toDiagnosisRecord(entry);
    if (record) {
      records.push(record);
    }
  }

  return { records, error: '' };
}

@Component({
  selector: 'app-patient-profile',
  imports: [RouterLink],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss',
})
export class PatientProfile implements OnInit {
  private readonly profileService = inject(PatientProfileService);

  readonly profile = signal<PatientProfileData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly diagnosisHistory = signal<PatientAppointmentRecord[]>([]);
  readonly isLoadingDiagnosisHistory = signal(true);
  readonly diagnosisHistoryError = signal('');

  ngOnInit(): void {
    this.loadProfile();
    this.loadDiagnosisHistory();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.profileService.getPatientProfile().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (!response.status) {
          this.profile.set(null);
          this.errorMessage.set(response.msg || 'تعذر تحميل بيانات الملف الشخصي.');
          return;
        }

        this.profile.set(response.profile);
      },
      error: () => {
        this.isLoading.set(false);
        this.profile.set(null);
        this.errorMessage.set('تعذر تحميل بيانات الملف الشخصي. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  loadDiagnosisHistory(): void {
    this.isLoadingDiagnosisHistory.set(true);
    this.diagnosisHistoryError.set('');

    this.profileService.getPatientAppointments().subscribe({
      next: (response) => {
        const history = readDiagnosisHistory(response);
        this.diagnosisHistory.set(history.records);
        this.diagnosisHistoryError.set(history.error);
        this.isLoadingDiagnosisHistory.set(false);
      },
      error: () => {
        this.isLoadingDiagnosisHistory.set(false);
        this.diagnosisHistory.set([]);
        this.diagnosisHistoryError.set('تعذر تحميل سجل التشخيص. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  formatDate(date: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
  }

  formatDateTime(date: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
  }

  formatVisitType(type: string): string {
    switch (type.trim().toLocaleLowerCase()) {
      case 'checkup':
        return 'كشف';
      case 'consultation':
      case 'consulatation':
        return 'استشارة';
      default:
        return type;
    }
  }

  formatAppointmentStatus(status: string): string {
    switch (status) {
      case 'no_show':
        return 'لم يحضر';
      case 'completed':
        return 'مكتمل';
      case 'confirmed':
        return 'تم الحجز';
      case 'in_progress':
        return 'قيد الكشف';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  }

  formatPaymentStatus(status: string): string {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'unpaid':
        return 'غير مدفوع';
      default:
        return status;
    }
  }

  formatGender(gender: string): string {
    return gender === 'male' ? 'ذكر' : gender === 'female' ? 'أنثى' : gender;
  }

  formatYesNo(value: boolean | null): string {
    return value === null ? 'غير محدد' : value ? 'نعم' : 'لا';
  }
}
