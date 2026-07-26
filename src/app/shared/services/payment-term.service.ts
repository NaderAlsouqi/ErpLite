import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentTermDto {
  TermNo: number;
  TermName?: string | null;    // Arabic condition
  TermEname?: string | null;   // English condition
}

@Injectable({ providedIn: 'root' })
export class PaymentTermService {
  private apiUrl = `${environment.apiUrl}/PaymentTerms`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PaymentTermDto[]> {
    return this.http.get<PaymentTermDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<PaymentTermDto> {
    return this.http.get<PaymentTermDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: PaymentTermDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: PaymentTermDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
