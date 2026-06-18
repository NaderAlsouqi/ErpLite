import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BalanceSheetFilterDto {
  BegDate:         string;
  AsOfDate:        string;
  Level:           number;
  ExcludeClosing:  boolean;
  StockAccNo?:     number | null;
  EndingStock:     number;
}

export interface BalanceSheetRowDto {
  AccNo:       number;
  AccName:     string;
  AccEName:    string;
  Level:       number;
  Branch:      number;
  Value:       number;
  DebitValue:  number;
  CreditValue: number;
}

export interface BalanceSheetResultDto {
  StkMethodRaw:         string;
  StkMethod:            boolean;
  StockBalance:         number;

  Assets:               BalanceSheetRowDto[];
  Liabilities:          BalanceSheetRowDto[];
  Equity:               BalanceSheetRowDto[];

  EndingStock:          number;
  AssetsTotal:          number;
  LiabilitiesSumLevel1: number;
  EquitySumLevel1:      number;
  NetIncome:            number;
  TotalEquity:          number;
  GrandTotal:           number;
}

@Injectable({ providedIn: 'root' })
export class BalanceSheetService {
  private readonly base = `${environment.apiUrl}/BalanceSheet`;

  constructor(private http: HttpClient) {}

  getReport(f: BalanceSheetFilterDto): Observable<BalanceSheetResultDto> {
    let p = new HttpParams()
      .set('BegDate',        f.BegDate)
      .set('AsOfDate',       f.AsOfDate)
      .set('Level',          f.Level)
      .set('ExcludeClosing', f.ExcludeClosing ? 'true' : 'false')
      .set('EndingStock',    f.EndingStock);
    if (f.StockAccNo != null) p = p.set('StockAccNo', f.StockAccNo);
    return this.http.get<BalanceSheetResultDto>(`${this.base}/GetReport`, { params: p });
  }
}
