import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, RegisterPayload } from '../../services/auth';
import { Icons } from '../../../../shared/components/icons/icons';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';


@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Icons, SelectModule, DatePickerModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
showPassword: boolean = false;
  readonly isLoading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly registerForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.email],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    date_of_birth: ['', Validators.required],
    gender: ['', Validators.required],
    address: ['', Validators.required],
  });

  allGender = [
    { id: 'male', name: 'ذكر' },
    { id: 'female', name: 'أنثى' },  
  ];
  isInvalid(controlName: keyof RegisterPayload): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  onSubmitData(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formData = this.registerForm.getRawValue();
    this.authService.register(formData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (!response.status) {
          this.errorMessage.set(response.msg || 'تعذر إنشاء الحساب، حاول مرة أخرى');
          return;
        }

        this.authService.savePatientSession(response);
        this.successMessage.set('تم إنشاء الحساب بنجاح');
        void this.router.navigateByUrl('/home');
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('تعذر إنشاء الحساب، حاول مرة أخرى');
      },
    });
  }
}