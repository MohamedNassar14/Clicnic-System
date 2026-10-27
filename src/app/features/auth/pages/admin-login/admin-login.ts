import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Icons } from '../../../../shared/components/icons/icons';


@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, Icons, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin implements OnInit {
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
      email: ['', Validators.required],
      password: ['', Validators.required]
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
    this.authService.signIn(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.status) {
          this.authService.saveSession(response);
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
