import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrialBalanceFilterDto {
  DateFrom:         string;
  DateTo:           string;
  Level:            number;
  AllBranches:      boolean;
  BranchNo?:        number | null;
  Detailed:         boolean;   // true = تفصيلي, false = عادي
  Posted?:          number | null;  // 0 = unposted, 1 = posted, null = both
  ExcludeClosing:   boolean;
  ShowZero:         boolean;
  SubAccountsOnly:  boolean;
}

export interface TrialBalanceRowDto {
  AccNo:         number;
  AccName:       string;
  AccEName:      string;
  BegB:          number;
  Dbtrans:       number;
  Crtrans:       number;
  DebitBalance:  number;
  CreditBalance: number;
  Level:         number;
  Branch:        number;
  Accord:        string;
}

@Injectable({ providedIn: 'root' })
export class TrialBalanceService {
  private readonly base = `${environment.apiUrl}/TrialBalance`;

  constructor(private http: HttpClient) {}

  getReport(f: TrialBalanceFilterDto): Observable<TrialBalanceRowDto[]> {
    let p = new HttpParams()
      .set('DateFrom',        f.DateFrom)
      .set('DateTo',          f.DateTo)
      .set('Level',           f.Level)
      .set('AllBranches',     f.AllBranches     ? 'true' : 'false')
      .set('Detailed',        f.Detailed        ? 'true' : 'false')
      .set('ExcludeClosing',  f.ExcludeClosing  ? 'true' : 'false')
      .set('ShowZero',        f.ShowZero        ? 'true' : 'false')
      .set('SubAccountsOnly', f.SubAccountsOnly ? 'true' : 'false');
    if (f.BranchNo != null) p = p.set('BranchNo', f.BranchNo);
    if (f.Posted   != null) p = p.set('Posted',   f.Posted);
    return this.http.get<TrialBalanceRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
