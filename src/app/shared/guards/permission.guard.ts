import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route data:
 *   { permissions: ['Admin.ManagePermissions'], permissionMode: 'any' | 'all' }
 */
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    const required = (route.data['permissions'] as string[]) || [];
    if (required.length === 0) return true;

    const mode = (route.data['permissionMode'] as 'any' | 'all') || 'any';
    const ok = mode === 'all'
      ? this.auth.hasAllPermissions(required)
      : this.auth.hasAnyPermission(required);

    if (ok) return true;
    this.router.navigate(['/auth/login']);
    return false;
  }
}
