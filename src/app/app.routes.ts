import { Routes } from '@angular/router';

export const routes: Routes = 
[
    { path: 'home', loadComponent: () => import('./features/home/home').then(c => c.Home) },
    {path: '', loadChildren: () => import('./layout/layout.routes').then(m => m.routes)},
    {path: 'auth', loadChildren: () => import('../app/features/auth/auth.routes').then(m => m.routes)},
];
