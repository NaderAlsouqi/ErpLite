import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WarehouseDashboardRowDto {
  DocType: number;   // 20=inbound 21=outbound 22=damage 24=transfer
  Ym:      string;   // 'YYYY-MM'
  Cnt:     number;
  Amt:     number;
}

export interface WarehouseDashboardFilter {
  dateFrom: string;
  dateTo:   string;
  storeNo:  number | null;   // null/0 = all stores
  serialNo: number | null;   // رقم التسلسل
  docNo:    number | null;   // رقم المستند
  amtFrom:  number | null;   // القيمة من
  amtTo:    number | null;   // القيمة إلى
}

@Injectable({ providedIn: 'root' })
export class WarehouseDashboardService {
  private readonly base = `${environment.apiUrl}/WarehouseDashboard`;

  constructor(private http: HttpClient) {}

  get(f: WarehouseDashboardFilter): Observable<WarehouseDashboardRowDto[]> {
    let p = new HttpParams()
      .set('dateFrom', f.dateFrom)
      .set('dateTo',   f.dateTo);
    if (f.storeNo != null)  p = p.set('storeNo', f.storeNo);
    if (f.serialNo != null) p = p.set('serialNo', f.serialNo);
    if (f.docNo != null)    p = p.set('docNo', f.docNo);
    if (f.amtFrom != null)  p = p.set('amtFrom', f.amtFrom);
    if (f.amtTo != null)    p = p.set('amtTo', f.amtTo);
    return this.http.get<WarehouseDashboardRowDto[]>(`${this.base}/Get`, { params: p });
  }
}
