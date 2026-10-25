import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientProfile as PatientProfileData, PatientProfileService } from './patient-profile.service';

@Component({
  selector: 'app-patient-profile',
  imports: [RouterLink],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.scss',
})
export class PatientProfile implements OnInit {
  private readonly profileService = inject(PatientProfileService);

  readonly profile = signal<PatientProfileData | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.profileService.getPatientProfile().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (!response.status) {
          this.profile.set(null);
          this.errorMessage.set(response.msg || 'تعذر تحميل بيانات الملف الشخصي.');
          return;
        }

        this.profile.set(response.profile);
      },
      error: () => {
        this.isLoading.set(false);
        this.profile.set(null);
        this.errorMessage.set('تعذر تحميل بيانات الملف الشخصي. تحقق من اتصالك وحاول مرة أخرى.');
      },
    });
  }

  formatDate(date: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
  }

  formatGender(gender: string): string {
    return gender === 'male' ? 'ذكر' : gender === 'female' ? 'أنثى' : gender;
  }

  formatYesNo(value: boolean | null): string {
    return value === null ? 'غير محدد' : value ? 'نعم' : 'لا';
  }
}
