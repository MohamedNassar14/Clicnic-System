import { Routes } from '@angular/router';

export const routes: Routes = 
[
        { path: 'new', loadComponent: () => import('./pages/new-appointment/new-appointment').then(c => c.NewAppointment)},
        { path: '', loadComponent: () => import('./pages/appointments/appointments').then(c => c.Appointments)},

];