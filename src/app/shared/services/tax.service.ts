import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TaxDto {
  TaxNo: number;
  TaxNameA?: string | null;
  TaxNameE?: string | null;
  TaxPerc?: number | null;
  Branched: number;
  Belong?: number | null;
  TaxAcc?: number | null;
}

@Injectable({ providedIn: 'root' })
export class TaxService {
  private apiUrl = `${environment.apiUrl}/Taxes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TaxDto[]> {
    return this.http.get<TaxDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<TaxDto> {
    return this.http.get<TaxDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: TaxDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: TaxDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
