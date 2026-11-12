import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Non aggiungere il token se stiamo chiamando le API di login/registrazione
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }

  // Recuperiamo il token dal localStorage solo se siamo nel browser
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('token');
    if (token) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next(authReq);
    }
  }

  return next(req);
};
