import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes), 
    provideAnimationsAsync(),
    provideClientHydration(withEventReplay()),
    providePrimeNG({
      theme: { preset: Aura },
      translation: {
        aria: {
          firstPageLabel: 'الصفحة الأولى',
          lastPageLabel: 'الصفحة الأخيرة',
          nextPageLabel: 'التالي',
          prevPageLabel: 'السابق',
        },
      },
    }),
  ]
};
