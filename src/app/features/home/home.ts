import { Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { Auth } from '../auth/services/auth';
import {
  AppointmentsService,
  AppointmentBookingResponse,
  AppointmentTimeSlot,
  AppointmentTimeSlotsResponse,
  AppointmentPayMethod,
  ClinicLocationOption,
  ClinicLocationsResponse,
  VisitTypeOption,
  VisitTypesResponse,
} from '../appointments/services/appointments';

interface BookingTimeOption extends AppointmentTimeSlot {
  label: string;
}

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

function readVisitTypes(
  response: VisitTypeOption[] | VisitTypesResponse,
): VisitTypeOption[] {
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

function readAppointmentId(response: AppointmentBookingResponse): number | null {
  const value = response.appointment_id
    ?? response.data?.appointment_id
    ?? response.appointment?.id
    ?? response.appointment?.data?.appointment_id;
  const appointmentId = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(appointmentId) && appointmentId > 0 ? appointmentId : null;
}

function readResponseMessage(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) {
    return null;
  }

  if ('msg' in response && typeof response.msg === 'string' && response.msg.length > 0) {
    return response.msg;
  }

  if ('error' in response && typeof response.error === 'object' && response.error !== null
    && 'msg' in response.error && typeof response.error.msg === 'string'
    && response.error.msg.length > 0) {
    return response.error.msg;
  }

  return null;
}

@Component({
  selector: 'app-home',
  imports: [DatePickerModule, FormsModule, NgOptimizedImage, RouterLink],
  templateUrl: './home.html',
})
export class Home {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private timeSlotsRequestId = 0;
  private visitTypesRequestId = 0;

  readonly bookingActive = signal(false);
  readonly bookingStep = signal(1);
  readonly today = new Date();
  readonly dateOptions = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(this.today);
    date.setDate(date.getDate() + offset);
    return date;
  });
  readonly locations = signal<ClinicLocationOption[]>([]);
  readonly isLoadingLocations = signal(false);
  readonly locationsError = signal('');
  readonly selectedClinicLocationId = signal<number | null>(null);
  readonly selectedLocation = computed(
    () => this.locations().find((location) => location.id === this.selectedClinicLocationId()) ?? null,
  );
  readonly selectedDate = signal<Date | null>(null);
  readonly availableTimeSlots = signal<BookingTimeOption[]>([]);
  readonly isLoadingTimeSlots = signal(false);
  readonly timeSlotsError = signal('');
  readonly selectedTime = signal<BookingTimeOption | null>(null);
  readonly visitTypes = signal<VisitTypeOption[]>([]);
  readonly isLoadingVisitTypes = signal(false);
  readonly visitTypesError = signal('');
  readonly selectedVisitTypeKey = signal('');
  readonly selectedVisitType = computed(
    () => this.visitTypes().find((visitType) => visitType.key === this.selectedVisitTypeKey()) ?? null,
  );
  readonly selectedPaymentMethod = signal<AppointmentPayMethod | null>(null);
  readonly walletPhone = signal('');
  readonly isSubmittingPayment = signal(false);
  readonly paymentError = signal('');
  readonly paymentComplete = signal(false);
  readonly appointmentId = signal<number | null>(null);

  openBooking(event: Event): void {
    event.preventDefault();
    this.bookingActive.set(true);
    this.bookingStep.set(1);
    this.resetPaymentSubmission();
    if (this.locations().length === 0 && !this.isLoadingLocations()) {
      this.loadClinicLocations();
    }
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/auth/register');
  }

  closeBooking(): void {
    if (this.isSubmittingPayment()) {
      return;
    }

    this.bookingActive.set(false);
    this.bookingStep.set(1);
    this.resetPaymentSubmission();
  }

  loadClinicLocations(): void {
    this.isLoadingLocations.set(true);
    this.locationsError.set('');
    this.appointmentsService.getClinicLocations().subscribe({
      next: (response) => {
        if (!Array.isArray(response) && response.status === false) {
          this.locationsError.set(response.msg || 'تعذر تحميل الفروع. حاول مرة أخرى.');
          this.isLoadingLocations.set(false);
          return;
        }

        this.locations.set(readClinicLocations(response));
        this.isLoadingLocations.set(false);
      },
      error: () => {
        this.isLoadingLocations.set(false);
        this.locationsError.set('تعذر تحميل الفروع. حاول مرة أخرى.');
      },
    });
  }

  selectClinicLocation(locationId: number): void {
    this.resetPaymentSubmission();
    this.selectedClinicLocationId.set(locationId);
    this.visitTypes.set([]);
    this.selectedVisitTypeKey.set('');
    this.visitTypesError.set('');
    this.loadAvailableTimeSlots();
  }

  scrollToServices(event: Event): void {
    event.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectDate(date: Date | null): void {
    this.resetPaymentSubmission();
    this.selectedDate.set(date);
    this.loadAvailableTimeSlots();
  }

  selectTimeSlot(timeSlot: BookingTimeOption): void {
    this.resetPaymentSubmission();
    this.selectedTime.set(timeSlot);
  }

  formatDateLabel(date: Date): string {
    return date.toLocaleDateString('ar-EG', { weekday: 'long' });
  }

  isSelectedDate(date: Date): boolean {
    const selectedDate = this.selectedDate();
    return Boolean(
      selectedDate
      && selectedDate.getFullYear() === date.getFullYear()
      && selectedDate.getMonth() === date.getMonth()
      && selectedDate.getDate() === date.getDate(),
    );
  }

  selectVisitType(key: string): void {
    if (this.selectedVisitTypeKey() !== key) {
      this.resetPaymentSubmission();
    }
    this.selectedVisitTypeKey.set(key);
  }

  selectPaymentMethod(method: AppointmentPayMethod): void {
    if (this.isSubmittingPayment() || this.paymentComplete()) {
      return;
    }

    this.selectedPaymentMethod.set(method);
    this.paymentError.set('');

    if (this.appointmentId() === null) {
      this.createAppointment();
    }
  }

  confirmPayment(): void {
    console.log("Logggggggggggggggggggggggggggggggggggggg");

    const paymentMethod = this.selectedPaymentMethod();
    if (paymentMethod === null) {
      this.paymentError.set('اختر طريقة الدفع أولًا.');
      return;
    }

    const walletPhone = this.walletPhone().trim();
    if (paymentMethod === 'wallet' && !/^01[0125]\d{8}$/.test(walletPhone)) {
      this.paymentError.set('أدخل رقم موبايل صحيحًا للمحفظة، مثل 01012345678.');
      return;
    }

    const appointmentId = this.appointmentId();
    if (appointmentId === null) {
      this.paymentError.set(this.isSubmittingPayment()
        ? 'جارٍ إنشاء الحجز، انتظر اكتمال الطلب ثم حاول مرة أخرى.'
        : 'لم يصل رقم الحجز من الخادم. حاول إعادة اختيار طريقة الدفع.');
      return;
    }

    console.log("id", appointmentId);
    console.log("paymentMethod", paymentMethod);
    this.paymentError.set('');
    this.submitPayment(appointmentId, paymentMethod, walletPhone);
  }

  retryPayment(): void {
    this.confirmPayment();
  }

  private createAppointment(): void {
    if (this.isSubmittingPayment() || this.appointmentId() !== null) {
      return;
    }

    const selectedTime = this.selectedTime();
    const visitType = this.selectedVisitType();
    const timeSlotId = Number(selectedTime?.id);
    if (!Number.isSafeInteger(timeSlotId) || timeSlotId <= 0 || !visitType?.key) {
      this.paymentError.set('تعذر بدء الحجز. تحقق من اختيار الموعد ونوع الزيارة ثم حاول مرة أخرى.');
      return;
    }

    this.isSubmittingPayment.set(true);
    this.appointmentsService.createAppointment({
      time_slot_id: timeSlotId,
      visit_type: visitType.key,
    }).subscribe({
      next: (response) => {
        if (response.status === false) {
          this.isSubmittingPayment.set(false);
          this.paymentError.set(readResponseMessage(response) || 'تعذر إنشاء الحجز. حاول مرة أخرى.');
          return;
        }

        const appointmentId = readAppointmentId(response);
        if (appointmentId === null) {
          this.isSubmittingPayment.set(false);
          this.paymentError.set('تم إنشاء رد الحجز لكن لم يتم العثور على رقم الموعد فيه.');
          return;
        }

        this.appointmentId.set(appointmentId);
        this.isSubmittingPayment.set(false);
      },
      error: (error: unknown) => {
        this.isSubmittingPayment.set(false);
        this.paymentError.set(readResponseMessage(error) || 'تعذر إنشاء الحجز. حاول مرة أخرى.');
      },
    });
  }

  formatVisitTypePrice(visitType: VisitTypeOption | null): string {
    if (!visitType) {
      return 'اختر نوع الزيارة';
    }

    return typeof visitType.price === 'number'
      ? `${visitType.price.toLocaleString('en-US')} ج.م`
      : visitType.formatted ?? visitType.label ?? '';
  }

  retryVisitTypes(): void {
    this.loadVisitTypes();
  }

  continueBooking(): void {
    if (this.bookingStep() === 1 && this.selectedClinicLocationId() && this.selectedDate() && this.selectedTime()) {
      this.bookingStep.set(2);
      this.loadVisitTypes();
      return;
    }

    if (this.bookingStep() === 2 && this.selectedVisitType()) {
      this.bookingStep.set(3);
    }
  }

  formatSelectedDate(): string {
    const date = this.selectedDate();
    return date
      ? date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'لم يتم اختيار موعد';
  }

  private loadAvailableTimeSlots(): void {
    const requestId = ++this.timeSlotsRequestId;
    const clinicLocationId = this.selectedClinicLocationId();
    const selectedDate = this.selectedDate();
    this.availableTimeSlots.set([]);
    this.selectedTime.set(null);
    this.timeSlotsError.set('');

    if (!clinicLocationId || !selectedDate) {
      this.isLoadingTimeSlots.set(false);
      return;
    }

    this.isLoadingTimeSlots.set(true);
    this.appointmentsService.getTimeSlots(clinicLocationId, formatDate(selectedDate)).subscribe({
      next: (response) => {
        if (requestId !== this.timeSlotsRequestId) {
          return;
        }

        if (!Array.isArray(response) && response.status === false) {
          this.timeSlotsError.set(response.msg || 'تعذر تحميل المواعيد المتاحة. حاول مرة أخرى.');
          this.isLoadingTimeSlots.set(false);
          return;
        }

        this.availableTimeSlots.set(readTimeSlots(response).map((slot) => {
          const times = [slot.start_time, slot.end_time].filter(
            (time): time is string => typeof time === 'string' && time.length > 0,
          );
          return { ...slot, label: times.join(' - ') || 'وقت غير محدد' };
        }));
        this.isLoadingTimeSlots.set(false);
      },
      error: () => {
        if (requestId !== this.timeSlotsRequestId) {
          return;
        }
        this.isLoadingTimeSlots.set(false);
        this.timeSlotsError.set('تعذر تحميل المواعيد المتاحة. حاول مرة أخرى.');
      },
    });
  }

  private submitPayment(
    appointmentId: number,
    method: AppointmentPayMethod,
    walletPhone: string,
  ): void {
    this.isSubmittingPayment.set(true);
    this.appointmentsService.createAppointmentPayment({
      appointment_id: appointmentId,
      pay_method: method,
      ...(method === 'wallet' ? { wallet_phone: walletPhone } : {}),
    }).subscribe({
      next: (response) => {
        this.isSubmittingPayment.set(false);
        if (response.status === false) {
          this.paymentError.set(readResponseMessage(response) || 'تعذر إتمام الدفع. حاول مرة أخرى.');
          return;
        }
        this.paymentError.set('');
        this.redirectToPayment(response.payment?.url ?? response.url);
      },
      error: (error: unknown) => {
        this.isSubmittingPayment.set(false);
        this.paymentError.set(readResponseMessage(error) || 'تعذر إتمام الدفع. حاول مرة أخرى.');
      },
    });
  }

  private redirectToPayment(redirectUrl: string | null | undefined): void {
    if (!redirectUrl?.trim()) {
      this.paymentComplete.set(true);
      this.paymentError.set('من فضلك توجه إلى العيادة لدفع رسوم الكشف قبل موعدك بأربع ساعات على الأقل، وإلا سيتم إلغاء الحجز.');
      return;
    }

    let destination: URL;
    try {
      destination = new URL(redirectUrl.trim(), window.location.origin);
    } catch {
      this.paymentError.set('رابط التحويل المستلم من الخادم غير صالح.');
      return;
    }

    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      this.paymentError.set('رابط التحويل المستلم من الخادم غير صالح.');
      return;
    }

    if (destination.origin === window.location.origin) {
      void this.router.navigateByUrl(`${destination.pathname}${destination.search}${destination.hash}`)
        .then((navigated) => {
          if (!navigated) {
            this.paymentError.set('تم تأكيد الدفع، لكن تعذر فتح صفحة التحويل.');
          }
        }, () => {
          this.paymentError.set('تم تأكيد الدفع، لكن تعذر فتح صفحة التحويل.');
        });
      return;
    }

    window.location.assign(destination.toString());
  }

  private resetPaymentSubmission(): void {
    this.appointmentId.set(null);
    this.selectedPaymentMethod.set(null);
    this.walletPhone.set('');
    this.isSubmittingPayment.set(false);
    this.paymentError.set('');
    this.paymentComplete.set(false);
  }

  private loadVisitTypes(): void {
    const clinicLocationId = this.selectedClinicLocationId();
    const requestId = ++this.visitTypesRequestId;
    this.visitTypes.set([]);
    this.selectedVisitTypeKey.set('');
    this.visitTypesError.set('');

    if (clinicLocationId === null) {
      this.isLoadingVisitTypes.set(false);
      this.visitTypesError.set('اختر الفرع أولًا لتحميل أنواع الزيارة.');
      return;
    }

    this.isLoadingVisitTypes.set(true);
    this.appointmentsService.getVisitTypes(clinicLocationId).subscribe({
      next: (response) => {
        if (requestId !== this.visitTypesRequestId) {
          return;
        }

        if (!Array.isArray(response) && response.status === false) {
          this.visitTypesError.set(response.msg || 'تعذر تحميل أنواع الزيارة. حاول مرة أخرى.');
          this.isLoadingVisitTypes.set(false);
          return;
        }

        this.visitTypes.set(readVisitTypes(response));
        this.isLoadingVisitTypes.set(false);
      },
      error: () => {
        if (requestId !== this.visitTypesRequestId) {
          return;
        }
        this.isLoadingVisitTypes.set(false);
        this.visitTypesError.set('تعذر تحميل أنواع الزيارة. حاول مرة أخرى.');
      },
    });
  }
}