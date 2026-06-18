import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ActivityLogDto {
  Id: number;
  Username: string;
  Action: string;
  Module: string;
  Details: string | null;
  NewValues: string | null;
  OldValues: string | null;
  ErrorDetails: string | null;
  IPAddress: string | null;
  IsSuccess: boolean;
  LoggedAt: string;
}

export interface ActivityLogInsertDto {
  Action: string;
  Module: string;
  Details?: string | null;
  NewValues?: string | null;
  OldValues?: string | null;
  ErrorDetails?: string | null;
  IsSuccess: boolean;
}

export interface ActivityLogFilterDto {
  Username?: string | null;
  Module?: string | null;
  Action?: string | null;
  IsSuccess?: boolean | null;
  DateFrom?: string | null;
  DateTo?: string | null;
  PageNumber: number;
  PageSize: number;
}

export interface ActivityLogPagedDto {
  TotalCount: number;
  Logs: ActivityLogDto[];
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly apiUrl = `${environment.apiUrl}/ActivityLog`;

  constructor(private http: HttpClient) {}

  insert(dto: ActivityLogInsertDto): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Insert`, dto).pipe(
      catchError(() => throwError(() => null))
    );
  }

  getAll(filter: ActivityLogFilterDto): Observable<ActivityLogPagedDto> {
    let params = new HttpParams()
      .set('PageNumber', filter.PageNumber.toString())
      .set('PageSize', filter.PageSize.toString());

    if (filter.Username)         params = params.set('Username',  filter.Username);
    if (filter.Module)           params = params.set('Module',    filter.Module);
    if (filter.Action)           params = params.set('Action',    filter.Action);
    if (filter.IsSuccess != null) params = params.set('IsSuccess', filter.IsSuccess.toString());
    if (filter.DateFrom)         params = params.set('DateFrom',  filter.DateFrom);
    if (filter.DateTo)           params = params.set('DateTo',    filter.DateTo);

    return this.http.get<ActivityLogPagedDto>(`${this.apiUrl}/GetAll`, { params });
  }

  getModules(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/GetModules`);
  }
}
