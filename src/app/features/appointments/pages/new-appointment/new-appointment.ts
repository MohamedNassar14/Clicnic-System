import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import {
  AppointmentsService,
  AppointmentTimeSlot,
  AppointmentTimeSlotsResponse,
  ClinicLocationOption,
  ClinicLocationsResponse,
  ExistingWalkInAppointmentPayload,
  NewWalkInAppointmentPayload,
  VisitTypeOption,
  VisitTypesResponse,
} from '../../services/appointments';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
function readClinicLocations(
  response: ClinicLocationOption[] | ClinicLocationsResponse,
): ClinicLocationOption[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.clinic_locations ?? response.data ?? [];
}

function readTimeSlots(
  response: AppointmentTimeSlot[] | AppointmentTimeSlotsResponse,
): AppointmentTimeSlot[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.time_slots ?? response.data ?? [];
}

function readVisitTypes(response: VisitTypeOption[] | VisitTypesResponse): VisitTypeOption[] {
  const visitTypes = Array.isArray(response)
    ? response
    : response.visit_types ?? response.data ?? [];

  return visitTypes.flatMap((visitType) => {
    if (!visitType.key) {
      return [];
    }

    return [{
      ...visitType,
      key: visitType.key,
      label: visitType.label ?? visitType.name ?? visitType.key,
    }];
  });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AppointmentTimeOption extends AppointmentTimeSlot {
  label: string;
}

function readPatientId(response: unknown): number | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const result = response as Record<string, unknown>;
  const id = result['patient_id'] ?? result['id'];
  if (typeof id === 'number' && Number.isInteger(id)) {
    return id;
  }
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return Number(id);
  }

  for (const key of ['patient', 'data', 'result', 'patients']) {
    const nested = result[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const nestedId = readPatientId(item);
        if (nestedId !== null) {
          return nestedId;
        }
      }
    } else {
      const nestedId = readPatientId(nested);
      if (nestedId !== null) {
        return nestedId;
      }
    }
  }

  return null;
}

@Component({
  selector: 'app-new-appointment',
  imports: [DatePickerModule, FormsModule, RouterLink, SelectModule],
  templateUrl: './new-appointment.html',
  styleUrl: './new-appointment.scss',
})
export class NewAppointment implements OnInit {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly existingPhoneChanges = new Subject<string>();

  activeTab: 'existing' | 'new' = 'existing';
  readonly locations = signal<ClinicLocationOption[]>([]);
  readonly isLoadingLocations = signal(false);
  readonly locationsError = signal('');
  readonly today = new Date();
  readonly selectedClinicLocationId = signal<number | null>(null);
  readonly selectedAppointmentDate = signal<Date | null>(null);
  readonly availableTimeSlots = signal<AppointmentTimeOption[]>([]);
  readonly selectedTimeSlotId = signal<number | string | null>(null);
  readonly isLoadingTimeSlots = signal(false);
  readonly timeSlotsError = signal('');
  readonly timeSlotIdForPayload = computed(() => this.selectedTimeSlotId());
  readonly visitTypes = signal<VisitTypeOption[]>([]);
  readonly isLoadingVisitTypes = signal(false);
  readonly visitTypesError = signal('');
  readonly bookingError = signal('');
  readonly bookingSuccess = signal('');
  readonly isSavingBooking = signal(false);
  readonly existingPatientId = signal<number | null>(null);
  readonly isSearchingPatient = signal(false);
  readonly patientSearchError = signal('');
  private router = inject(Router);
  existingPhone = '';
  name = '';
  phone = '';
  date_of_birth: Date | null = null;
  gender: 'male' | 'female' | '' = '';
  address = '';
  selectedVisitTypeKey = '';

    allGender = [
    { id: 'male', name: 'ذكر' },
    { id: 'female', name: 'أنثى' },  
  ];

