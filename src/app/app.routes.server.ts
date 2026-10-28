import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/appointments',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/appointments/new',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/appointments/:id/medical-record',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/weekly-schedule',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/branches',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
