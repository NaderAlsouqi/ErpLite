import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StagnantItemsFilter {
  DateFrom: string;   // yyyy-MM-dd
  DateTo: string;
  StoreNo: number;    // 0 = all stores
  CatNo: number;      // 0 = all categories; else category + route subtree
  OrderBy: number;    // 0 = item no, 1 = item name, 2 = category no
}

export interface StagnantItemRow {
  ItemNo: string;
  ItemName: string;
  ItemEName: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  UnitNo: number;
  UnitName: string;
  UnitEName: string;
}

@Injectable({ providedIn: 'root' })
export class StagnantItemsService {
  private base = `${environment.apiUrl}/StagnantItems`;

  constructor(private http: HttpClient) {}

  getReport(f: StagnantItemsFilter): Observable<StagnantItemRow[]> {
    const p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('StoreNo', f.StoreNo)
      .set('CatNo', f.CatNo)
      .set('OrderBy', f.OrderBy);
    return this.http.get<StagnantItemRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
