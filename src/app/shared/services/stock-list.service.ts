import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StockListFilter {
  AsOfDate: string;
  StoreNo: number;          // 0 = all
  CatNo: number;            // 0 = all
  ItemNo?: string | null;   // single item (overrides category)
  ShowZero: boolean;
  LargestUnit: boolean;
  OrderBy: number;          // 0=ItemNo 1=ItemName 2=Cat+ItemNo 3=Cat+ItemName
}

export interface StockListRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  Unit: string;
  UnitE: string;
  QoH: number;
  AvgCost: number;
  TotalValue: number;
  Price: number;
}

@Injectable({ providedIn: 'root' })
export class StockListService {
  private base = `${environment.apiUrl}/StockList`;

  constructor(private http: HttpClient) {}

  getReport(f: StockListFilter): Observable<StockListRow[]> {
    let p = new HttpParams()
      .set('AsOfDate', f.AsOfDate)
      .set('StoreNo', f.StoreNo)
      .set('CatNo', f.CatNo)
      .set('ShowZero', f.ShowZero)
      .set('LargestUnit', f.LargestUnit)
      .set('OrderBy', f.OrderBy);
    if (f.ItemNo) p = p.set('ItemNo', f.ItemNo);
    return this.http.get<StockListRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
