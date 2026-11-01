import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { forkJoin, map } from 'rxjs';
import {
  AppointmentsService,
  AppointmentTimeSlot,
  AppointmentTimeSlotsResponse,
} from '../../../appointments/services/appointments';
import {
  ClinicLocationOption,
  CollectionResponse,
  CreateTimeSlotPayload,
  TimeSlot,
  TimeSlotsService,
} from '../../services/time-slots';
import Swal from 'sweetalert2';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readCollection<T>(
  response: T[] | CollectionResponse<T>,
  key: 'clinic_locations' | 'time_slots',
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response[key] ?? response.data ?? [];
}

interface ScheduledTimeSlot extends TimeSlot {
  clinicLocationName: string;
  date: string;
  status: 'booked' | 'available';
}
@Component({
  selector: 'app-weekly-schedule',
  imports: [DatePickerModule, DialogModule, ReactiveFormsModule, SelectModule],
  templateUrl: './weekly-schedule.html',
  styleUrl: './weekly-schedule.scss',
})
export class WeeklySchedule implements OnInit {
  private readonly timeSlotsService = inject(TimeSlotsService);
  private readonly appointmentsService = inject(AppointmentsService);

  readonly today = startOfDay(new Date());
  private readonly activeDate = signal(startOfDay(new Date()));
  readonly locations = signal<ClinicLocationOption[]>([]);
  readonly slotsByDate = signal<Record<string, ScheduledTimeSlot[]>>({});
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDialogVisible = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');

  readonly slotForm = new FormGroup({
    clinicLocationId: new FormControl<number | null>(null, Validators.required),
    date: new FormControl<Date | null>(startOfDay(new Date()), Validators.required),
    startTime: new FormControl<Date | null>(null, Validators.required),
    endTime: new FormControl<Date | null>(null, Validators.required),
  });

