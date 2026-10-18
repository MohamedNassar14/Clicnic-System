import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-patient-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-login.html',
  styleUrl: './patient-login.scss',
})
export class PatientLogin {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly loginForm = this.formBuilder.nonNullable.group({
    phone: ['', Validators.required],
    password: ['', Validators.required],
  });

  isInvalid(controlName: 'phone' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  onSubmitData(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.patientSignIn(this.loginForm.getRawValue()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.status) {
          this.authService.savePatientSession(response);
          this.router.navigate(['/home']);
        } else {
          this.errorMessage.set(response.msg || 'رقم الهاتف أو كلمة المرور غير صحيحة');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('تعذر تسجيل الدخول، تحقق من البيانات وحاول مرة أخرى');
      },
    });
  }
}