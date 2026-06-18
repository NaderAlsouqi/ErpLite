import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountLedgerRowDto {
  DocNum:       string;
  DocDate:      string;
  DocType:      number;
  VType:        number;
  DocTypeName:  string;
  DocTypeEName: string;
  Des:          string;
  Debit:        number;
  Credit:       number;
  Balance:      number;
}

export interface AccountLedgerResultDto {
  OpeningBalance: number;
  FinalBalance:   number;
  Rows:           AccountLedgerRowDto[];
}

@Injectable({ providedIn: 'root' })
export class AccountLedgerService {
  private readonly base = `${environment.apiUrl}/AccountLedger`;

  constructor(private http: HttpClient) {}

  getLedger(accNo: number, dateFrom: string, dateTo: string): Observable<AccountLedgerResultDto> {
    const p = new HttpParams()
      .set('accNo', accNo)
      .set('dateFrom', dateFrom)
      .set('dateTo', dateTo);
    return this.http.get<AccountLedgerResultDto>(`${this.base}/GetLedger`, { params: p });
  }
}
