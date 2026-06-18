import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UnpostedDocumentDto {
  TransNum:   number;
  DocNum:     number;
  MyYear:     number;
  VType:      number;
  DocType:    number;
  Date:       string;
  SerialName: string;
  Post:       boolean;
}

export interface DocumentPostingFilterDto {
  FilterMode:  'Date' | 'DocNum';
  DocNumFrom?: number | null;
  DocNumTo?:   number | null;
  DateFrom?:   string | null;
  DateTo?:     string | null;
  DocType:     number;
  VType?:      number | null;
  MyYear:      number;
}

export interface PostDocumentsResultDto {
  PostedCount: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentPostingService {
  private readonly base = `${environment.apiUrl}/DocumentPosting`;

  constructor(private http: HttpClient) {}

  getUnposted(filter: DocumentPostingFilterDto): Observable<UnpostedDocumentDto[]> {
    let params = new HttpParams()
      .set('FilterMode', filter.FilterMode)
      .set('DocType',    filter.DocType)
      .set('MyYear',     filter.MyYear);

    if (filter.FilterMode === 'DocNum') {
      if (filter.DocNumFrom != null) params = params.set('DocNumFrom', filter.DocNumFrom);
      if (filter.DocNumTo   != null) params = params.set('DocNumTo',   filter.DocNumTo);
    } else {
      if (filter.DateFrom) params = params.set('DateFrom', filter.DateFrom);
      if (filter.DateTo)   params = params.set('DateTo',   filter.DateTo);
    }
    if (filter.VType != null) params = params.set('VType', filter.VType);

    return this.http.get<UnpostedDocumentDto[]>(`${this.base}/GetUnposted`, { params });
  }

  postDocuments(filter: DocumentPostingFilterDto): Observable<PostDocumentsResultDto> {
    return this.http.post<PostDocumentsResultDto>(`${this.base}/Post`, filter);
  }
}
