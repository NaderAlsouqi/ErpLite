import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChartOfAccountDto {
  no: number;
  name?: string | null;
  Ename?: string | null;
  belong?: number | null;
  branch?: number | null;
  bb?: number | null;
  level?: number | null;
  balance1?: number | null;
  accorder?: string | null;
  fatherorder?: string | null;
  CurNo?: number | null;
  LRate?: number | null;
  CcntrNo?: number | null;
  budgetF?: number | null;
  ProfL?: number | null;
  BB_Tr?: number | null;
  br_no?: number | null;
  f_bb?: number | null;
  Stopped?: boolean | null;
  Celing?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsService {
  private apiUrl = `${environment.apiUrl}/ChartOfAccounts`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ChartOfAccountDto[]> {
    return this.http.get<ChartOfAccountDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(no: number): Observable<ChartOfAccountDto> {
    return this.http.get<ChartOfAccountDto>(`${this.apiUrl}/GetById/${no}`);
  }

  add(dto: ChartOfAccountDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(no: number, dto: ChartOfAccountDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${no}`, dto);
  }

  delete(no: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${no}`);
  }

  canDelete(no: number): Observable<{ canDelete: boolean; reason: string | null }> {
    return this.http.get<{ canDelete: boolean; reason: string | null }>(`${this.apiUrl}/CanDelete/${no}`);
  }

  hasTransactions(no: number): Observable<{ hasTransactions: boolean }> {
    return this.http.get<{ hasTransactions: boolean }>(`${this.apiUrl}/HasTransactions/${no}`);
  }

  transferTransactions(fromAccountNo: number, toAccountNo: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/TransferTransactions`, { FromAccountNo: fromAccountNo, ToAccountNo: toAccountNo });
  }

  transferAccountMovements(fromAccountNo: number, toAccountNo: number, deleteOldAccount: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/TransferAccountMovements`, { FromAccountNo: fromAccountNo, ToAccountNo: toAccountNo, DeleteOldAccount: deleteOldAccount });
  }
}
