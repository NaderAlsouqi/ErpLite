import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CostCenterAccountBalancesFilterDto {
  CcFrom:        number;
  CcTo:          number;
  AccNo:         number;
  DateFrom:      string;
  DateTo:        string;
  ShowEstimated: boolean;
}

export interface CostCenterAccountBalanceRowDto {
  CcntrNo:    number;
  CcAname:    string;
  CcEname:    string;
  AccNo:      number;
  AccName:    string;
  AccEName:   string;
  Opening:    number;
  Amount:     number;
  Total:      number;
  Estimated:  number;
  Difference: number;
}

@Injectable({ providedIn: 'root' })
export class CostCenterAccountBalancesService {
  private readonly base = `${environment.apiUrl}/CostCenterAccountBalances`;

  constructor(private http: HttpClient) {}

  getReport(f: CostCenterAccountBalancesFilterDto): Observable<CostCenterAccountBalanceRowDto[]> {
    const p = new HttpParams()
      .set('CcFrom',   f.CcFrom)
      .set('CcTo',     f.CcTo)
      .set('AccNo',    f.AccNo)
      .set('DateFrom', f.DateFrom)
      .set('DateTo',   f.DateTo)
      .set('ShowEstimated', f.ShowEstimated);
    return this.http.get<CostCenterAccountBalanceRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
