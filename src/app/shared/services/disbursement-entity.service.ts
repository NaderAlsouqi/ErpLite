import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DisbursementEntityDto {
  Tg: number;
  Name?: string | null;    // Arabic name
  Ename?: string | null;   // English name
  Tel?: string | null;     // phone
}

@Injectable({ providedIn: 'root' })
export class DisbursementEntityService {
  private apiUrl = `${environment.apiUrl}/DisbursementEntities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DisbursementEntityDto[]> {
    return this.http.get<DisbursementEntityDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<DisbursementEntityDto> {
    return this.http.get<DisbursementEntityDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: DisbursementEntityDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: DisbursementEntityDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
