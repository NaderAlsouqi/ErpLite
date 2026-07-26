import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BatchExpiryFilter {
  ItemNo?: string | null;   // single item; null = all
  StoreNo: number;          // single store; 0 = all
  ExpMode: number;          // 0 = all, 1 = exact, 2 = up-to
  ExpDate?: string | null;  // 'YYYY/MM/DD' for modes 1/2
  BatchNo?: string | null;  // specific batch; null = all
}

export interface BatchExpiryRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  ExpDate: string;
  BatchNo: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  Qty: number;
}

@Injectable({ providedIn: 'root' })
export class BatchExpiryService {
  private base = `${environment.apiUrl}/BatchExpiry`;

  constructor(private http: HttpClient) {}

  getReport(f: BatchExpiryFilter): Observable<BatchExpiryRow[]> {
    let p = new HttpParams()
      .set('StoreNo', f.StoreNo)
      .set('ExpMode', f.ExpMode);
    if (f.ItemNo) p = p.set('ItemNo', f.ItemNo);
    if (f.ExpDate) p = p.set('ExpDate', f.ExpDate);
    if (f.BatchNo) p = p.set('BatchNo', f.BatchNo);
    return this.http.get<BatchExpiryRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
