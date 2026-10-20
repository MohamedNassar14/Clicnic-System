import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const routes: Routes = 
[
    { path: 'admin-login', canActivate: [guestGuard], loadComponent: () => import('./pages/admin-login/admin-login').then(c => c.AdminLogin)},
    { path: 'patient-login', canActivate: [guestGuard], loadComponent: () => import('./pages/patient-login/patient-login').then(c => c.PatientLogin)},
    { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/register/register').then(c => c.Register)},
];
