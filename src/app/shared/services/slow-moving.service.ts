import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SlowMovingFilter {
  DateFrom: string;   // yyyy-MM-dd
  DateTo: string;
  Pct: number;        // threshold percent (نسبة الحركة أقل من)
  StoreNo: number;    // 0 = all stores
  CatNo: number;      // 0 = all categories; else exact type_no
  OrderBy: number;    // 0 item no, 1 item name, 2 category no, 5 trans %
}

export interface SlowMovingRow {
  ItemNo: string;
  ItemName: string;
  ItemEName: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  QtyIn: number;
  QtyOut: number;
  Balance: number;
  Perc: number;       // ratio (out/in); shown *100 as %
}

@Injectable({ providedIn: 'root' })
export class SlowMovingService {
  private base = `${environment.apiUrl}/SlowMoving`;

  constructor(private http: HttpClient) {}

  getReport(f: SlowMovingFilter): Observable<SlowMovingRow[]> {
    const p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('Pct', f.Pct)
      .set('StoreNo', f.StoreNo)
      .set('CatNo', f.CatNo)
      .set('OrderBy', f.OrderBy);
    return this.http.get<SlowMovingRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
