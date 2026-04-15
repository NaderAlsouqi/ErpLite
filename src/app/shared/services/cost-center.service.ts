import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CostCenterDto {
  CcntrNo: number;
  CcAname?: string | null;
  Ccename?: string | null;
  belong?: number | null;
  branch?: number | null;
  bb?: number | null;
  level?: number | null;
  balance1?: number | null;
  accorder?: string | null;
  fatherorder?: string | null;
  CurNo?: number | null;
  LRate?: number | null;
  budgetF?: number | null;
  ProfL?: number | null;
  total?: number | null;
}

@Injectable({ providedIn: 'root' })
export class CostCenterService {
  private apiUrl = `${environment.apiUrl}/CostCenters`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CostCenterDto[]> {
    return this.http.get<CostCenterDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<CostCenterDto> {
    return this.http.get<CostCenterDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: CostCenterDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: CostCenterDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }

  clearCostCenter(fromCcntrNo: number, toCcntrNo: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/ClearCostCenter`, { fromCcntrNo, toCcntrNo });
  }

  hasTransactions(id: number): Observable<{ hasTransactions: boolean }> {
    return this.http.get<{ hasTransactions: boolean }>(`${this.apiUrl}/HasTransactions/${id}`);
  }

  transferTransactions(fromCcntrNo: number, toCcntrNo: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/TransferTransactions`, { fromCcntrNo, toCcntrNo });
  }
}
