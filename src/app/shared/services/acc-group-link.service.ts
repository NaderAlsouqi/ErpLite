import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccGroupLinkDto {
  AccNo: number;
  GroupNo: number;
  AccountName?: string | null;
  GroupName?: string | null;
  GroupEname?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccGroupLinkService {
  private apiUrl = `${environment.apiUrl}/AccGroupLink`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AccGroupLinkDto[]> {
    return this.http.get<AccGroupLinkDto[]>(`${this.apiUrl}/GetAll`);
  }

  add(dto: AccGroupLinkDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  delete(accNo: number, groupNo: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${accNo}/${groupNo}`);
  }
}
