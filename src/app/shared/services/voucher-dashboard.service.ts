import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VoucherDashboardRowDto {
  DocType: number;   // 1=G.L 2=Receipt 3=ChequePayment 4=CashPayment
  Ym:      string;   // 'YYYY-MM'
  Cnt:     number;
  Amt:     number;
}

export interface VoucherDashboardFilter {
  dateFrom:    string;
  dateTo:      string;
  curNo:       number | null;
  postStatus:  number | null;   // 1=posted, 0=unposted, null=all
}

@Injectable({ providedIn: 'root' })
export class VoucherDashboardService {
  private readonly base = `${environment.apiUrl}/VoucherDashboard`;

  constructor(private http: HttpClient) {}

  get(f: VoucherDashboardFilter): Observable<VoucherDashboardRowDto[]> {
    let p = new HttpParams()
      .set('dateFrom', f.dateFrom)
      .set('dateTo',   f.dateTo);
    if (f.curNo != null)      p = p.set('curNo', f.curNo);
    if (f.postStatus != null) p = p.set('postStatus', f.postStatus);
    return this.http.get<VoucherDashboardRowDto[]>(`${this.base}/Get`, { params: p });
  }
}
