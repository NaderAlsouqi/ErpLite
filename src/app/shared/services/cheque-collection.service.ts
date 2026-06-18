import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────
// inchecks: InType=4, DocType=9
// Available cheques: status=1 (برسم التحصيل)
// After save:        status=2 (محصل)

export interface ChequeCollectionHeaderDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  DebitAcc: number;
  DebitAccName?: string;
  CreditAcc: number;
  CreditAccName?: string;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
}

export interface ChequeCollectionLineDto {
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

export interface ChequeCollectionVoucherDto {
  Header: ChequeCollectionHeaderDto;
  Lines: ChequeCollectionLineDto[];
}

export interface ChequeCollectionListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  Total: number;
  LineCount: number;
}

export interface ChequeCollectionListResponse {
  Items: ChequeCollectionListItemDto[];
  TotalCount: number;
}

export interface ChequeCollectionNavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface AvailableChequeForCollectionDto {
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

export interface SaveChequeCollectionLine {
  CheqNum?: string;
  Amt: number;
  Draw?: string;
  BankNum: number;
  Date1?: string;
  CustAcc: number;
  VhrNo?: string;
}

export interface SaveChequeCollectionRequest {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  DebitAcc: number;
  CreditAcc: number;
  CurNo: number;
  Rate: number;
  VouchAmt: number;
  UserName?: string;
  Lines: SaveChequeCollectionLine[];
}

export interface SaveChequeCollectionResult {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChequeCollectionService {
  private apiUrl = `${environment.apiUrl}/ChequeCollection`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getList(
    myYear: number, vType: number, page = 1, pageSize = 20
  ): Observable<ChequeCollectionListResponse> {
    const params = new HttpParams()
      .set('myYear',   myYear)
      .set('vType',    vType)
      .set('page',     page)
      .set('pageSize', pageSize);
    return this.http
      .get<ChequeCollectionListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number, myYear: number, vType: number
  ): Observable<ChequeCollectionVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeCollectionVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
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

  getNavigation(myYear: number, vType: number): Observable<ChequeCollectionNavigationDto> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType',  vType);
    return this.http
      .get<ChequeCollectionNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
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

  getAvailableCheques(): Observable<AvailableChequeForCollectionDto[]> {
    return this.http
      .get<AvailableChequeForCollectionDto[]>(`${this.apiUrl}/GetAvailableCheques`)
      .pipe(catchError(this.handleError('GetAvailableCheques')));
  }

  getChequesByNum(cheqNum: string): Observable<AvailableChequeForCollectionDto[]> {
    const params = new HttpParams().set('cheqNum', cheqNum);
    return this.http
      .get<AvailableChequeForCollectionDto[]>(`${this.apiUrl}/GetChequesByNum`, { params })
      .pipe(catchError(this.handleError('GetChequesByNum')));
  }

  save(request: SaveChequeCollectionRequest): Observable<SaveChequeCollectionResult> {
    return this.http
      .post<SaveChequeCollectionResult>(`${this.apiUrl}/Save`, request)
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
