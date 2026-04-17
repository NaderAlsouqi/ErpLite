import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface PermissionDto {
  PermissionID: number;
  PermissionKey: string;
  Module: string;
  DisplayName: string;
  Description: string;
  IsActive: boolean;
}

export interface PermissionMatrixItemDto {
  PermissionID: number;
  PermissionKey: string;
  Module: string;
  DisplayName: string;
  Description: string;
  IsGranted: boolean;
}

export interface AdminUserDto {
  User_ID: number;
  Login_Name: string;
  FullName: string;
}

export interface GrantUserPermissionRequest {
  User_ID: number;
  PermissionID: number;
  IsGranted: boolean;
}

export interface SetUserPermissionsRequest {
  User_ID: number;
  PermissionIDs: number[];
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private apiUrl = `${environment.apiUrl}/Permissions`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getAll(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiUrl}`)
      .pipe(catchError(this.handleError('GetAllPermissions')));
  }

  getUsers(): Observable<AdminUserDto[]> {
    return this.http.get<AdminUserDto[]>(`${this.apiUrl}/users`)
      .pipe(catchError(this.handleError('GetUsers')));
  }

  getUserPermissions(userId: number): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiUrl}/user/${userId}`)
      .pipe(catchError(this.handleError('GetUserPermissions')));
  }

  getUserPermissionsMatrix(userId: number): Observable<PermissionMatrixItemDto[]> {
    return this.http.get<PermissionMatrixItemDto[]>(`${this.apiUrl}/matrix/${userId}`)
      .pipe(catchError(this.handleError('GetUserPermissionsMatrix')));
  }

  getMyPermissions(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiUrl}/me`)
      .pipe(catchError(this.handleError('GetMyPermissions')));
  }

  grant(req: GrantUserPermissionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/grant`, req)
      .pipe(catchError(this.handleError('GrantPermission')));
  }

  revoke(userId: number, permissionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/${userId}/permission/${permissionId}`)
      .pipe(catchError(this.handleError('RevokePermission')));
  }

  setUserPermissions(req: SetUserPermissionsRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/set`, req)
      .pipe(catchError(this.handleError('SetUserPermissions')));
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let msg = this.translate.instant('General.OperationFailed', { operation });
      if (error.status === 0) msg = this.translate.instant('General.ConnectionError');
      else if (error.status === 404) msg = this.translate.instant('General.NotFound');
      else if (error.error?.message) msg = error.error.message;
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