  readonly monthLabel = computed(() =>
    this.activeDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private timeToMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  readonly weekDays = computed(() => {
    const weekStart = new Date(this.activeDate());
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const today = new Date().toDateString();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      return {
        index,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        dateKey: formatDate(date),
        isToday: date.toDateString() === today,
        isPast: startOfDay(date) < this.today,
      };
    });
  });

  readonly canGoToPreviousWeek = computed(() => {
    const weekStart = this.getWeekStart(this.activeDate());
    return weekStart > this.getWeekStart(this.today);
  });

  ngOnInit(): void {
    this.loadLocations();
  }

  slotsForDay(date: string): ScheduledTimeSlot[] {
    return this.slotsByDate()[date] ?? [];
  }

  shiftWeek(amount: number): void {
    const nextDate = new Date(this.activeDate());
    nextDate.setDate(nextDate.getDate() + amount * 7);
    if (this.getWeekStart(nextDate) < this.getWeekStart(this.today)) {
      return;
    }

    this.activeDate.set(nextDate);
    this.loadTimeSlots();
  }

  goToToday(): void {
    this.activeDate.set(this.today);
    this.loadTimeSlots();
  }


  isSlotExpired(slot: ScheduledTimeSlot): boolean {
    const slotDateTime = new Date(`${slot.date}T${this.normalizeTime(slot.start_time)}`);
    return slotDateTime < new Date();
  }

  private normalizeTime(time: string): string {
    // لو الوقت جاي بصيغة 12:00 ص أو 12:00 م
    const isPM = time.includes('م');
    const isAM = time.includes('ص');

    let [hours, minutes] = time.replace(/[صم]/g, '').trim().split(':').map(Number);

    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }

  openCreateDialog(): void {
    this.saveError.set('');
    this.slotForm.reset({
      clinicLocationId: this.slotForm.controls.clinicLocationId.value ?? this.locations()[0]?.id ?? null,
      date: this.activeDate() < this.today ? this.today : this.activeDate(),
      startTime: null,
      endTime: null,
    });
    this.isDialogVisible.set(true);
  }

  createTimeSlot(): void {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    const value = this.slotForm.getRawValue();

    if (
      !value.clinicLocationId ||
      !value.date ||
      !value.startTime ||
      !value.endTime ||
      formatDate(value.date) < formatDate(this.today)
    ) {
      this.slotForm.markAllAsTouched();
      return;
    }

    // Compare start and end times
    if (this.timeToMinutes(value.endTime) <= this.timeToMinutes(value.startTime)) {
      this.saveError.set('وقت النهاية يجب أن يكون بعد وقت البداية.');
      return;
    }

    const payload: CreateTimeSlotPayload = {
      clinic_location_id: value.clinicLocationId,
      date: formatDate(value.date),
      start_time: this.formatTime(value.startTime),
      end_time: this.formatTime(value.endTime),
    };

    this.isSaving.set(true);
    this.saveError.set('');

    this.timeSlotsService.createTimeSlot(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isDialogVisible.set(false);
        this.activeDate.set(value.date!);
        this.loadTimeSlots();
        Swal.fire({
          html: `
            <div style="display: flex; flex-direction: column; align-items: center;"><div>
           <svg width="75" height="75" viewBox="0 0 113 113" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="56.5" cy="56.5" r="51.5" stroke="#009917" stroke-width="10" />
            <path fill-rule="evenodd" clip-rule="evenodd"
            d="M26.8863 57.7045C25.7046 58.8707 25.7046 60.7628 26.8863 61.9289L43.299 78.1254C44.4807 79.2915 46.3981 79.2915 47.5798 78.1254L86.113 40.1C87.2957 38.9328 87.2957 37.0417 86.113 35.8746C84.9313 34.7085 83.0139 34.7085 81.8322 35.8746L45.4394 71.7878L31.1681 57.7035C29.9854 56.5374 28.069 56.5374 26.8863 57.7045Z"
            fill="#009917" />
           </svg>
                           </div>
                           <h2 style="margin-top: 16px; font-size: 20px; font-weight: bold;">تم إضافة الموعد بنجاح</h2>
                          </div>
                          `,
          confirmButtonColor: '#1aaa55',
          confirmButtonText: 'يمكنك المتابعة',
          customClass: {
            confirmButton: 'custom-confirm-btn',
            popup: 'custom-swal-popup',
            htmlContainer: 'custom-text',
          },
          showCloseButton: false,
          showCancelButton: false,
        })

      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set('تعذر إضافة الموعد. حاول مرة أخرى.');
      },
    });
  }

  loadLocations(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.timeSlotsService.getClinicLocations().subscribe({
      next: (response) => {
        const locations = readCollection(response, 'clinic_locations');
        this.locations.set(locations);
        this.slotForm.controls.clinicLocationId.setValue(locations[0]?.id ?? null);
        this.isLoading.set(false);
        this.loadTimeSlots();
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('تعذر تحميل الفروع. حاول مرة أخرى.');
      },
    });
  }
  private loadTimeSlots(): void {
    const locations = this.locations();

    if (locations.length === 0) {
      this.slotsByDate.set({});
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    const requests = locations.map(location =>
      this.appointmentsService.getBranchTimeSlots(location.id).pipe(
        map(response => ({
          locationName: location.name,
          slots: this.readAppointmentTimeSlots(response),
        }))
      )
    );

    forkJoin(requests).subscribe({
      next: results => {
        const groupedSlots: Record<string, ScheduledTimeSlot[]> = {};

        results.forEach(({ locationName, slots }) => {
          slots.forEach(slot => {
            const dateKey = slot.date;

            if (!dateKey) return;

            if (!groupedSlots[dateKey]) {
              groupedSlots[dateKey] = [];
            }

            groupedSlots[dateKey].push({
              id: slot.id,
              date: dateKey,
              start_time: slot.start_time,
              end_time: slot.end_time ?? undefined,
              clinicLocationName: locationName,
              status: slot.status,
            });
          });
        });

        // ترتيب المواعيد داخل كل يوم
        Object.values(groupedSlots).forEach(daySlots => {
          daySlots.sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
          );
        });

        this.slotsByDate.set(groupedSlots);
        this.isLoading.set(false);
      },

      error: () => {
        this.isLoading.set(false);
        this.loadError.set('تعذر تحميل المواعيد. حاول مرة أخرى.');
      },
    });
  }

  private readAppointmentTimeSlots(
    response: AppointmentTimeSlot[] | AppointmentTimeSlotsResponse,
  ): (AppointmentTimeSlot & { start_time: string })[] {
    const slots = Array.isArray(response)
      ? response
      : response.time_slots ?? response.data ?? [];

    return slots.filter(
      (slot): slot is AppointmentTimeSlot & { start_time: string } =>
        !!slot.date && slot.start_time !== null && slot.start_time !== ''
    );
  }

  private getWeekStart(date: Date): Date {
    const weekStart = startOfDay(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
  }
}
