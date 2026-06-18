import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BeginningBalancesFilterDto {
  Year:     number;
  Level:    number;
  ShowZero: boolean;
}

export interface BeginningBalanceRowDto {
  AccNo:    number;
  Lvl:      number;
  AccName:  string;
  AccEName: string;
  CurNo:    number;
  CurName:  string;
  CurEName: string;
  Debit:    number;
  Credit:   number;
}

@Injectable({ providedIn: 'root' })
export class BeginningBalancesService {
  private readonly base = `${environment.apiUrl}/BeginningBalances`;

  constructor(private http: HttpClient) {}

  getReport(f: BeginningBalancesFilterDto): Observable<BeginningBalanceRowDto[]> {
    const p = new HttpParams()
      .set('Year',     f.Year)
      .set('Level',    f.Level)
      .set('ShowZero', f.ShowZero ? 'true' : 'false');
    return this.http.get<BeginningBalanceRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
