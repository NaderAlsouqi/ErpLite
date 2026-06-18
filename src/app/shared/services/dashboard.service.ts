import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface DashboardKpiDto {
  TotalRevenue:   number;
  TotalInvoices:  number;
  TotalCustomers: number;
  MonthlyRevenue: number;
}

export interface MonthlySalesDto {
  MonthYear: string;
  Revenue:   number;
}

export interface TopCustomerDto {
  CustomerName: string;
  Total:        number;
}

export interface InvoicesByTypeDto {
  InvoiceType: string;
  Count:       number;
}

export interface DashboardDataDto {
  Kpis:           DashboardKpiDto;
  MonthlySales:   MonthlySalesDto[];
  TopCustomers:   TopCustomerDto[];
  InvoicesByType: InvoicesByTypeDto[];
}

// ── Dashboard 2 ───────────────────────────────────────────────────
export interface Dashboard2KpiDto {
  AvgInvoiceValue:   number;
  TotalTax:          number;
  InvoicesThisWeek:  number;
  InvoicesThisMonth: number;
}

export interface MonthlySalesVsServiceDto {
  MonthYear:      string;
  SalesRevenue:   number;
  ServiceRevenue: number;
}

export interface MonthlyInvoiceCountDto {
  MonthYear:    string;
  SalesCount:   number;
  ServiceCount: number;
}

export interface Dashboard2DataDto {
  Kpis:           Dashboard2KpiDto;
  SalesVsService: MonthlySalesVsServiceDto[];
  InvoiceCounts:  MonthlyInvoiceCountDto[];
}

// ── Financial Dashboard ──────────────────────────────────────────
export interface FinancialDashboardKpiDto {
  AccountsReceivable:   number;
  AccountsPayable:      number;
  Revenue:              number;
  Inventory:            number;
  CurrentAssets:        number;
  CurrentLiabilities:   number;
  NetWorkingCapital:    number;
  GrossWorkingCapital:  number;
  TotalAssets:          number;
  TotalLiabilities:     number;
  TotalEquity:          number;
  CurrentRatio:         number;
  DebtToEquity:         number;
  EquityRatioPct:       number;
  GrossProfitMarginPct: number;
  GrossProfit:          number;
  BurnRate:             number;
}
export interface FinancialDashboardMonthDto {
  MonthYear:            string;
  ARBalance:            number;
  APBalance:            number;
  Inventory:            number;
  CurrentAssets:        number;
  CurrentLiabilities:   number;
  SalesMonth:           number;
  PurchasesMonth:       number;
  NetWorkingCapital:    number;
  ARTurnover:           number;
  APTurnover:           number;
}
export interface FinancialDashboardAgingDto {
  BucketCurrent: number;
  Bucket1_30:    number;
  Bucket31_60:   number;
  Bucket61_90:   number;
  Bucket91Plus:  number;
}
export interface FinancialDashboardResultDto {
  AsOfDate: string;
  Kpis:     FinancialDashboardKpiDto;
  Monthly:  FinancialDashboardMonthDto[];
  APAging:  FinancialDashboardAgingDto;
  ARAging:  FinancialDashboardAgingDto;
}
export interface FinancialDashboardFilterDto {
  AsOfDate?:            string;
  DateFrom?:            string;
  InventoryAccNo?:      number | null;
  ARAccNo?:             number | null;
  APAccNo?:             number | null;
  CurrentAssetsAccNo?:  number | null;
  CurrentLiabAccNo?:    number | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/Dashboard`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getDashboardData(): Observable<DashboardDataDto> {
    return this.http
      .get<DashboardDataDto>(`${this.apiUrl}/GetDashboardData`)
      .pipe(catchError(this.handleError()));
  }

  getDashboard2Data(): Observable<Dashboard2DataDto> {
    return this.http
      .get<Dashboard2DataDto>(`${this.apiUrl}/GetDashboard2Data`)
      .pipe(catchError(this.handleError()));
  }

  getFinancialDashboard(f: FinancialDashboardFilterDto = {}): Observable<FinancialDashboardResultDto> {
    let p = new HttpParams();
    if (f.AsOfDate)            p = p.set('AsOfDate', f.AsOfDate);
    if (f.DateFrom)            p = p.set('DateFrom', f.DateFrom);
    if (f.InventoryAccNo)      p = p.set('InventoryAccNo', f.InventoryAccNo);
    if (f.ARAccNo)             p = p.set('ARAccNo', f.ARAccNo);
    if (f.APAccNo)             p = p.set('APAccNo', f.APAccNo);
    if (f.CurrentAssetsAccNo)  p = p.set('CurrentAssetsAccNo', f.CurrentAssetsAccNo);
    if (f.CurrentLiabAccNo)    p = p.set('CurrentLiabAccNo', f.CurrentLiabAccNo);
    return this.http
      .get<FinancialDashboardResultDto>(`${this.apiUrl}/GetFinancialDashboard`, { params: p })
      .pipe(catchError(this.handleError()));
  }

  private handleError() {
    return (error: any): Observable<never> => {
      let msg = this.translate.instant('General.Error');
      if (error.status === 0) msg = this.translate.instant('General.ConnectionError');
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
