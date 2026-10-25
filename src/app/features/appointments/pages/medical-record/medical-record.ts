import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AppointmentsService,
  MedicalRecordPayload,
} from '../../services/appointments';

interface PatientNavigationState {
  patientName?: string;
  patientPhone?: string;
}

@Component({
  selector: 'app-medical-record',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './medical-record.html',
  styleUrl: './medical-record.scss',
})
export class MedicalRecord {
  private readonly formBuilder = inject(FormBuilder);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly appointmentId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly patientState = this.readPatientState();
  readonly patientName = this.patientState.patientName ?? 'المريض';
  readonly patientPhone = this.patientState.patientPhone ?? '';
  readonly isDiagnosisPopupOpen = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly medicalRecords = signal<MedicalRecordPayload[]>([]);

  readonly diagnosisForm = this.formBuilder.nonNullable.group({
    record_type: ['checkup', Validators.required],
    diagnosis: ['', Validators.required],
    treatment: ['', Validators.required],
    notes: [''],
  });

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

        this.medicalRecords.update((records) => [payload, ...records]);
        this.saveSuccess.set(response.msg || 'تم حفظ التشخيص بنجاح.');
        this.isDiagnosisPopupOpen.set(false);
        this.diagnosisForm.reset();
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('تعذر حفظ التشخيص. حاول مرة أخرى.');
      },
    });
  }

  private readPatientState(): PatientNavigationState {
    const state: unknown = this.router.getCurrentNavigation()?.extras.state;
    if (typeof state !== 'object' || state === null) {
      return {};
    }

    return {
      patientName: 'patientName' in state && typeof state.patientName === 'string'
        ? state.patientName
        : undefined,
      patientPhone: 'patientPhone' in state && typeof state.patientPhone === 'string'
        ? state.patientPhone
        : undefined,
    };
  }
}
