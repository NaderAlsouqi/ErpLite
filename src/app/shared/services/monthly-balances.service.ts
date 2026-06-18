import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MonthlyBalancesFilterDto {
  AccNo: number;
  Year:  number;
}

export interface MonthlyBalanceRowDto {
  Month:       number;
  DebitTrans:  number;
  CreditTrans: number;
}

export interface MonthlyBalancesResultDto {
  AccNo:      number;
  AccName:    string;
  AccEName:   string;
  BegBalance: number;
  Months:     MonthlyBalanceRowDto[];
}

@Injectable({ providedIn: 'root' })
export class MonthlyBalancesService {
  private readonly base = `${environment.apiUrl}/MonthlyBalances`;

  constructor(private http: HttpClient) {}

  getReport(f: MonthlyBalancesFilterDto): Observable<MonthlyBalancesResultDto> {
    const p = new HttpParams()
      .set('AccNo', f.AccNo)
      .set('Year',  f.Year);
    return this.http.get<MonthlyBalancesResultDto>(`${this.base}/GetReport`, { params: p });
  }
}
