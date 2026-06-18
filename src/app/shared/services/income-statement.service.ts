import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncomeStatementFilterDto {
  DateFrom:        string;
  DateTo:          string;
  Level:           number;
  ExcludeClosing:  boolean;
  ShowZero:        boolean;
  StockAccNo?:     number | null;
  BeginningStock:  number;
  EndingStock:     number;
}

export interface StockGridEntryDto {
  AccNo:    number;
  Value:    number;
  AccName?: string;   // client-side display only
}

export interface IncomeStatementRowDto {
  AccNo:    number;
  AccName:  string;
  AccEName: string;
  Level:    number;
  Branch:   number;
  Value:    number;
}

export interface IncomeStatementResultDto {
  StkMethodRaw:           string;
  StkMethod:              boolean;
  ComputedBeginningStock: number;

  SalesAccounts:    IncomeStatementRowDto[];
  RevenueAccounts:  IncomeStatementRowDto[];
  PurchaseAccounts: IncomeStatementRowDto[];
  ExpenseAccounts:  IncomeStatementRowDto[];

  SalesTotal:     number;
  RevenueTotal:   number;
  IncomeTotal:    number;
  BeginningStock: number;
  PurchasesTotal: number;
  EndingStock:    number;
  CogsTotal:      number;
  GrossProfit:    number;
  ExpensesTotal:  number;
  NetIncome:      number;
}

@Injectable({ providedIn: 'root' })
export class IncomeStatementService {
  private readonly base = `${environment.apiUrl}/IncomeStatement`;

  constructor(private http: HttpClient) {}

  getStockGrid(stockAccNo: number): Observable<StockGridEntryDto[]> {
    const p = new HttpParams().set('stockAccNo', stockAccNo);
    return this.http.get<StockGridEntryDto[]>(`${this.base}/GetStockGrid`, { params: p });
  }

  saveStockGrid(rows: StockGridEntryDto[]): Observable<{ updated: number }> {
    return this.http.put<{ updated: number }>(`${this.base}/SaveStockGrid`, rows);
  }

  getReport(f: IncomeStatementFilterDto): Observable<IncomeStatementResultDto> {
    let p = new HttpParams()
      .set('DateFrom',       f.DateFrom)
      .set('DateTo',         f.DateTo)
      .set('Level',          f.Level)
      .set('ExcludeClosing', f.ExcludeClosing ? 'true' : 'false')
      .set('ShowZero',       f.ShowZero       ? 'true' : 'false')
      .set('BeginningStock', f.BeginningStock)
      .set('EndingStock',    f.EndingStock);
    if (f.StockAccNo != null) p = p.set('StockAccNo', f.StockAccNo);
    return this.http.get<IncomeStatementResultDto>(`${this.base}/GetReport`, { params: p });
  }
}
