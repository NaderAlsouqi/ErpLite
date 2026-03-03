import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Skip token check for login request
  if (req.url.includes('/Auth/Login')) {
    return next(req);
  }
  
  // Check if token is valid
  if (!authService.isLoggedIn) {
    authService.logout();
    return next(req);
  }
  
  // Add token to headers
  const token = authService.getToken();
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    
    return next(authReq).pipe(
      catchError(error => {
        // If we get a 401 or 403 response, clear storage and log out the user
        if (error.status === 401 || error.status === 403) {
          localStorage.clear();
          sessionStorage.clear();
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
  
  return next(req);
};