import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs ─────────────────────────────────────────────────────

export interface ServBillHeaderDto {
  BillNo:      number;
  VType:       number;
  MyYear:      number;
  Date:        string;
  CusNo:       number;
  CusName:     string;
  CurNo:       number;
  Rate:        number;
  Dis:         number;
  TaxNo:       number;
  TaxTypeNo:   string;
  TaxPerc:     number;
  TaxAmt:      number;
  Total:       number;
  DTotal:      number;
  BrNo:        number;
  UserName:    string;
  TransNo:     number;
  CashPay:     number;
  CashAcc:     number;
  InvType:     number;
  SalNo:       number;
  Des:         string;
  CcntrNo:     string;
  PoNumber:    string;
  ContactP:    string;
  DelvTerm:    string;
  BankName:    string;
  BankAcc:     string;
  AccountName: string;
  IbanNumber:  string;
  SwiftNo:     string;
}

export interface ServBillLineDto {
  Des:     string;
  Qty:     number;
  Price:   number;
  AccNo:   number;
  AccName: string;
}

export interface ServBillVoucherDto {
  Header: ServBillHeaderDto;
  Lines:  ServBillLineDto[];
}

export interface ServBillGLEntryHeaderDto {
  TransNum:     number;
  DocNum:       string;
  Date:         string | null;
  DocType:      number;
  VType:        number;
  DocTypeName:  string;
  DocTypeEName: string;
}

export interface ServBillGLLineDto {
  AccNo:    string;
  AccName:  string;
  AccEName: string;
  Debit:    number;
  Credit:   number;
  Des:      string;
  CcntrNo:  number;
}

export interface ServBillGLEntryDto {
  Header: ServBillGLEntryHeaderDto | null;
  Lines:  ServBillGLLineDto[];
}

export interface ServBillListItemDto {
  BillNo:    number;
  VType:     number;
  MyYear:    number;
  Date:      string;
  CusName:   string;
  DTotal:    number;
  LineCount: number;
}

export interface ServBillListResponse {
  Items:      ServBillListItemDto[];
  TotalCount: number;
}

export interface ServBillNavigationDto {
  MinBillNo: number;
  MaxBillNo: number;
}

export interface SaveServBillLine {
  Des:   string;
  Qty:   number;
  Price: number;
  AccNo: number;
}

export interface SaveServBillRequest {
  BillNo:      number;
  VType:       number;
  DocType:     number;
  MyYear:      number;
  Date:        string;
  CusNo:       number;
  CusName:     string;
  CurNo:       number;
  Rate:        number;
  Dis:         number;
  TaxNo:       number;
  TaxTypeNo:   string;
  TaxPerc:     number;
  TaxAmt:      number;
  Total:       number;
  DTotal:      number;
  BrNo:        number;
  CusAcc:      number;
  TaxAcc:      number;
  UserName:    string;
  CashPay:     number;
  CashAcc:     number;
  InvType:     number;
  SalNo:       number;
  Des:         string;
  CcntrNo:     string;
  PoNumber:    string;
  ContactP:    string;
  DelvTerm:    string;
  BankName:    string;
  BankAcc:     string;
  AccountName: string;
  IbanNumber:  string;
  SwiftNo:     string;
  Lines:       SaveServBillLine[];
}

export interface SaveServBillResult {
  Success:      boolean;
  BillNo:       number;
  ErrorMessage?: string;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ServBillService {
  private apiUrl = `${environment.apiUrl}/ServBill`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  getList(myYear: number, vType = 1, page = 1, pageSize = 20): Observable<ServBillListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<ServBillListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(billNo: number, myYear: number, vType = 1): Observable<ServBillVoucherDto> {
    const params = new HttpParams()
      .set('billNo', billNo)
      .set('myYear', myYear)
      .set('vType', vType);
    return this.http
      .get<ServBillVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
      .pipe(catchError((error) => {
        if (error.status === 404) return throwError(() => error);
        return this.handleError('GetVoucher')(error);
      }));
  }

  getGLEntry(billNo: number, myYear: number, vType = 1): Observable<ServBillGLEntryDto> {
    const params = new HttpParams()
      .set('billNo', billNo)
      .set('myYear', myYear)
      .set('vType', vType);
    return this.http
      .get<ServBillGLEntryDto>(`${this.apiUrl}/GetGLEntry`, { params })
      .pipe(catchError(this.handleError('GetGLEntry')));
  }

  getNextBillNo(myYear: number, vType = 1): Observable<{ NextBillNo: number }> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<{ NextBillNo: number }>(`${this.apiUrl}/GetNextBillNo`, { params })
      .pipe(catchError(this.handleError('GetNextBillNo')));
  }

  getNavigation(myYear: number, vType = 1): Observable<ServBillNavigationDto> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http
      .get<ServBillNavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
      .pipe(catchError(this.handleError('GetNavigation')));
  }

  getAdjacentBillNo(
    currentBillNo: number,
    myYear: number,
    vType = 1,
    direction: 'PREV' | 'NEXT' = 'NEXT',
  ): Observable<{ BillNo: number }> {
    const params = new HttpParams()
      .set('currentBillNo', currentBillNo)
      .set('myYear', myYear)
      .set('vType', vType)
      .set('direction', direction);
    return this.http
      .get<{ BillNo: number }>(`${this.apiUrl}/GetAdjacentBillNo`, { params })
      .pipe(catchError(this.handleError('GetAdjacentBillNo')));
  }

  save(request: SaveServBillRequest): Observable<SaveServBillResult> {
    return this.http
      .post<SaveServBillResult>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  saveRefund(request: SaveServBillRequest): Observable<SaveServBillResult> {
    return this.http
      .post<SaveServBillResult>(`${this.apiUrl}/SaveRefund`, request)
      .pipe(catchError(this.handleError('SaveRefund')));
  }

  delete(billNo: number, myYear: number, vType: number): Observable<{ Success: boolean }> {
    const params = new HttpParams()
      .set('billNo', billNo)
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
      else if (error.error?.message) msg = error.error.message;
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
