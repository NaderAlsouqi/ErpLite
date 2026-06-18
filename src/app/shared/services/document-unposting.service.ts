import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DocumentPostingFilterDto,
  UnpostedDocumentDto,
} from './document-posting.service';

export interface UnpostDocumentsResultDto {
  UnpostedCount: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentUnpostingService {
  private readonly base = `${environment.apiUrl}/DocumentUnposting`;

  constructor(private http: HttpClient) {}

  getPosted(filter: DocumentPostingFilterDto): Observable<UnpostedDocumentDto[]> {
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

    return this.http.get<UnpostedDocumentDto[]>(`${this.base}/GetPosted`, { params });
  }

  unpostDocuments(filter: DocumentPostingFilterDto): Observable<UnpostDocumentsResultDto> {
    return this.http.post<UnpostDocumentsResultDto>(`${this.base}/Unpost`, filter);
  }
}
