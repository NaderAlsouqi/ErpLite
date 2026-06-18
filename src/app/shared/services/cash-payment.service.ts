import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────

export interface CashPaymentHeaderDto {
  TransNum: number;
  DocNum: number;
  MyYear: number;
  VType: number;
  BrNo: number;
  Date: string;
  CurNo: number;
  Rate: number;
  UserName?: string;
  Post: boolean;
  PayFor?: string;
  Reason?: string;
  SigNo: number;
  CurrencyName?: string;
  SecPay: number;
}

export interface CashPaymentDebitLineDto {
  Acc: number;
  AccName?: string;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface CashPaymentCreditLineDto {
  Acc: number;
  AccName?: string;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface CashPaymentVoucherDto {
  Header: CashPaymentHeaderDto;
  DebitLines: CashPaymentDebitLineDto[];
  CreditLines: CashPaymentCreditLineDto[];
}

export interface CashPaymentListItemDto {
  TransNum: number;
  DocNum: number;
  MyYear: number;
  VType: number;
  Date: string;
  UserName?: string;
  PayFor?: string;
  TotalDebit: number;
  TotalCredit: number;
  Post: boolean;
}

export interface CashPaymentListResponse {
  Items: CashPaymentListItemDto[];
  TotalCount: number;
}

export interface SaveCashPaymentDebitLine {
  Acc: number;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface SaveCashPaymentCreditLine {
  Acc: number;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface SaveCashPaymentRequest {
  TransNum: number;
  DocNum: number;
  MyYear: number;
  VType: number;
  BrNo: number;
  Date: string;
  CurNo: number;
  Rate: number;
  UserName: string;
  PayFor?: string;
  Reason?: string;
  SigNo: number;
  SecPay: number;
  DebitLines: SaveCashPaymentDebitLine[];
  CreditLines: SaveCashPaymentCreditLine[];
}

export interface SaveCashPaymentResult {
  Success: boolean;
  TransNum: number;
  DocNum: number;
  ErrorMessage?: string;
}

export interface CashPaymentNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CashPaymentService {
  private apiUrl = `${environment.apiUrl}/CashPayments`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(myYear: number, vType = 1, page = 1, pageSize = 20): Observable<CashPaymentListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<CashPaymentListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(docNum: number, myYear: number, vType = 1): Observable<CashPaymentVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType', vType);
    return this.http
      .get<CashPaymentVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
      .pipe(catchError((error) => {
        if (error.status === 404) return throwError(() => error);
        return this.handleError('GetVoucher')(error);
      }));
  }

  getNextDocNum(myYear: number, vType = 1): Observable<{ NextDocNum: number }> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<{ NextDocNum: number }>(`${this.apiUrl}/GetNextDocNum`, { params })
      .pipe(catchError(this.handleError('GetNextDocNum')));
  }

  getNavigation(myYear: number, vType = 1): Observable<CashPaymentNavigationDto> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<CashPaymentNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
      .pipe(catchError(this.handleError('GetNavigation')));
  }

  getAdjacentDocNum(
    currentDocNum: number,
    myYear: number,
    vType = 1,
    direction: 'PREV' | 'NEXT' = 'NEXT'
  ): Observable<{ DocNum: number }> {
    const params = new HttpParams()
      .set('currentDocNum', currentDocNum)
      .set('myYear', myYear)
      .set('vType', vType)
      .set('direction', direction);
    return this.http
      .get<{ DocNum: number }>(`${this.apiUrl}/GetAdjacentDocNum`, { params })
      .pipe(catchError(this.handleError('GetAdjacentDocNum')));
  }

  save(request: SaveCashPaymentRequest): Observable<SaveCashPaymentResult> {
    return this.http
      .post<SaveCashPaymentResult>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  delete(transNum: number): Observable<{ Success: boolean }> {
    return this.http
      .delete<{ Success: boolean }>(`${this.apiUrl}/Delete/${transNum}`)
      .pipe(catchError(this.handleError('Delete')));
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let msg = this.translate.instant('General.OperationFailed', { operation });
      if (error.status === 0) msg = this.translate.instant('General.ConnectionError');
      else if (error.status === 404) msg = this.translate.instant('General.NotFound');
      else if (error.error?.ErrorMessage) msg = error.error.ErrorMessage;
      else if (error.error?.Errors?.length) msg = error.error.Errors.join(' | ');
      else if (error.error?.message) msg = error.error.message;
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
