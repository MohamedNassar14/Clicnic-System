import { Component, inject } from '@angular/core';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.scss',
})
export class DoctorProfile {
  readonly user = inject(Auth).getCurrentUser();
}
