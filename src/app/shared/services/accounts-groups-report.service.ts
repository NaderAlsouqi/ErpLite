import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountsGroupsReportFilterDto {
  GroupNo:  number;
  DateFrom: string;
  DateTo:   string;
}

export interface AccountsGroupsReportRowDto {
  AccNo:       number;
  AccName:     string;
  AccEName:    string;
  BegDebit:    number;
  BegCredit:   number;
  DebitTrans:  number;
  CreditTrans: number;
  EndDebit:    number;
  EndCredit:   number;
}

@Injectable({ providedIn: 'root' })
export class AccountsGroupsReportService {
  private readonly base = `${environment.apiUrl}/AccountsGroupsReport`;

  constructor(private http: HttpClient) {}

  getReport(f: AccountsGroupsReportFilterDto): Observable<AccountsGroupsReportRowDto[]> {
    const p = new HttpParams()
      .set('GroupNo',  f.GroupNo)
      .set('DateFrom', f.DateFrom)
      .set('DateTo',   f.DateTo);
    return this.http.get<AccountsGroupsReportRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
