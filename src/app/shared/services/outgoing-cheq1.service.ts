import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────

export interface OutgoingCheq1HeaderDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  AccNo: number;
  AccName?: string;
  CurNo: number;
  Rate: number;
  Sts: number;
  UserName?: string;
}

export interface OutgoingCheq1LineDto {
  CheqNum?: string;
  Date1?: string;
  BankNum: number;
  BankName?: string;
  Amt: number;
  CustAcc: number;
  CustAccName?: string;
  Draw?: string;
}

export interface OutgoingCheq1VoucherDto {
  Header: OutgoingCheq1HeaderDto;
  Lines: OutgoingCheq1LineDto[];
}

export interface OutgoingCheq1ListItemDto {
  DocNum: number;
  VType: number;
  MyYear: number;
  Date: string;
  Sts: number;
  Total: number;
  LineCount: number;
}

export interface OutgoingCheq1ListResponse {
  Items: OutgoingCheq1ListItemDto[];
  TotalCount: number;
}

export interface OutgoingCheq1NavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

export interface OutgoingCheq1LineListItemDto {
  DocNum: number;
  Date: string;
  CheqNum?: string;
  Date1?: string;
  BankNum: number;
  BankName?: string;
  Amt: number;
  CustAcc: number;
  CustAccName?: string;
  Draw?: string;
}

export interface OutgoingCheq1LinesListResponse {
  Items: OutgoingCheq1LineListItemDto[];
  TotalCount: number;
}

export interface SaveOutgoingCheq1Line {
  CheqNum?: string;
  Date1?: string;
  BankNum: number;
  Amt: number;
  CustAcc: number;
  Draw?: string;
}

export interface SaveOutgoingCheq1Request {
  DocNum: number;
  VType: number;
  MyYear: number;
  BrNo: number;
  Date: string;
  AccNo: number;
  CurNo: number;
  Rate: number;
  Sts: number;
  UserName?: string;
  Lines: SaveOutgoingCheq1Line[];
}

export interface SaveOutgoingCheq1Result {
  Success: boolean;
  DocNum: number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OutgoingCheq1Service {
  private apiUrl = `${environment.apiUrl}/OutgoingCheq1`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getLinesList(myYear: number, vType = 1, page = 1, pageSize = 50): Observable<OutgoingCheq1LinesListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<OutgoingCheq1LinesListResponse>(`${this.apiUrl}/GetLinesList`, { params })
      .pipe(catchError(this.handleError('GetLinesList')));
  }

  getList(myYear: number, vType = 1, page = 1, pageSize = 20): Observable<OutgoingCheq1ListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<OutgoingCheq1ListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(docNum: number, myYear: number, vType = 1): Observable<OutgoingCheq1VoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType', vType);
    return this.http
      .get<OutgoingCheq1VoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
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

  getNavigation(myYear: number, vType = 1): Observable<OutgoingCheq1NavigationDto> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<OutgoingCheq1NavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
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

  save(request: SaveOutgoingCheq1Request): Observable<SaveOutgoingCheq1Result> {
    return this.http
      .post<SaveOutgoingCheq1Result>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  delete(docNum: number, myYear: number, vType: number): Observable<{ Success: boolean }> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType', vType);
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
