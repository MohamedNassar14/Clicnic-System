import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { NgOtpInputComponent } from 'ng-otp-input';

@Component({
  selector: 'app-verify-otp',
  imports: [ReactiveFormsModule, NgOtpInputComponent],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.scss',
})
export class VerifyOtp {
  constructor(private authService: Auth, private fb: FormBuilder, private router: Router) { }

  userPhone!: string | null;
  verifyCodeForm!: FormGroup;
  otp: any;
  YourFormControl: any;
  isLoading: boolean = false;


  ngOnInit(): void {
    this.userPhone = localStorage.getItem('phone');
    this.verifyCodeForm = this.fb.group({
      code: [null],
    });
  }

  otpChanged(e: any) {
    this.otp = e;
  }

  sendVerifyCode() {
    this.isLoading = true;
    const payload = {
      otp: this.otp,
      phone: this.userPhone,
    };
    this.authService.verifyCode(payload).subscribe((res) => {
      if (res.user) {
        this.isLoading = false;
        if (res.user.profile_completed === true ) {
          this.authService.savePatientSession(res);
          this.router.navigate(['/home']);
        } else {
          this.router.navigate(['/auth/register']);
        }
      } else {
        this.isLoading = false;
      }
    }, (err) => this.isLoading = false)
  }
}
