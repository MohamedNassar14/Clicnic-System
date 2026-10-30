import { Routes } from '@angular/router';

export const routes: Routes = 
[
        { path: '', loadComponent: () => import('./pages/appointments/appointments').then(c => c.Appointments)},
        { path: 'new', loadComponent: () => import('./pages/new-appointment/new-appointment').then(c => c.NewAppointment)},
        { path: ':id/medical-record', loadComponent: () => import('./pages/medical-record/medical-record').then(c => c.MedicalRecord)},
        { path: ':id/patient-details', loadComponent: () => import('./pages/patient-details/patient-details').then(c => c.PatientDetails)},
        

];