import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(
    private zone: NgZone,
    private router: Router
  ) {}
  
  handleError(error: any): void {
    console.error('Global error handler caught:', error);
    
    // Check for storage/parsing errors that might indicate corrupt state
    if (error.message && (
        error.message.includes('localStorage') || 
        error.message.includes('JSON.parse') ||
        error.message.includes('undefined is not an object') ||
        error.message.includes('null is not an object')
    )) {
      this.zone.run(() => {
        console.log('Clearing cache due to critical error');
        // Clear all cached data
        localStorage.clear();
        sessionStorage.clear();
        
        // Reload the app
        window.location.reload();
      });
    }
    
    // Let the error propagate for other types of errors
  }
}