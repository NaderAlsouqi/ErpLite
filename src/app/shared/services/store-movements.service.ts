import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoreMovementsFilter {
  DateFrom: string;
  DateTo: string;
  Store1: number;       // both 0 = all stores
  Store2: number;
  ItemNo?: string | null;
  VoucherType: number;  // 0 all, 1 inbound, 2 outbound, 3 transfer
}

export interface StoreMovementRow {
  DocNo: string;
  Kind: number;
  DocType: number;
  SampleFl: number;
  VType: number;
  TypeName: string;
  TypeEName: string;
  TransDate: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  InQty: number;
  OutQty: number;
  Cost: number;
  Total: number;
  Tax: number;
}

@Injectable({ providedIn: 'root' })
export class StoreMovementsService {
  private base = `${environment.apiUrl}/StoreMovements`;

  constructor(private http: HttpClient) {}

  getReport(f: StoreMovementsFilter): Observable<StoreMovementRow[]> {
    let p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('Store1', f.Store1)
      .set('Store2', f.Store2)
      .set('VoucherType', f.VoucherType);
    if (f.ItemNo) p = p.set('ItemNo', f.ItemNo);
    return this.http.get<StoreMovementRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
