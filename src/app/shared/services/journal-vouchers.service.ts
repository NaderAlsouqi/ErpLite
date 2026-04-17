import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

// ─── DTOs — PascalCase to match API ──────────

export interface JournalVoucherAttachmentDto {
  Id: number;
  TransNum: number;
  FileName: string;
  FilePath: string;
  ContentType?: string;
  FileSize: number;
  UploadDate: string;
}

export interface JournalVoucherHeaderDto {
  TransNum: number;
  DocNum: number;
  MyYear: number;
  VType: number;
  DocType: number;
  BrNo: number;
  Date: string;
  CurNo: number;
  Rate: number;
  Pay: number;
  UserName: string;
  Post: boolean;
  Picture?: string;
  PDFPath?: string;
  CurrencyName?: string;
  CurrencyEName?: string;
}

export interface JournalVoucherLineDto {
  RowId: number;
  TransNum: number;
  Acc: number;
  AccName?: string;
  AccEName?: string;
  Amt: number;
  Debit: number;
  Credit: number;
  Des?: string;
  CCntrNo: number;
}

export interface JournalVoucherDto {
  Header: JournalVoucherHeaderDto;
  Lines: JournalVoucherLineDto[];
  Attachments: JournalVoucherAttachmentDto[];
}

export interface JournalVoucherListItemDto {
  TransNum: number;
  DocNum: number;
  MyYear: number;
  VType: number;
  DocType: number;
  BrNo: number;
  Date: string;
  CurNo: number;
  Rate: number;
  UserName?: string;
  Post: boolean;
  PDFPath?: string;
  TotalDebit: number;
  TotalCredit: number;
  LineCount: number;
}

export interface JournalVoucherListResponse {
  Items: JournalVoucherListItemDto[];
  TotalCount: number;
}

export interface SaveJournalVoucherLineRequest {
  Acc: number;
  Debit: number;
  Credit: number;
  Des?: string;
  CCntrNo: number;
}

export interface SaveJournalVoucherRequest {
  TransNum: number;       // 0 = new
  DocNum: number;
  MyYear: number;
  VType: number;
  DocType: number;
  BrNo: number;
  Date: string;
  CurNo: number;
  Rate: number;
  Pay: number;
  UserName: string;
  PDFPath?: string;
  Picture?: string;
  Lines: SaveJournalVoucherLineRequest[];
}

export interface SaveJournalVoucherResult {
  Success: boolean;
  TransNum: number;
  DocNum: number;
  ErrorMessage?: string;
}

export interface DeleteResult {
  Success: boolean;
  ErrorMessage?: string;
}

export interface NavigationDto {
  MinDocNum: number;
  MaxDocNum: number;
}

// ─── Service ───────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class JournalVouchersService {
  private apiUrl = `${environment.apiUrl}/JournalVouchers`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

  getList(
    myYear: number,
    vType = 1,
    docType = 1,
    page = 1,
    pageSize = 20
  ): Observable<JournalVoucherListResponse> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('docType', docType)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http
      .get<JournalVoucherListResponse>(`${this.apiUrl}/GetList`, { params })
      .pipe(catchError(this.handleError('GetList')));
  }

  getVoucher(
    docNum: number,
    myYear: number,
    vType = 1,
    docType = 1
  ): Observable<JournalVoucherDto> {
    const params = new HttpParams()
      .set('docNum', docNum)
      .set('myYear', myYear)
      .set('vType', vType)
      .set('docType', docType);
    return this.http
      .get<JournalVoucherDto>(`${this.apiUrl}/GetVoucher`, { params })
      .pipe(catchError(this.handleError('GetVoucher')));
  }

  getNextDocNum(myYear: number, vType = 1, docType = 1): Observable<{ NextDocNum: number }> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('docType', docType);
    return this.http
      .get<{ NextDocNum: number }>(`${this.apiUrl}/GetNextDocNum`, { params })
      .pipe(catchError(this.handleError('GetNextDocNum')));
  }

  getNavigation(myYear: number, vType = 1, docType = 1): Observable<NavigationDto> {
    const params = new HttpParams()
      .set('myYear', myYear)
      .set('vType', vType)
      .set('docType', docType);
    return this.http
      .get<NavigationDto>(`${this.apiUrl}/GetNavigation`, { params })
      .pipe(catchError(this.handleError('GetNavigation')));
  }

  getAdjacentDocNum(
    currentDocNum: number,
    myYear: number,
    vType = 1,
    docType = 1,
    direction: 'PREV' | 'NEXT' = 'NEXT'
  ): Observable<{ DocNum: number }> {
    const params = new HttpParams()
      .set('currentDocNum', currentDocNum)
      .set('myYear', myYear)
      .set('vType', vType)
      .set('docType', docType)
      .set('direction', direction);
    return this.http
      .get<{ DocNum: number }>(`${this.apiUrl}/GetAdjacentDocNum`, { params })
      .pipe(catchError(this.handleError('GetAdjacentDocNum')));
  }

  save(request: SaveJournalVoucherRequest): Observable<SaveJournalVoucherResult> {
    return this.http
      .post<SaveJournalVoucherResult>(`${this.apiUrl}/Save`, request)
      .pipe(catchError(this.handleError('Save')));
  }

  delete(transNum: number): Observable<DeleteResult> {
    return this.http
      .delete<DeleteResult>(`${this.apiUrl}/Delete/${transNum}`)
      .pipe(catchError(this.handleError('Delete')));
  }

  // ─── Attachments ──────────────────────────────────────

  uploadAttachment(transNum: number, file: File): Observable<JournalVoucherAttachmentDto> {
    const formData = new FormData();
    formData.append('transNum', transNum.toString());
    formData.append('file', file);

    return this.http
      .post<JournalVoucherAttachmentDto>(`${this.apiUrl}/UploadAttachment`, formData)
      .pipe(catchError(this.handleError('UploadAttachment')));
  }

  deleteAttachment(id: number): Observable<{ Success: boolean }> {
    return this.http
      .delete<{ Success: boolean }>(`${this.apiUrl}/DeleteAttachment/${id}`)
      .pipe(catchError(this.handleError('DeleteAttachment')));
  }

  downloadAttachment(id: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/DownloadAttachment/${id}`, { responseType: 'blob' })
      .pipe(catchError(this.handleError('DownloadAttachment')));
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let msg = this.translate.instant('General.OperationFailed', { operation });
      if (error.status === 0) msg = this.translate.instant('General.ConnectionError');
      else if (error.status === 404) msg = this.translate.instant('General.NotFound');
      else if (error.error?.message) msg = error.error.message;
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
