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
    startTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly monthLabel = computed(() =>
    this.activeDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

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

  openCreateDialog(): void {
    this.saveError.set('');
    this.slotForm.reset({
      clinicLocationId: this.slotForm.controls.clinicLocationId.value ?? this.locations()[0]?.id ?? null,
      date: this.activeDate() < this.today ? this.today : this.activeDate(),
      startTime: '',
      endTime: '',
    });
    this.isDialogVisible.set(true);
  }

  createTimeSlot(): void {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    const value = this.slotForm.getRawValue();
    if (!value.clinicLocationId || !value.date || formatDate(value.date) < formatDate(this.today)) {
      this.slotForm.controls.date.markAsTouched();
      return;
    }

    if (value.endTime <= value.startTime) {
      this.saveError.set('وقت النهاية يجب أن يكون بعد وقت البداية.');
      return;
    }

    const payload: CreateTimeSlotPayload = {
      clinic_location_id: value.clinicLocationId,
      date: formatDate(value.date),
      start_time: value.startTime,
      end_time: value.endTime,
    };

    this.isSaving.set(true);
    this.saveError.set('');
    this.timeSlotsService.createTimeSlot(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isDialogVisible.set(false);
        this.activeDate.set(value.date!);
        this.loadTimeSlots();
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
    const todayDate = formatDate(this.today);
    const requests = locations.map((location) =>
      this.appointmentsService.getTimeSlots(location.id, todayDate).pipe(
        map((response) => ({
          locationName: location.name,
          slots: this.readAppointmentTimeSlots(response),
        })),
      ),
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const dateSlots = results.flatMap(({ locationName, slots }) =>
          slots.map((slot) => ({
            ...slot,
            clinicLocationName: locationName,
          })),
        );
        dateSlots.sort((first, second) => first.start_time.localeCompare(second.start_time));
        this.slotsByDate.set({ [todayDate]: dateSlots });
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
  ): TimeSlot[] {
    const slots = Array.isArray(response) ? response : response.time_slots ?? response.data ?? [];
    return slots.flatMap((slot) => {
      if (!slot.start_time) {
        return [];
      }

      return [{
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time ?? undefined,
      }];
    });
  }

  private getWeekStart(date: Date): Date {
    const weekStart = startOfDay(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
  }
}
