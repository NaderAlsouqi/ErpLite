import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TaxConditionDto {
  No?: string | null;         // code (key, text — keeps leading zeros)
  Des?: string | null;        // Arabic description
  Clename?: string | null;    // English name
  Type?: number | null;       // classification type
}

@Injectable({ providedIn: 'root' })
export class TaxConditionService {
  private apiUrl = `${environment.apiUrl}/TaxConditions`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TaxConditionDto[]> {
    return this.http.get<TaxConditionDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(no: string): Observable<TaxConditionDto> {
    return this.http.get<TaxConditionDto>(`${this.apiUrl}/GetById/${encodeURIComponent(no)}`);
  }

  add(dto: TaxConditionDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(no: string, dto: TaxConditionDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${encodeURIComponent(no)}`, dto);
  }

  delete(no: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${encodeURIComponent(no)}`);
  }
}
