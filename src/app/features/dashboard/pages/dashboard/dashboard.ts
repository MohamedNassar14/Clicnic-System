import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule } from 'primeng/paginator';
import { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import {
  APPOINTMENT_STATUS_OPTIONS,
  AppointmentsService,
  getAppointmentStatusLabel,
  VisitTypeOption,
  VisitTypesResponse,
} from '../../../appointments/services/appointments';
import { Icons } from '../../../../shared/components/icons/icons';
import { Auth } from '../../../auth/services/auth';
import {
  DashboardService,
  DoctorCurrentAppointmentResponse,
  TodayAppointmentFilters,
  TodayAppointmentResponse,
  TodayAppointmentsResponse,
  TodayStats,
} from '../../services/dashboard';

interface TodayAppointment {
  id: number | string;
  appointmentId?: number | string;
  patientName: string;
  patientPhone: string;
  patientInitials: string;
  visitType: string;
  time: string;
  clinicAddress: string;
  status: string | undefined;
  statusText: string;
  paymentStatusText: string;
  isPaid: boolean;
}

function readAppointments(
  response: TodayAppointmentResponse[] | TodayAppointmentsResponse,
): { items: TodayAppointmentResponse[]; currentPage?: number; perPage?: number; total: number } {
  if (Array.isArray(response)) {
    return { items: response, currentPage: 1, total: response.length };
  }

  if (Array.isArray(response.appointments)) {
    return {
      items: response.appointments,
      currentPage: response.pagination?.current_page ?? 1,
      perPage: response.pagination?.per_page,
      total: response.pagination?.total ?? response.appointments.length,
    };
  }

  if (Array.isArray(response.data)) {
    return {
      items: response.data,
      currentPage: response.pagination?.current_page ?? 1,
      perPage: response.pagination?.per_page,
      total: response.pagination?.total ?? response.data.length,
    };
  }

  return {
    items: response.data?.data ?? [],
    currentPage: response.pagination?.current_page ?? 1,
    perPage: response.pagination?.per_page,
    total: response.pagination?.total ?? response.total ?? response.data?.total
      ?? response.data?.data?.length ?? 0,
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

function toTodayAppointment(appointment: TodayAppointmentResponse, index: number): TodayAppointment {
  const patientName = appointment.patient_name
    ?? appointment.patient?.name
    ?? appointment.patient?.full_name
    ?? '';
  const patientPhone = appointment.patient_phone ?? appointment.patient?.phone ?? '';
  const isPaid = appointment.payment_status === 'paid';

  return {
    id: appointment.id ?? appointment.appointment_id ?? `${patientPhone}-${index}`,
    appointmentId: appointment.id ?? appointment.appointment_id,
    patientName,
    patientPhone,
    patientInitials: patientName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join(''),
    visitType: appointment.visit_type_label ?? appointment.visit_type ?? '',
    time: appointment.time_slot?.start_time ?? appointment.start_time ?? '',
    status: appointment.status,
    statusText: getAppointmentStatusLabel(appointment.status),
    clinicAddress: appointment.time_slot?.clinic_location?.address
      ?? appointment.time_slot?.clinic_location?.name
      ?? appointment.clinic_location?.address
      ?? appointment.branch?.address
      ?? appointment.clinic_location?.name
      ?? appointment.branch?.name
      ?? appointment.clinic_location_name
      ?? 'العنوان غير متوفر',
    paymentStatusText: isPaid ? 'تم الدفع' : 'لم يتم الدفع',
    isPaid,
  };
}

function readCurrentAppointment(
  response: DoctorCurrentAppointmentResponse,
): TodayAppointmentResponse | null {
  const data = response.data;

  if (data && 'current_appointment' in data) {
    return data.current_appointment ?? data.appointment ?? data.data ?? null;
  }

  if (data && 'appointment' in data) {
    return data.appointment ?? null;
  }

  if (data && 'data' in data) {
    return data.data ?? null;
  }

  if (data && (
    'id' in data ||
    'patient_name' in data ||
    'patient' in data ||
    'start_time' in data ||
    'time_slot' in data
  )) {
    return data;
  }

  return response.current_appointment ?? response.appointment ?? null;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePickerModule, DecimalPipe, FormsModule, Icons, PaginatorModule, RouterLink, SelectModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly auth = inject(Auth);

  readonly isDoctor = this.auth.getUserRole() === '2';
  readonly currentUser = this.auth.getCurrentUser();
  readonly todayStats = signal<TodayStats | null>(null);
  readonly isLoadingTodayStats = signal(false);
  readonly todayStatsError = signal('');
  readonly todayAppointments = signal<TodayAppointment[]>([]);
  readonly currentDoctorAppointment = signal<TodayAppointment | null>(null);
  readonly isLoadingCurrentAppointment = signal(false);
  readonly currentAppointmentError = signal('');
  readonly doctorDate = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  readonly remainingDoctorAppointments = computed(() => {
    const currentAppointment = this.currentDoctorAppointment();

    return this.todayAppointments().filter((appointment) => {
      const isCurrentAppointment = currentAppointment?.appointmentId !== undefined
        ? appointment.appointmentId === currentAppointment.appointmentId
        : Boolean(
          currentAppointment?.patientName &&
          currentAppointment.patientName === appointment.patientName &&
          currentAppointment.time === appointment.time,
        );

      return !isCurrentAppointment &&
        appointment.status !== 'in_progress' &&
        appointment.status !== 'completed' &&
        appointment.status !== 'cancelled' &&
        appointment.status !== 'no_show';
    });
  });
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
  readonly first = signal(0);
  readonly rows = signal(5);
  readonly totalTodayAppointments = signal(0);
  readonly isLoadingAppointments = signal(false);
  readonly settingCurrentAppointmentId = signal<string | null>(null);
  readonly setCurrentError = signal('');
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
    if (this.isDoctor) {
      this.loadCurrentAppointment();
      this.loadTodayAppointments(1, 50);
      return;
    }

    this.loadTodayStats();
    this.loadTodayAppointments();
    this.loadVisitTypes();
  }

  loadCurrentAppointment(): void {
    this.isLoadingCurrentAppointment.set(true);
    this.currentAppointmentError.set('');
    this.dashboardService.getDoctorCurrentAppointment().subscribe({
      next: (response) => {
        this.isLoadingCurrentAppointment.set(false);
        if (response.status === false) {
          this.currentDoctorAppointment.set(null);
          this.currentAppointmentError.set(response.msg || 'تعذر تحميل الموعد الحالي.');
          return;
        }

        const appointment = readCurrentAppointment(response);
        this.currentDoctorAppointment.set(appointment ? toTodayAppointment(appointment, 0) : null);
      },
      error: () => {
        this.isLoadingCurrentAppointment.set(false);
        this.currentDoctorAppointment.set(null);
        this.currentAppointmentError.set('تعذر تحميل الموعد الحالي. حاول مرة أخرى.');
      },
    });
  }

  loadTodayStats(): void {
    this.isLoadingTodayStats.set(true);
    this.todayStatsError.set('');
    this.dashboardService.getTodayStats().subscribe({
      next: (response) => {
        this.isLoadingTodayStats.set(false);
        if (!response.status) {
          this.todayStats.set(null);
          this.todayStatsError.set(response.msg || 'تعذر تحميل إحصائيات اليوم.');
          return;
        }

        this.todayStats.set(response.today_stats);
      },
      error: () => {
        this.isLoadingTodayStats.set(false);
        this.todayStats.set(null);
        this.todayStatsError.set('تعذر تحميل إحصائيات اليوم. حاول مرة أخرى.');
      },
    });
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
    this.first.set(0);
    this.loadTodayAppointments(1);
  }

  onStatusChange(status: string | null): void {
    this.selectedStatus.set(status ?? '');
    this.first.set(0);
    this.loadTodayAppointments(1);
  }

  onDateChange(date: Date | null): void {
    this.selectedDate.set(date);
    this.first.set(0);
    this.loadTodayAppointments(1);
  }

  getSearchValue(event: Event): void {
    this.searchValue.set((event.target as HTMLInputElement).value);
  }

  resetFilter(): void {
    this.searchValue.set('');
    this.selectedDate.set(null);
    this.selectedVisitType.set('');
    this.selectedStatus.set('');
    this.first.set(0);
    this.loadTodayAppointments(1);
  }

  onAppointmentsPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.rows();
    const first = event.first ?? 0;
    this.first.set(first);
    this.rows.set(rows);
    this.loadTodayAppointments((event.page ?? Math.floor(first / rows)) + 1, rows);
  }

  setCurrentAppointment(appointment: TodayAppointment): void {
    if (appointment.appointmentId === undefined || this.settingCurrentAppointmentId()) {
      return;
    }

    this.settingCurrentAppointmentId.set(String(appointment.appointmentId));
    this.setCurrentError.set('');
    this.appointmentsService.setAppointmentCurrent(appointment.appointmentId).subscribe({
      next: () => {
        this.todayAppointments.update((appointments) => appointments.map((item) =>
          item.id === appointment.id
            ? { ...item, status: 'in_progress', statusText: getAppointmentStatusLabel('in_progress') }
            : item,
        ));
        this.settingCurrentAppointmentId.set(null);
      },
      error: () => {
        this.settingCurrentAppointmentId.set(null);
        this.setCurrentError.set('تعذر تحديد الحجز الحالي. حاول مرة أخرى.');
      },
    });
  }

  loadTodayAppointments(page = 1, perPage = this.rows()): void {
    this.isLoadingAppointments.set(true);
    this.appointmentsError.set('');
    const selectedDate = this.selectedDate();
    const filters: TodayAppointmentFilters = {
      date: selectedDate ? formatDate(selectedDate) : undefined,
      status: this.selectedStatus() || undefined,
      visit_type: this.selectedVisitType() || undefined,
    };
    this.dashboardService.getTodayAppointments(page, filters, perPage).subscribe({
      next: (response) => {
        const pageData = readAppointments(response);

        const currentPage = pageData.currentPage ?? page;
        const rows = pageData.perPage ?? perPage;
        this.currentPage.set(currentPage);
        this.rows.set(rows);
        this.first.set((currentPage - 1) * rows);
        this.totalTodayAppointments.set(pageData.total);

        this.todayAppointments.set(pageData.items.map(toTodayAppointment));
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
