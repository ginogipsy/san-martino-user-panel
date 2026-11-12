import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor'; // Lo creeremo tra poco
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(), // <-- AGGIUNGI QUESTO
      withInterceptors([authInterceptor]),
    ), // Colleghiamo il "postino" del token
    // ... altri provider come servizi, guardie, ecc.
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
  ],
};
