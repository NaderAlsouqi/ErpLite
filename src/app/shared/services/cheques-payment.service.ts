import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────

export interface CheckPaymentHeaderDto {
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
  SecPay?: number;
  CurrencyName?: string;
}

export interface CheckPaymentDebitLineDto {
  Acc: number;
  AccName?: string;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface CheckPaymentCreditLineDto {
  Acc: number;
  AccName?: string;
  Amt: number;
  CheqNum?: string;
  CheqDate?: string;
  Des?: string;
  CCntrNo: number;
}

export interface CheckPaymentVoucherDto {
  Header: CheckPaymentHeaderDto;
  DebitLines: CheckPaymentDebitLineDto[];
  CreditLines: CheckPaymentCreditLineDto[];
}

export interface CheckPaymentListItemDto {
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

export interface CheckPaymentListResponse {
  Items: CheckPaymentListItemDto[];
  TotalCount: number;
}

export interface SaveCheckPaymentDebitLine {
  Acc: number;
  Amt: number;
  Des?: string;
  CCntrNo: number;
}

export interface SaveCheckPaymentCreditLine {
  Acc: number;
  Amt: number;
  CheqNum?: number | null;
  CheqDate?: string;
  Des?: string;
  CCntrNo: number;
}

export interface SaveCheckPaymentRequest {
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
  DebitLines: SaveCheckPaymentDebitLine[];
  CreditLines: SaveCheckPaymentCreditLine[];
}

export interface SaveCheckPaymentResult {
  Success: boolean;
  TransNum: number;
  DocNum: number;
  ErrorMessage?: string;
}

export interface CheckPaymentNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequesPaymentService {
  private apiUrl = `${environment.apiUrl}/CheckPayments`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(myYear: number, vType = 1, page = 1, pageSize = 20): Observable<CheckPaymentListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<CheckPaymentListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(docNum: number, myYear: number, vType = 1): Observable<CheckPaymentVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType', vType);
    return this.http
      .get<CheckPaymentVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
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

  getNavigation(myYear: number, vType = 1): Observable<CheckPaymentNavigationDto> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<CheckPaymentNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
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

  save(request: SaveCheckPaymentRequest): Observable<SaveCheckPaymentResult> {
    return this.http
      .post<SaveCheckPaymentResult>(`${this.apiUrl}/Save`, request)
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
