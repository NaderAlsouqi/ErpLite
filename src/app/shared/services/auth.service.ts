import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { LoginRequest, LoginResponse, User } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/Auth`;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      this.getUserFromStorage()
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    // Check token validity when service initializes
    this.checkTokenValidity();
  }

  /**
   * The storage that currently holds the session: sessionStorage when the user
   * logged in WITHOUT "remember me" (cleared on browser close), otherwise
   * localStorage (persistent).
   */
  private get authStorage(): Storage {
    return sessionStorage.getItem('token') !== null ? sessionStorage : localStorage;
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!user) return null;
    
    const parsedUser = JSON.parse(user);
    const token = this.getToken();
    
    // Check if token exists and is not expired
    if (token && !this.isTokenExpired(token)) {
      return parsedUser;
    } else {
      // Clean up local storage if token is invalid or expired
      this.clearLocalStorage();
      return null;
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    return localStorage.getItem('token') ?? sessionStorage.getItem('token');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      // Check if the token expiration time (exp) is less than current time
      if (decoded.exp === undefined) return true;
      
      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(decoded.exp);
      return expirationDate.valueOf() < new Date().valueOf();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume token is expired if there's an error
    }
  }

  private checkTokenValidity(): void {
    const token = this.getToken();
    if (token && this.isTokenExpired(token)) {
      this.logout();
    }
  }

  /** Persist a successful login response into the chosen storage. */
  private storeSession(response: LoginResponse, storage: Storage, demo: boolean): void {
    this.clearLocalStorage();
    localStorage.setItem('Quotation', 'false');
    storage.setItem('token', response.Token);

    const user: User = {
      ID: response.ID,
      IsReseller: response.IsReseller,
      TaxType: response.TaxType,
      DeliveryName: response.DeliveryName,
      DeliveryID: response.DeliveryID || 0,
      CustomerAccounts: response.CustomerAccounts,
      SystemType: response.SystemType,
      DatabaseName: response.DatabaseName,
      Roles: response.Roles || [],
      Permissions: response.Permissions || []
    };
    storage.setItem('user', JSON.stringify(user));
    if (demo) sessionStorage.setItem('demoMode', '1');

    this.currentUserSubject.next(user);
  }

  login(loginRequest: LoginRequest, rememberMe: boolean = true): Observable<LoginResponse> {
    // Send RememberMe so the server issues a long-lived token (not the 1h default).
    return this.http.post<LoginResponse>(`${this.apiUrl}/Login`, { ...loginRequest, RememberMe: rememberMe })
      .pipe(
        tap(response => {
          if (response.Token) {
            // "Remember me" → persistent localStorage; otherwise session-only.
            this.storeSession(response, rememberMe ? localStorage : sessionStorage, false);
          }
        })
      );
  }

  /**
   * Demo sign-in for the public iframe preview. Sends NO credentials — the server
   * issues a short-lived token for the dedicated, read-only demo account. The demo
   * session is kept in sessionStorage only (ephemeral, never persisted to localStorage).
   */
  demoLogin(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/DemoLogin`, {})
      .pipe(
        tap(response => {
          if (response.Token) {
            this.storeSession(response, sessionStorage, true);
          }
        })
      );
  }

  get isDemoMode(): boolean {
    return sessionStorage.getItem('demoMode') === '1';
  }

  // Check if user has a specific role
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return !!user && user.Roles && user.Roles.includes(role);
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) return true; // No role restriction
    
    const user = this.currentUserValue;
    if (!user || !user.Roles || user.Roles.length === 0) return false;
    
    return roles.some(role => user.Roles.includes(role));
  }

  // Get current user roles
  getUserRoles(): string[] {
    return this.currentUserValue?.Roles || [];
  }

  // --- Permission helpers ---
  getUserPermissions(): string[] {
    return this.currentUserValue?.Permissions || [];
  }

  hasPermission(key: string): boolean {
    if (!key) return true;
    const perms = this.getUserPermissions();
    return perms.includes(key);
  }

  hasAnyPermission(keys: string[]): boolean {
    if (!keys || keys.length === 0) return true;
    const perms = this.getUserPermissions();
    return keys.some(k => perms.includes(k));
  }

  hasAllPermissions(keys: string[]): boolean {
    if (!keys || keys.length === 0) return true;
    const perms = this.getUserPermissions();
    return keys.every(k => perms.includes(k));
  }

  refreshPermissions(permissions: string[]): void {
    const user = this.currentUserValue;
    if (!user) return;
    user.Permissions = permissions || [];
    this.authStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Get homepage based on user role
  getHomepageByRole(): string {
    // Home 2 is the default landing page for all users after login.
    return '/home2';
  }

  logout(): void {
    // Show a simple loading screen
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f5f5f5;">
        <div style="text-align: center;">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p style="margin-top: 10px;">Logging out...</p>
        </div>
      </div>
    `;
    
    // Clear auth data
    this.clearLocalStorage();
    this.currentUserSubject.next(null);
    
    // Small delay for visual feedback that logout is happening
    setTimeout(() => {
      window.location.href = '/auth/login';
    }, 300);
  }

  private clearLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('demoMode');
  }
}