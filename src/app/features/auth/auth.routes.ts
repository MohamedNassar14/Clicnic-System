import { Routes } from '@angular/router';

export const routes: Routes = 
[
    { path: 'admin-login', loadComponent: () => import('./pages/admin-login/admin-login').then(c => c.AdminLogin)},
    { path: 'patient-login', loadComponent: () => import('./pages/patient-login/patient-login').then(c => c.PatientLogin)},
    { path: 'register', loadComponent: () => import('./pages/register/register').then(c => c.Register)},
];
