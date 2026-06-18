import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────
// inchecks: InType=8, DocType=19
// Available cheques: no status filter (all cheques from cheq1)
// After save:        cheq1.status=8 (مجيّر), cheq1.bankacc=Acc2
// GL: doc_num = '+A'+Ser; Debit=Acc1 per line (CustAcc), Credit=Acc2 header (CreditAcc)

export interface ChequeEndorsementHeaderDto {
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

export interface ChequeEndorsementLineDto {
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

export interface ChequeEndorsementVoucherDto {
  Header: ChequeEndorsementHeaderDto;
  Lines: ChequeEndorsementLineDto[];
}

export interface ChequeEndorsementListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  Total: number;
  LineCount: number;
}

export interface ChequeEndorsementListResponse {
  Items: ChequeEndorsementListItemDto[];
  TotalCount: number;
}

export interface ChequeEndorsementNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface AvailableChequeForEndorsementDto {
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

export interface SaveChequeEndorsementLine {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  BankNum: number;
  Date1?: string;
  CustAcc: number;
  VhrNo?: string;
}

export interface SaveChequeEndorsementRequest {
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
  Lines: SaveChequeEndorsementLine[];
}

export interface SaveChequeEndorsementResult {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequeEndorsementService {
  private apiUrl = `${environment.apiUrl}/ChequeEndorsement`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(
    myYear: number, vType: number, page = 1, pageSize = 20
  ): Observable<ChequeEndorsementListResponse> {
    const params = new HttpParams()
      .set('myYear',   myYear)
      .set('vType',    vType)
      .set('page',     page)
      .set('pageSize', pageSize);
    return this.http
      .get<ChequeEndorsementListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number, myYear: number, vType: number
  ): Observable<ChequeEndorsementVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeEndorsementVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
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

  getNavigation(myYear: number, vType: number): Observable<ChequeEndorsementNavigationDto> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeEndorsementNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
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

  getAvailableCheques(): Observable<AvailableChequeForEndorsementDto[]> {
    return this.http
      .get<AvailableChequeForEndorsementDto[]>(`${this.apiUrl}/GetAvailableCheques`)
      .pipe(catchError(this.handleError('GetAvailableCheques')));
  }

  getAllCheques(): Observable<AvailableChequeForEndorsementDto[]> {
    return this.http
      .get<AvailableChequeForEndorsementDto[]>(`${this.apiUrl}/GetAllCheques`)
      .pipe(catchError(this.handleError('GetAllCheques')));
  }

  getChequesByNum(cheqNum: string): Observable<AvailableChequeForEndorsementDto[]> {
    const params = new HttpParams().set('cheqNum', cheqNum);
    return this.http
      .get<AvailableChequeForEndorsementDto[]>(`${this.apiUrl}/GetChequesByNum`, { params })
      .pipe(catchError(this.handleError('GetChequesByNum')));
  }

  save(request: SaveChequeEndorsementRequest): Observable<SaveChequeEndorsementResult> {
    return this.http
      .post<SaveChequeEndorsementResult>(`${this.apiUrl}/Save`, request)
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
