import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────
// inchecks: InType=3, DocType=10
// Available cheques: status IN (1=برسم التحصيل, 2=محصل)
// After save:        status=3 (راجع)
// GL: Debit=Acc1 per line (customer), Credit=Acc2 header

export interface ChequeReturnHeaderDto {
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

export interface ChequeReturnLineDto {
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

export interface ChequeReturnVoucherDto {
  Header: ChequeReturnHeaderDto;
  Lines: ChequeReturnLineDto[];
}

export interface ChequeReturnListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  Total: number;
  LineCount: number;
}

export interface ChequeReturnListResponse {
  Items: ChequeReturnListItemDto[];
  TotalCount: number;
}

export interface ChequeReturnNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface AvailableChequeForReturnDto {
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

export interface SaveChequeReturnLine {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  BankNum: number;
  Date1?: string;
  CustAcc: number;
  VhrNo?: string;
}

export interface SaveChequeReturnRequest {
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
  Lines: SaveChequeReturnLine[];
}

export interface SaveChequeReturnResult {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequeReturnService {
  private apiUrl = `${environment.apiUrl}/ChequeReturn`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(
    myYear: number, vType: number, page = 1, pageSize = 20
  ): Observable<ChequeReturnListResponse> {
    const params = new HttpParams()
      .set('myYear',   myYear)
      .set('vType',    vType)
      .set('page',     page)
      .set('pageSize', pageSize);
    return this.http
      .get<ChequeReturnListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number, myYear: number, vType: number
  ): Observable<ChequeReturnVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeReturnVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
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

  getNavigation(myYear: number, vType: number): Observable<ChequeReturnNavigationDto> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeReturnNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
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

  getAvailableCheques(): Observable<AvailableChequeForReturnDto[]> {
    return this.http
      .get<AvailableChequeForReturnDto[]>(`${this.apiUrl}/GetAvailableCheques`)
      .pipe(catchError(this.handleError('GetAvailableCheques')));
  }

  getChequesByNum(cheqNum: string): Observable<AvailableChequeForReturnDto[]> {
    const params = new HttpParams().set('cheqNum', cheqNum);
    return this.http
      .get<AvailableChequeForReturnDto[]>(`${this.apiUrl}/GetChequesByNum`, { params })
      .pipe(catchError(this.handleError('GetChequesByNum')));
  }

  save(request: SaveChequeReturnRequest): Observable<SaveChequeReturnResult> {
    return this.http
      .post<SaveChequeReturnResult>(`${this.apiUrl}/Save`, request)
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
