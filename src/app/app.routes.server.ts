import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Patient
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-profile',
    renderMode: RenderMode.Client
  },

  // Admin
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },

  // Authentication
  {
    path: 'auth/**',
    renderMode: RenderMode.Client
  },

  // Base URL
  {
    path: '',
    renderMode: RenderMode.Client
  },

  // Other routes
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];