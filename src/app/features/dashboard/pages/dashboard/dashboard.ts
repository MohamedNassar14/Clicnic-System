import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import {
  APPOINTMENT_STATUS_OPTIONS,
  AppointmentsService,
  getAppointmentStatusLabel,
  VisitTypeOption,
  VisitTypesResponse,
} from '../../../appointments/services/appointments';
import { Icons } from '../../../../shared/components/icons/icons';
import {
  DashboardService,
  TodayAppointmentFilters,
  TodayAppointmentResponse,
  TodayAppointmentsResponse,
} from '../../services/dashboard';

interface TodayAppointment {
  id: number | string;
  patientName: string;
  patientPhone: string;
  patientInitials: string;
  visitType: string;
  time: string;
  clinicAddress: string;
  statusText: string;
  paymentStatusText: string;
  isPaid: boolean;
}

function readAppointments(
  response: TodayAppointmentResponse[] | TodayAppointmentsResponse,
): { items: TodayAppointmentResponse[]; currentPage: number; lastPage: number; total: number } {
  if (Array.isArray(response)) {
    return { items: response, currentPage: 1, lastPage: 1, total: response.length };
  }

  if (Array.isArray(response.appointments)) {
    return {
      items: response.appointments,
      currentPage: response.pagination?.current_page ?? 1,
      lastPage: response.pagination?.last_page ?? 1,
      total: response.pagination?.total ?? response.appointments.length,
    };
  }

  if (Array.isArray(response.data)) {
    return {
      items: response.data,
      currentPage: response.pagination?.current_page ?? 1,
      lastPage: response.pagination?.last_page ?? 1,
      total: response.pagination?.total ?? response.data.length,
    };
  }

  return {
    items: response.data?.data ?? [],
    currentPage: response.pagination?.current_page ?? 1,
    lastPage: response.pagination?.last_page ?? 1,
    total: response.pagination?.total ?? response.data?.data?.length ?? 0,
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

@Component({
  selector: 'app-dashboard',
  imports: [DatePickerModule, FormsModule, Icons, RouterLink, SelectModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly appointmentsService = inject(AppointmentsService);

  readonly todayAppointments = signal<TodayAppointment[]>([]);
  readonly visibleAppointments = computed(() => {
    const searchValue = this.searchValue().trim().toLocaleLowerCase();
    if (!searchValue) {
      return this.todayAppointments();
    }

    return this.todayAppointments().filter((appointment) =>
      [appointment.patientName, appointment.patientPhone, appointment.visitType, appointment.clinicAddress]
        .some((value) => value.toLocaleLowerCase().includes(searchValue)),
    );
  });
  readonly currentPage = signal(1);
  readonly lastPage = signal(1);
  readonly isLoadingAppointments = signal(false);
  readonly appointmentsError = signal('');
  readonly visitTypes = signal<VisitTypeOption[]>([]);
  readonly isLoadingVisitTypes = signal(false);
  readonly visitTypesError = signal('');
  readonly searchValue = signal('');
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedVisitType = signal('');
  readonly selectedStatus = signal('');
  readonly appointmentStatuses = APPOINTMENT_STATUS_OPTIONS;

  ngOnInit(): void {
    this.loadTodayAppointments();
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

  onVisitTypeChange(visitType: string | null): void {
    this.selectedVisitType.set(visitType ?? '');
    this.loadTodayAppointments();
  }

  onStatusChange(status: string | null): void {
    this.selectedStatus.set(status ?? '');
    this.loadTodayAppointments();
  }

  onDateChange(date: Date | null): void {
    this.selectedDate.set(date);
    this.loadTodayAppointments();
  }

  getSearchValue(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  resetFilter(): void {
    this.searchValue.set('');
    this.selectedDate.set(null);
    this.selectedVisitType.set('');
    this.selectedStatus.set('');
    this.loadTodayAppointments();
  }

  loadTodayAppointments(page = 1): void {
    this.isLoadingAppointments.set(true);
    this.appointmentsError.set('');
    const selectedDate = this.selectedDate();
    const filters: TodayAppointmentFilters = {
      date: selectedDate ? formatDate(selectedDate) : undefined,
      status: this.selectedStatus() || undefined,
      visit_type: this.selectedVisitType() || undefined,
    };
    this.dashboardService.getTodayAppointments(page, filters).subscribe({
      next: (response) => {
        const pageData = readAppointments(response);

        this.currentPage.set(pageData.currentPage);
        this.lastPage.set(pageData.lastPage);

        this.todayAppointments.set(pageData.items.map((appointment, index) => {
          const patientName = appointment.patient_name
            ?? appointment.patient?.name
            ?? appointment.patient?.full_name
            ?? '';
          const patientPhone = appointment.patient_phone ?? appointment.patient?.phone ?? '';
          const initials = patientName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
          const isPaid = appointment.payment_status === 'paid';
          const paymentStatusText = isPaid ? 'تم الدفع' : 'لم يتم الدفع';

          return {
            id: appointment.id ?? `${patientPhone}-${index}`,
            patientName,
            patientPhone,
            patientInitials: initials,
            visitType: appointment.visit_type_label ?? appointment.visit_type ?? '',
            time: appointment.time_slot?.start_time ?? appointment.start_time ?? '',
            statusText: getAppointmentStatusLabel(appointment.status),
            clinicAddress: appointment.time_slot?.clinic_location?.address
              ?? appointment.time_slot?.clinic_location?.name
              ?? appointment.clinic_location?.address
              ?? appointment.branch?.address
              ?? appointment.clinic_location?.name
              ?? appointment.branch?.name
              ?? appointment.clinic_location_name
              ?? 'العنوان غير متوفر',
            paymentStatusText,
            isPaid,
          };
        }));
        this.isLoadingAppointments.set(false);
      },
      error: () => {
        this.isLoadingAppointments.set(false);
        this.appointmentsError.set('تعذر تحميل حجوزات اليوم. حاول مرة أخرى.');
      },
    });
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
