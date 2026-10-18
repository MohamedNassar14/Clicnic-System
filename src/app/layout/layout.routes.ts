import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const routes: Routes = 
[
    { path: '', canActivate: [authGuard], loadComponent: () => import('./main-layout/main-layout').then(c => c.MainLayout),
        children: [
           { path: '', redirectTo: '/dashboard', pathMatch: 'full'},
           { path: 'dashboard', loadChildren: () => import('../features/dashboard/dashboard.routes').then(m => m.routes) },
           { path: 'appointments', loadChildren: () => import('../features/appointments/appointments.routes').then(m => m.routes) },
           { path: 'weekly-schedule', loadChildren: () => import('../features/weekly-schedule/weekly-schedule.routes').then(m => m.routes) },
              { path: 'branches', loadChildren: () => import('../features/branches/branches.routes').then(m => m.routes) },
        ]   
    },
];