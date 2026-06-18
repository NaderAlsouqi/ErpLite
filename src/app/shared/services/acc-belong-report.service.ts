import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccBelongFilterDto {
  DateFrom: string;
  DateTo:   string;
  AccNo:    number;
  BrNo?:    number | null;
  ShowZero: boolean;
}

export interface AccBelongAccountInfoDto {
  AccNo:      number;
  AccName:    string;
  AccEName:   string;
  IsBranched: number;
}

export interface AccBelongRowDto {
  AccNo:              number;
  AccName:            string;
  AccEName:           string;
  BegB:               number;
  Dbtrans:            number;
  Crtrans:            number;
  InChecksUnsettled:  number;
  OutChecksUnsettled: number;
}

export interface AccBelongMonthlyRowDto {
  AccNo:        number;
  AccName:      string;
  AccEName:     string;
  BegB:         number;
  PeriodTotal:  number;
  M1:  number; M2:  number; M3:  number; M4:  number;
  M5:  number; M6:  number; M7:  number; M8:  number;
  M9:  number; M10: number; M11: number; M12: number;
  TotalBalance: number;
}

@Injectable({ providedIn: 'root' })
export class AccBelongReportService {
  private readonly base = `${environment.apiUrl}/AccBelongReport`;

  constructor(private http: HttpClient) {}

  getAccountInfo(accNo: number): Observable<AccBelongAccountInfoDto> {
    return this.http.get<AccBelongAccountInfoDto>(`${this.base}/GetAccountInfo`, {
      params: new HttpParams().set('accNo', accNo),
    });
  }

  getReport(f: AccBelongFilterDto): Observable<AccBelongRowDto[]> {
    return this.http.get<AccBelongRowDto[]>(`${this.base}/GetReport`, { params: this.toParams(f) });
  }

  getMonthly(f: AccBelongFilterDto): Observable<AccBelongMonthlyRowDto[]> {
    return this.http.get<AccBelongMonthlyRowDto[]>(`${this.base}/GetMonthly`, { params: this.toParams(f) });
  }

  private toParams(f: AccBelongFilterDto): HttpParams {
    let p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo',   f.DateTo)
      .set('AccNo',    f.AccNo)
      .set('ShowZero', f.ShowZero ? 'true' : 'false');
    if (f.BrNo != null) p = p.set('BrNo', f.BrNo);
    return p;
  }
}
