import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface YearEndClosingRequestDto {
  Year:            number;
  PnlAcc:          number;
  CloseInventory:  boolean;
  OpeningInvAcc:   number;
  OpeningInvValue: number;
  ClosingInvAcc:   number;
  ClosingInvValue: number;
}

export interface YearEndClosingResultDto {
  TransNum:     number;
  LinesCreated: number;
}

@Injectable({ providedIn: 'root' })
export class YearEndClosingService {
  private readonly base = `${environment.apiUrl}/YearEndClosing`;

  constructor(private http: HttpClient) {}

  execute(req: YearEndClosingRequestDto): Observable<YearEndClosingResultDto> {
    return this.http.post<YearEndClosingResultDto>(`${this.base}/Execute`, req);
  }

  deleteEntry(year: number): Observable<{ Deleted: number }> {
    const p = new HttpParams().set('year', year);
    return this.http.delete<{ Deleted: number }>(`${this.base}/Delete`, { params: p });
  }
}
