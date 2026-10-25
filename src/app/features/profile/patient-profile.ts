import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientProfile as PatientProfileData, PatientProfileService } from './patient-profile.service';

interface DiagnosisHistoryRecord {
  id: string | number;
  type: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  date: string;
}

interface DiagnosisHistory {
  records: DiagnosisHistoryRecord[];
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
): DiagnosisHistoryRecord | null {
  const diagnosis = readString(record, 'diagnosis') || (parent ? readString(parent, 'diagnosis') : '');
  if (!diagnosis) {
    return null;
  }

  const id = record['id'] ?? parent?.['id'] ?? diagnosis;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : diagnosis,
    type: readString(record, 'record_type', 'type') || (parent ? readString(parent, 'visit_type') : ''),
    diagnosis,
    treatment: readString(record, 'treatment') || (parent ? readString(parent, 'treatment') : ''),
    notes: readString(record, 'notes', 'medical_notes') || (parent ? readString(parent, 'notes') : ''),
    date: readHistoryDate(record, parent),
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

  const records: DiagnosisHistoryRecord[] = [];
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
  readonly diagnosisHistory = signal<DiagnosisHistoryRecord[]>([]);
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

  formatGender(gender: string): string {
    return gender === 'male' ? 'ذكر' : gender === 'female' ? 'أنثى' : gender;
  }

  formatYesNo(value: boolean | null): string {
    return value === null ? 'غير محدد' : value ? 'نعم' : 'لا';
  }
}
