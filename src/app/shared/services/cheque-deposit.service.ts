import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────
// DepositType: 1 = محصل على البنك, 2 = برسم التحصيل, 3 = ايداع نقدي

export interface ChequeDepositHeaderDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  DepositType: number;
  DebitAcc: number;
  DebitAccName?: string;
  CreditAcc: number;
  CreditAccName?: string;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
}

export interface ChequeDepositLineDto {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  VhrNo?: string;
  Date1?: string;
  CustAcc: number;
  CustAccName?: string;
  BankNum: number;
  BankName?: string;
}

export interface ChequeDepositVoucherDto {
  Header: ChequeDepositHeaderDto;
  Lines: ChequeDepositLineDto[];
}

export interface ChequeDepositListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  DepositType: number;
  Total: number;
  LineCount: number;
}

export interface ChequeDepositListResponse {
  Items: ChequeDepositListItemDto[];
  TotalCount: number;
}

export interface ChequeDepositNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface AvailableChequeDto {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  VhrNo?: string;
  Date1?: string;
  CustAcc: number;
  CustAccName?: string;
  BankNum: number;
  BankName?: string;
}

export interface SaveChequeDepositLine {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  BankNum: number;
  Date1?: string;
  CustAcc: number;
  VhrNo?: string;
}

export interface SaveChequeDepositRequest {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  DepositType: number;
  DebitAcc: number;
  CreditAcc: number;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
  UserName?: string;
  Lines: SaveChequeDepositLine[];
}

export interface SaveChequeDepositResult {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequeDepositService {
  private apiUrl = `${environment.apiUrl}/ChequeDeposit`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(
    myYear: number, vType: number, depositType: number,
    page = 1, pageSize = 20
  ): Observable<ChequeDepositListResponse> {
    const params = new HttpParams()
      .set('myYear',      myYear)
      .set('vType',       vType)
      .set('depositType', depositType)
      .set('page',        page)
      .set('pageSize',    pageSize);
    return this.http
      .get<ChequeDepositListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number, myYear: number, vType: number, depositType: number
  ): Observable<ChequeDepositVoucherDto> {
    const params = new HttpParams()
      .set('docNum',      docNum)
      .set('myYear',      myYear)
      .set('vType',       vType)
      .set('depositType', depositType);
    return this.http
      .get<ChequeDepositVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
      .pipe(catchError((error) => {
        if (error.status === 404) return throwError(() => error);
        return this.handleError('GetVoucher')(error);
      }));
  }

  getNextDocNum(
    myYear: number, vType: number, depositType: number
  ): Observable<{ NextDocNum: number }> {
    const params = new HttpParams()
      .set('myYear',      myYear)
      .set('vType',       vType)
      .set('depositType', depositType);
    return this.http
      .get<{ NextDocNum: number }>(`${this.apiUrl}/GetNextDocNum`, { params })
      .pipe(catchError(this.handleError('GetNextDocNum')));
  }

  getNavigation(
    myYear: number, vType: number, depositType: number
  ): Observable<ChequeDepositNavigationDto> {
    const params = new HttpParams()
      .set('myYear',      myYear)
      .set('vType',       vType)
      .set('depositType', depositType);
    return this.http
      .get<ChequeDepositNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
      .pipe(catchError(this.handleError('GetNavigation')));
  }

  getAdjacentDocNum(
    currentDocNum: number, myYear: number, vType: number,
    depositType: number, direction: 'PREV' | 'NEXT' = 'NEXT'
  ): Observable<{ DocNum: number }> {
    const params = new HttpParams()
      .set('currentDocNum', currentDocNum)
      .set('myYear',        myYear)
      .set('vType',         vType)
      .set('depositType',   depositType)
      .set('direction',     direction);
    return this.http
      .get<{ DocNum: number }>(`${this.apiUrl}/GetAdjacentDocNum`, { params })
      .pipe(catchError(this.handleError('GetAdjacentDocNum')));
  }

  getAvailableCheques(): Observable<AvailableChequeDto[]> {
    return this.http
      .get<AvailableChequeDto[]>(`${this.apiUrl}/GetAvailableCheques`)
      .pipe(catchError(this.handleError('GetAvailableCheques')));
  }

  getChequesByNum(cheqNum: string): Observable<AvailableChequeDto[]> {
    const params = new HttpParams().set('cheqNum', cheqNum);
    return this.http
      .get<AvailableChequeDto[]>(`${this.apiUrl}/GetChequesByNum`, { params })
      .pipe(catchError(this.handleError('GetChequesByNum')));
  }

  save(request: SaveChequeDepositRequest): Observable<SaveChequeDepositResult> {
    return this.http
      .post<SaveChequeDepositResult>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  delete(
    docNum: number, myYear: number, vType: number, depositType: number
  ): Observable<{ Success: boolean }> {
    const params = new HttpParams()
      .set('docNum',      docNum)
      .set('myYear',      myYear)
      .set('vType',       vType)
      .set('depositType', depositType);
    return this.http
      .delete<{ Success: boolean }>(`${this.apiUrl}/Delete`, { params })
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
