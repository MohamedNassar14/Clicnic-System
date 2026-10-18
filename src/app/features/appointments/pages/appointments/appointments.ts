import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import {
  APPOINTMENT_STATUS_OPTIONS,
  AppointmentListItem,
  AppointmentListResponse,
  AppointmentsService,
  getAppointmentStatusLabel,
  VisitTypeOption,
  VisitTypesResponse,
} from '../../services/appointments';
import { Icons } from '../../../../shared/components/icons/icons';

interface AppointmentCard {
  id: number | string;
  patientName: string;
  patientInitials: string;
  patientPhone: string;
  visitType: string;
  time: string;
  clinicAddress: string;
  statusText: string;
  paymentStatusText: string;
  isPaid: boolean;
}

function readAppointmentPage(response: AppointmentListItem[] | AppointmentListResponse): {
  items: AppointmentListItem[];
  total?: number;
} {
  if (Array.isArray(response)) {
    return { items: response };
  }

  if (Array.isArray(response.appointments)) {
    return { items: response.appointments, total: response.total ?? response.meta?.total };
  }

  if (Array.isArray(response.data)) {
    return { items: response.data, total: response.total ?? response.meta?.total };
  }

  return {
    items: response.data?.data ?? [],
    total: response.total ?? response.meta?.total ?? response.data?.total,
  };
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

@Component({
  selector: 'app-appointments',
  imports: [DatePickerModule, FormsModule, Icons, RouterLink, SelectModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class Appointments implements OnInit {
  private readonly appointmentsService = inject(AppointmentsService);

  readonly appointments = signal<AppointmentCard[]>([]);
  readonly visibleAppointments = computed(() => {
    const searchValue = this.searchValue().trim().toLocaleLowerCase();
    if (!searchValue) {
      return this.appointments();
    }

    return this.appointments().filter((appointment) =>
      [appointment.patientName, appointment.patientPhone, appointment.visitType, appointment.clinicAddress]
        .some((value) => value.toLocaleLowerCase().includes(searchValue)),
    );
  });
  readonly totalAppointments = signal(0);
  readonly currentPage = signal(1);
  readonly lastPage = signal(1);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly visitTypes = signal<VisitTypeOption[]>([]);
  readonly isLoadingVisitTypes = signal(false);
  readonly visitTypesError = signal('');
  readonly searchValue = signal('');
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedVisitType = signal('');
  readonly selectedStatus = signal('');
  readonly appointmentStatuses = APPOINTMENT_STATUS_OPTIONS;

  ngOnInit(): void {
    this.loadAppointments();
    this.loadVisitTypes();
  }

  loadVisitTypes(): void {
    this.isLoadingVisitTypes.set(true);
    this.visitTypesError.set('');
    this.appointmentsService.getVisitTypes().subscribe({
      next: (response) => {
        this.visitTypes.set(readVisitTypes(response));
        this.isLoadingVisitTypes.set(false);
      },
      error: () => {
        this.isLoadingVisitTypes.set(false);
        this.visitTypesError.set('تعذر تحميل أنواع الزيارة. حاول مرة أخرى.');
      },
    });
  }

  onSearchValue(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  onDateChange(date: Date | null): void {
    this.selectedDate.set(date);
    this.loadAppointments();
  }

  onVisitTypeChange(visitType: string | null): void {
    this.selectedVisitType.set(visitType ?? '');
    this.loadAppointments();
  }

  onStatusChange(status: string | null): void {
    this.selectedStatus.set(status ?? '');
    this.loadAppointments();
  }

  resetFilter(): void {
    this.searchValue.set('');
    this.selectedDate.set(null);
    this.selectedVisitType.set('');
    this.selectedStatus.set('');
    this.loadAppointments();
  }

  loadAppointments(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');
    const selectedDate = this.selectedDate();
    this.appointmentsService.getAppointments(page, {
      date: selectedDate ? formatDate(selectedDate) : undefined,
      status: this.selectedStatus() || undefined,
      visit_type: this.selectedVisitType() || undefined,
    }).subscribe({
      next: (response) => {
        const pageData = readAppointmentPage(response);
        const cards = pageData.items.map((appointment, index) => {
          const patientName = appointment.patient_name
            ?? appointment.patient?.name
            ?? appointment.patient?.full_name
            ?? '';
          const patientPhone = appointment.patient_phone ?? appointment.patient?.phone ?? '';

          return {
            id: appointment.id ?? `${patientPhone}-${index}`,
            patientName,
            patientInitials: patientName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join(''),
            patientPhone,
            visitType: appointment.visit_type_label ?? appointment.visit_type ?? '',
            time: appointment.time_slot?.start_time ?? appointment.start_time ?? '',
            clinicAddress: appointment.time_slot?.clinic_location?.address
              ?? appointment.clinic_location?.address
              ?? appointment.branch?.address
              ?? '',
            statusText: getAppointmentStatusLabel(appointment.status),
            isPaid: appointment.payment_status === 'paid',
            paymentStatusText: appointment.payment_status === 'paid' ? 'تم الدفع' : 'لم يتم الدفع',
          };
        });

        this.currentPage.set(page);
        this.lastPage.set(
          response && typeof response === 'object' && 'pagination' in response && response.pagination
            ? response.pagination.last_page ?? 1
            : 1,
        );
        this.appointments.set(cards);
        this.totalAppointments.set(pageData.total ?? cards.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('تعذر تحميل الحجوزات. حاول مرة أخرى.');
      },
    });
  }
}
