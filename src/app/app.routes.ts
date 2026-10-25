import { Routes } from '@angular/router';
import { patientGuard } from './core/guards/patient.guard';

export const routes: Routes = 
[
    { path: 'home', canActivate: [patientGuard], loadComponent: () => import('./features/home/home').then(c => c.Home) },
    { path: 'my-profile', canActivate: [patientGuard], loadComponent: () => import('./features/profile/patient-profile').then(c => c.PatientProfile) },
    {path: '', loadChildren: () => import('./layout/layout.routes').then(m => m.routes)},
    {path: 'auth', loadChildren: () => import('../app/features/auth/auth.routes').then(m => m.routes)},
];
