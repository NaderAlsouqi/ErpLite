import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────
// inchecks: InType=6, DocType=12
// Available cheques: status IN (1,2) (برسم التحصيل / محصل)
// After save:        status=2 (محصل)
// GL: Debit=Acc2 header (CreditAcc), Credit=Acc1 per line (CustAcc)

export interface ChequeWithdrawalHeaderDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  CreditAcc: number;
  CreditAccName?: string;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
}

export interface ChequeWithdrawalLineDto {
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

export interface ChequeWithdrawalVoucherDto {
  Header: ChequeWithdrawalHeaderDto;
  Lines: ChequeWithdrawalLineDto[];
}

export interface ChequeWithdrawalListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  Total: number;
  LineCount: number;
}

export interface ChequeWithdrawalListResponse {
  Items: ChequeWithdrawalListItemDto[];
  TotalCount: number;
}

export interface ChequeWithdrawalNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface AvailableChequeForWithdrawalDto {
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

export interface SaveChequeWithdrawalLine {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  BankNum: number;
  Date1?: string;
  CustAcc: number;
  VhrNo?: string;
}

export interface SaveChequeWithdrawalRequest {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  CreditAcc: number;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
  UserName?: string;
  Lines: SaveChequeWithdrawalLine[];
}

export interface SaveChequeWithdrawalResult {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequeWithdrawalService {
  private apiUrl = `${environment.apiUrl}/ChequeWithdrawal`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(
    myYear: number, vType: number, page = 1, pageSize = 20
  ): Observable<ChequeWithdrawalListResponse> {
    const params = new HttpParams()
      .set('myYear',   myYear)
      .set('vType',    vType)
      .set('page',     page)
      .set('pageSize', pageSize);
    return this.http
      .get<ChequeWithdrawalListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number, myYear: number, vType: number
  ): Observable<ChequeWithdrawalVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeWithdrawalVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
      .pipe(catchError((error) => {
        if (error.status === 404) return throwError(() => error);
        return this.handleError('GetVoucher')(error);
      }));
  }

  getNextDocNum(myYear: number, vType: number): Observable<{ NextDocNum: number }> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<{ NextDocNum: number }>(`${this.apiUrl}/GetNextDocNum`, { params })
      .pipe(catchError(this.handleError('GetNextDocNum')));
  }

  getNavigation(myYear: number, vType: number): Observable<ChequeWithdrawalNavigationDto> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeWithdrawalNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
      .pipe(catchError(this.handleError('GetNavigation')));
  }

  getAdjacentDocNum(
    currentDocNum: number, myYear: number, vType: number,
    direction: 'PREV' | 'NEXT' = 'NEXT'
  ): Observable<{ DocNum: number }> {
    const params = new HttpParams()
      .set('currentDocNum', currentDocNum)
      .set('myYear',        myYear)
      .set('vType',         vType)
      .set('direction',     direction);
    return this.http
      .get<{ DocNum: number }>(`${this.apiUrl}/GetAdjacentDocNum`, { params })
      .pipe(catchError(this.handleError('GetAdjacentDocNum')));
  }

  getAvailableCheques(): Observable<AvailableChequeForWithdrawalDto[]> {
    return this.http
      .get<AvailableChequeForWithdrawalDto[]>(`${this.apiUrl}/GetAvailableCheques`)
      .pipe(catchError(this.handleError('GetAvailableCheques')));
  }

  getAllCheques(): Observable<AvailableChequeForWithdrawalDto[]> {
    return this.http
      .get<AvailableChequeForWithdrawalDto[]>(`${this.apiUrl}/GetAllCheques`)
      .pipe(catchError(this.handleError('GetAllCheques')));
  }

  getChequesByNum(cheqNum: string): Observable<AvailableChequeForWithdrawalDto[]> {
    const params = new HttpParams().set('cheqNum', cheqNum);
    return this.http
      .get<AvailableChequeForWithdrawalDto[]>(`${this.apiUrl}/GetChequesByNum`, { params })
      .pipe(catchError(this.handleError('GetChequesByNum')));
  }

  save(request: SaveChequeWithdrawalRequest): Observable<SaveChequeWithdrawalResult> {
    return this.http
      .post<SaveChequeWithdrawalResult>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  delete(
    docNum: number, myYear: number, vType: number
  ): Observable<{ Success: boolean }> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType',  vType);
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
