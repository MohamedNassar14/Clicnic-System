import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DashboardService,
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
  branchName: string;
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

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly todayAppointments = signal<TodayAppointment[]>([]);
  readonly currentPage = signal(1);
  readonly lastPage = signal(1);
  readonly isLoadingAppointments = signal(false);
  readonly appointmentsError = signal('');

  ngOnInit(): void {
    this.loadTodayAppointments();
  }

  loadTodayAppointments(page = 1): void {
    this.isLoadingAppointments.set(true);
    this.appointmentsError.set('');
    this.dashboardService.getTodayAppointments(page).subscribe({
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
          const isPaid = appointment.status === 'confirmed' || appointment.payment_status === 'paid';
          const paymentStatusText = isPaid ? 'تم الدفع' : 'لم يتم الدفع';

          return {
            id: appointment.id ?? `${patientPhone}-${index}`,
            patientName,
            patientPhone,
            patientInitials: initials,
            visitType: appointment.visit_type_label ?? appointment.visit_type ?? '',
            time: appointment.time_slot?.start_time ?? appointment.start_time ?? '',
            branchName: appointment.clinic_location?.name
              ?? appointment.branch?.name
              ?? appointment.clinic_location_name
              ?? '',
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
