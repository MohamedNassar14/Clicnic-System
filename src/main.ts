import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...appConfig.providers!,
  
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '' // Disable dark mode auto-switching
        }
      }
    })
  ]
})
  .catch((err) => console.error(err));
