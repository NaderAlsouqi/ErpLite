import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface JvReportLineDto {
  TransNum:   number;
  DocNum:     number;
  VType:      number;
  DocType:    number;
  Date:       string;
  SerialName: string;
  Des:        string;
  AccNo:      number;
  AccName:    string;
  CcName:     string;
  Debit:      number;
  Credit:     number;
  LineSeq:    number;
}

export interface JvVoucherTypeDto {
  VTypeNo: number;
  TName:   string;
  TEName:  string;
}

export interface JvReportFilterDto {
  FilterMode?: string;
  DateFrom?:   string | null;
  DateTo?:     string | null;
  DocNumFrom?: number | null;
  DocNumTo?:   number | null;
  VType?:      number | null;
  DocType?:    number | null;
  PostStatus?: number | null;
  OrderBy?:    string;
  SearchDes?:  string | null;
  AccNo?:      number | null;
  AmtFrom?:    number | null;
  AmtTo?:      number | null;
}

@Injectable({ providedIn: 'root' })
export class JournalVoucherReportService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  getReport(filter: JvReportFilterDto): Observable<JvReportLineDto[]> {
    let params = new HttpParams();
    if (filter.FilterMode)  params = params.set('filterMode',  filter.FilterMode);
    if (filter.DateFrom)    params = params.set('dateFrom',    filter.DateFrom);
    if (filter.DateTo)      params = params.set('dateTo',      filter.DateTo);
    if (filter.DocNumFrom != null) params = params.set('docNumFrom', filter.DocNumFrom);
    if (filter.DocNumTo   != null) params = params.set('docNumTo',   filter.DocNumTo);
    if (filter.VType      != null) params = params.set('vType',      filter.VType);
    if (filter.DocType    != null) params = params.set('docType',    filter.DocType);
    if (filter.PostStatus != null) params = params.set('postStatus', filter.PostStatus);
    if (filter.OrderBy)    params = params.set('orderBy',    filter.OrderBy);
    if (filter.SearchDes)  params = params.set('searchDes',  filter.SearchDes);
    if (filter.AccNo      != null) params = params.set('accNo',      filter.AccNo);
    if (filter.AmtFrom    != null) params = params.set('amtFrom',    filter.AmtFrom);
    if (filter.AmtTo      != null) params = params.set('amtTo',      filter.AmtTo);

    return this.http.get<JvReportLineDto[]>(`${this.apiUrl}/JournalVoucherReport/GetReport`, { params })
      .pipe(catchError(this.handleError()));
  }

  getVoucherTypes(): Observable<JvVoucherTypeDto[]> {
    return this.http.get<JvVoucherTypeDto[]>(`${this.apiUrl}/JournalVoucherReport/GetVoucherTypes`)
      .pipe(catchError(this.handleError()));
  }

  private handleError() {
    return (error: unknown): Observable<never> => {
      this.toastr.error(this.translate.instant('General.ErrorOccurred'));
      return throwError(() => error);
    };
  }
}
