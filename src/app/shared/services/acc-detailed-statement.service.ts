import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface AccDetailedStmtFilterDto {
  DateFrom:     string;
  DateTo:       string;
  AccNoFrom:    number;
  AccNoTo?:     number | null;
  PostStatus?:  number | null;   // null=all  0=unposted  1=posted
  OrderBy:      'Date' | 'DocNum' | 'DocType';
  CurNo:        number;           // display currency (1 = main)
  ShowItems?:   boolean;
  ShowChecks?:  boolean;
}

export interface AccDetailedStmtItemDto {
  ItemCode:  string;
  ItemName:  string;
  Qty:       number;
  Bonus:     number;
  Price:     number;
  Disc:      number;
  Tax:       number;
  Total:     number;
}

export interface AccDetailedStmtLineDto {
  AccNo:       number;
  AccName:     string;
  AccEName:    string;
  BegBal:      number;

  TransNum:    number;
  DocNum:      number;
  DocType:     number;
  VType:       number;
  SerialName:  string;
  Date:        string;
  Des:         string;

  Debit:       number;   // in display currency
  Credit:      number;   // in display currency
  OrigDebit:   number;   // in transaction's own currency
  OrigCredit:  number;   // in transaction's own currency
  Rate:        number;
  CurNo:       number;
  CurName:     string;

  HasTrans:    boolean;
  Items?:      AccDetailedStmtItemDto[];
}

export interface AccDetailedStmtCheckDto {
  AccNo:       number;
  CheqNum:     number;
  CheqDate:    string;
  BankName:    string;
  Amt:         number;
  Draw:        string;
  CollectDate: string;
  DocNum:      string;
  Status:      number;  // 1/2=deferred  3=collected  4=bounced
}

export interface AccDetailedStmtResultDto {
  lines:  AccDetailedStmtLineDto[];
  checks: AccDetailedStmtCheckDto[];
}

@Injectable({ providedIn: 'root' })
export class AccDetailedStatementService {
  private readonly base = `${environment.apiUrl}/AccDetailedStatement`;

  constructor(
    private http:      HttpClient,
    private toastr:    ToastrService,
    private translate: TranslateService,
  ) {}

  getReport(filter: AccDetailedStmtFilterDto): Observable<AccDetailedStmtResultDto> {
    let params = new HttpParams()
      .set('DateFrom',  filter.DateFrom)
      .set('DateTo',    filter.DateTo)
      .set('AccNoFrom', filter.AccNoFrom)
      .set('OrderBy',   filter.OrderBy)
      .set('CurNo',     filter.CurNo);

    if (filter.AccNoTo    != null) params = params.set('AccNoTo',    filter.AccNoTo);
    if (filter.PostStatus != null) params = params.set('PostStatus', filter.PostStatus);
    if (filter.ShowItems)          params = params.set('ShowItems',  true);
    if (filter.ShowChecks)         params = params.set('ShowChecks', true);

    return this.http
      .get<AccDetailedStmtResultDto | AccDetailedStmtLineDto[]>(`${this.base}/GetReport`, { params })
      .pipe(
        map(res => {
          if (Array.isArray(res)) return { lines: res as AccDetailedStmtLineDto[], checks: [] };
          const r = res as any;
          return {
            lines:  (r.lines  ?? r.Lines  ?? []) as AccDetailedStmtLineDto[],
            checks: (r.checks ?? r.Checks ?? []) as AccDetailedStmtCheckDto[],
          };
        }),
        catchError(this.handleError()),
      );
  }

  private handleError() {
    return (error: unknown): Observable<never> => {
      this.toastr.error(this.translate.instant('General.ErrorOccurred'));
      return throwError(() => error);
    };
  }
}
