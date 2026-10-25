import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'appointments',
    renderMode: RenderMode.Client
  },
  {
    path: 'appointments/new',
    renderMode: RenderMode.Client
  },
  {
    path: 'appointments/:id/medical-record',
    renderMode: RenderMode.Client
  },
  {
    path: 'weekly-schedule',
    renderMode: RenderMode.Client
  },
  {
    path: 'branches',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
