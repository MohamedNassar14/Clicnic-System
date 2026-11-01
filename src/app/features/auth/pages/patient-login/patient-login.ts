import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Icons } from '../../../../shared/components/icons/icons';


@Component({
  selector: 'app-patient-login',
  imports: [ReactiveFormsModule, RouterLink, Icons],
  templateUrl: './patient-login.html',
  styleUrl: './patient-login.scss',
})
export class PatientLogin {
  constructor(private fb: FormBuilder,private authService: Auth, private router: Router) { }

  loginForm!: FormGroup;
  isLoading = signal<boolean>(false);
  showPassword: boolean = false;

  ngOnInit(): void {
    // if(this.authService.getToken()) {
    //   this.router.navigate(['/']);
    // }
    this.initialForm();
  }

    togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  
  initialForm() {
    this.loginForm = this.fb.group({
      phone: ['', Validators.required],
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(
      control &&
      control.invalid &&
      (control.touched || control.dirty)
    );
  }

  hasError(controlName: string, error: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!control?.errors?.[error];
  }

  onSubmitData() {
    this.isLoading.set(true);
    this.authService.patientSignIn(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.status) {
          localStorage.setItem('phone', response.user.user.phone);
          this.router.navigate(['/auth/verify-phone']);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
