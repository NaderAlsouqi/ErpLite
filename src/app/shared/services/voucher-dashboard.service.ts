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

export interface DashboardSerialOption {
  SerialNo:   number;
  SerialName: string;
}

export interface DashboardDocOption {
  DocNo:    number;
  SerialNo: number;
}

export interface DashboardFilterOptions {
  Serials: DashboardSerialOption[];
  Docs:    DashboardDocOption[];
}

export interface VoucherDashboardFilter {
  dateFrom:    string;
  dateTo:      string;
  curNo:       number | null;
  postStatus:  number | null;   // 1=posted, 0=unposted, null=all
  serialNo:    number | null;   // رقم التسلسل
  docNo:       number | null;   // رقم المستند
  amtFrom:     number | null;   // القيمة من
  amtTo:       number | null;   // القيمة إلى
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
    if (f.serialNo != null)   p = p.set('serialNo', f.serialNo);
    if (f.docNo != null)      p = p.set('docNo', f.docNo);
    if (f.amtFrom != null)    p = p.set('amtFrom', f.amtFrom);
    if (f.amtTo != null)      p = p.set('amtTo', f.amtTo);
    return this.http.get<VoucherDashboardRowDto[]>(`${this.base}/Get`, { params: p });
  }

  getOptions(): Observable<DashboardFilterOptions> {
    return this.http.get<DashboardFilterOptions>(`${this.base}/Options`);
  }
}
