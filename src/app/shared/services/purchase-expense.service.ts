import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PurchaseExpenseDto {
  ExpNo: number;
  ExpName?: string | null;    // Arabic name
  ExpEname?: string | null;   // English name
}

@Injectable({ providedIn: 'root' })
export class PurchaseExpenseService {
  private apiUrl = `${environment.apiUrl}/PurchaseExpenses`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PurchaseExpenseDto[]> {
    return this.http.get<PurchaseExpenseDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<PurchaseExpenseDto> {
    return this.http.get<PurchaseExpenseDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: PurchaseExpenseDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: PurchaseExpenseDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
