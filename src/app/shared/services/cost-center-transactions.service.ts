import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CostCenterTransactionsFilterDto {
  CcFrom:   number;
  CcTo:     number;
  AccFrom:  number;
  AccTo:    number;
  DateFrom: string;   // '' = all periods
  DateTo:   string;
}

export interface CostCenterTransactionRowDto {
  CcntrNo:    number;
  CcAname:    string;
  CcEname:    string;
  Date:       string;
  DocNum:     number;
  DocType:    number;
  VType:      number;
  SerialName: string;
  AccNo:      number;
  AccName:    string;
  AccEName:   string;
  Des:        string;
  Debit:      number;
  Credit:     number;
}

@Injectable({ providedIn: 'root' })
export class CostCenterTransactionsService {
  private readonly base = `${environment.apiUrl}/CostCenterTransactions`;

  constructor(private http: HttpClient) {}

  getReport(f: CostCenterTransactionsFilterDto): Observable<CostCenterTransactionRowDto[]> {
    const p = new HttpParams()
      .set('CcFrom',   f.CcFrom)
      .set('CcTo',     f.CcTo)
      .set('AccFrom',  f.AccFrom)
      .set('AccTo',    f.AccTo)
      .set('DateFrom', f.DateFrom)
      .set('DateTo',   f.DateTo);
    return this.http.get<CostCenterTransactionRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
