import { Routes } from '@angular/router';

export const routes: Routes = 
[
    { path: '', loadComponent: () => import('./pages/weekly-schedule/weekly-schedule').then(c => c.WeeklySchedule)},
];