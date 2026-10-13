import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AppointmentListItem,
  AppointmentListResponse,
  AppointmentsService,
} from '../../services/appointments';

interface AppointmentCard {
  id: number | string;
  patientName: string;
  patientInitials: string;
  patientPhone: string;
  visitType: string;
  time: string;
  clinicAddress: string;
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

@Component({
  selector: 'app-appointments',
  imports: [RouterLink],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
})
export class Appointments implements OnInit {
  private readonly appointmentsService = inject(AppointmentsService);

  readonly appointments = signal<AppointmentCard[]>([]);
  readonly totalAppointments = signal(0);
  readonly currentPage = signal(1);
  readonly lastPage = signal(1);
  readonly isLoading = signal(false);
  readonly loadError = signal('');

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(page = 1): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.appointmentsService.getAppointments(page).subscribe({
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
            isPaid: appointment.payment_status === 'paid',
          };
        });

        this.currentPage.set(page);
        this.lastPage.set(response && typeof response === 'object' && 'pagination' in response && response.pagination
          ? response.pagination.last_page ?? 1
          : 1);
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