  ngOnInit(): void {
    this.loadClinicLocations();
    this.loadVisitTypes();
    this.existingPhoneChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((phone) => {
        if (phone.length < 7) {
          return of({ phone, patientId: null, failed: false });
        }

        return this.appointmentsService.searchPatientByPhone(phone).pipe(
          map((response) => ({ phone, patientId: readPatientId(response), failed: false })),
          catchError(() => of({ phone, patientId: null, failed: true })),
        );
      }),
    ).subscribe(({ phone, patientId, failed }) => {
      if (phone !== this.existingPhone.trim()) {
        return;
      }

      this.isSearchingPatient.set(false);
      this.existingPatientId.set(patientId);
      this.patientSearchError.set(
        failed ? 'تعذر البحث عن المريض. حاول مرة أخرى.' : patientId === null && phone.length >= 7
          ? 'لم يتم العثور على مريض بهذا الرقم.'
          : '',
      );
    });
  }

  loadClinicLocations(): void {
    this.isLoadingLocations.set(true);
    this.locationsError.set('');
    this.appointmentsService.getClinicLocations().subscribe({
      next: (response) => {
        this.locations.set(readClinicLocations(response));
        this.isLoadingLocations.set(false);
      },
      error: () => {
        this.isLoadingLocations.set(false);
        this.locationsError.set('تعذر تحميل الفروع. حاول مرة أخرى.');
      },
    });
  }

  selectTab(tab: 'existing' | 'new'): void {
    this.activeTab = tab;
  }

  onClinicLocationChange(locationId: number | string | null): void {
    const parsedId = locationId === null ? null : Number(locationId);
    this.selectedClinicLocationId.set(parsedId && Number.isFinite(parsedId) ? parsedId : null);
    this.loadAvailableTimeSlots();
  }

  onAppointmentDateChange(date: Date | null): void {
    this.selectedAppointmentDate.set(date);
    this.loadAvailableTimeSlots();
  }

  onTimeSlotChange(timeSlotId: number | string | null): void {
    this.selectedTimeSlotId.set(timeSlotId);
  }

  onExistingPhoneChange(phone: string): void {
    this.existingPhone = phone;
    this.existingPatientId.set(null);
    this.patientSearchError.set('');
    const query = phone.trim();
    this.isSearchingPatient.set(query.length >= 7);
    this.existingPhoneChanges.next(query);
  }

  loadVisitTypes(): void {
    this.isLoadingVisitTypes.set(true);
    this.visitTypesError.set('');
    this.appointmentsService.getVisitTypes().subscribe({
      next: (response) => {
        console.log('Visit types response:', response);
        this.visitTypes.set(readVisitTypes(response));
        this.isLoadingVisitTypes.set(false);
      },
      error: () => {
        this.isLoadingVisitTypes.set(false);
        this.visitTypesError.set('تعذر تحميل أنواع الزيارة. حاول مرة أخرى.');
      },
    });
  }

  submitBooking(): void {
    console.log('Submitting booking with the following details:');
    this.bookingError.set('');
    this.bookingSuccess.set('');

    if (this.activeTab === 'existing') {
      const patientId = this.existingPatientId();
      const timeSlotId = Number(this.selectedTimeSlotId());
      if (!patientId || !Number.isInteger(timeSlotId) || !this.selectedVisitTypeKey) {
        this.bookingError.set('أدخل رقم مريض موجود واختر الفرع والتاريخ والوقت ونوع الزيارة.');
        return;
      }

      const payload: ExistingWalkInAppointmentPayload = {
        patient_id: patientId,
        time_slot_id: timeSlotId,
        visit_type: this.selectedVisitTypeKey,
        pay_method: 'cash',
      };

      this.isSavingBooking.set(true);
      this.appointmentsService.createExistingPatientAppointment(payload).subscribe({
        next: () => {
          this.isSavingBooking.set(false);
          Swal.fire({
            title: 'تم الحجز بنجاح!',
            text: 'تم تأكيد حجز موعدك بنجاح. تقدر تتابع تفاصيل الحجز من لوحة التحكم.',
            icon: 'success',
            confirmButtonText: 'الذهاب إلى لوحة التحكم',
            confirmButtonColor: '#1A5CFF',
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup: 'clinic-swal-popup',
              confirmButton: 'clinic-swal-button'
            }
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/dashboard']);
            }
          });
        },
        error: () => {
          this.isSavingBooking.set(false);
          this.bookingError.set('تعذر حجز الموعد. حاول مرة أخرى.');
        },
      });
      return;
    }

    const timeSlotId = Number(this.selectedTimeSlotId());
    if (
      !this.name.trim()
      || !this.phone.trim()
      || !this.date_of_birth
      || !this.gender
      || !this.address.trim()
      || !Number.isInteger(timeSlotId)
      || !this.selectedVisitTypeKey
    ) {
      this.bookingError.set('أكمل بيانات المريض واختر الفرع والتاريخ والوقت ونوع الزيارة.');
      return;
    }

    const payload: NewWalkInAppointmentPayload = {
      name: this.name.trim(),
      phone: this.phone.trim(),
      date_of_birth: formatDate(this.date_of_birth),
      gender: this.gender,
      address: this.address.trim(),
      time_slot_id: timeSlotId,
      visit_type: this.selectedVisitTypeKey,
    };

    this.isSavingBooking.set(true);
    this.appointmentsService.createNewPatientAppointment(payload).subscribe({
      next: () => {
        this.isSavingBooking.set(false);
        Swal.fire({
          title: 'تم الحجز بنجاح!',
          text: 'تم تأكيد حجز موعدك بنجاح. تقدر تتابع تفاصيل الحجز من لوحة التحكم.',
          icon: 'success',
          confirmButtonText: 'الذهاب إلى لوحة التحكم',
          confirmButtonColor: '#1A5CFF',
          allowOutsideClick: false,
          allowEscapeKey: false,
          customClass: {
            popup: 'clinic-swal-popup',
            confirmButton: 'clinic-swal-button'
          }
        }).then((result) => {
          if (result.isConfirmed) {
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: () => {
        this.isSavingBooking.set(false);
        this.bookingError.set('تعذر حجز الموعد. حاول مرة أخرى.');
      },
    });
  }

  private loadAvailableTimeSlots(): void {
    const clinicLocationId = this.selectedClinicLocationId();
    const appointmentDate = this.selectedAppointmentDate();
    this.availableTimeSlots.set([]);
    this.selectedTimeSlotId.set(null);
    this.timeSlotsError.set('');

    if (!clinicLocationId || !appointmentDate) {
      this.isLoadingTimeSlots.set(false);
      return;
    }

    this.isLoadingTimeSlots.set(true);
    this.appointmentsService.getTimeSlots(clinicLocationId, formatDate(appointmentDate)).subscribe({
      next: (response) => {
        this.availableTimeSlots.set(readTimeSlots(response).map((slot) => {
          const times = [slot.start_time, slot.end_time].filter(
            (time): time is string => typeof time === 'string' && time.length > 0,
          );

          return {
            ...slot,
            label: times.join(' - ') || 'وقت غير محدد',
          };
        }));
        this.isLoadingTimeSlots.set(false);
      },
      error: () => {
        this.isLoadingTimeSlots.set(false);
        this.timeSlotsError.set('تعذر تحميل الأوقات المتاحة. حاول مرة أخرى.');
      },
    });
  }
}