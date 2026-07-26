import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReorderLevelFilter {
  CatNo: number;      // 0 = all
  StoreNo: number;    // 0 = all
  OrderBy: number;    // 0 = Item No, 1 = Item Name
}

export interface ReorderLevelRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  OnHand: number;        // current net stock
  OnOrder: number;       // invf.OQ2
  ReorderPoint: number;  // invf.OL
  OrderQty: number;      // invf.OQ1
}

@Injectable({ providedIn: 'root' })
export class ReorderLevelService {
  private base = `${environment.apiUrl}/ReorderLevel`;

  constructor(private http: HttpClient) {}

  getReport(f: ReorderLevelFilter): Observable<ReorderLevelRow[]> {
    const p = new HttpParams()
      .set('CatNo', f.CatNo)
      .set('StoreNo', f.StoreNo)
      .set('OrderBy', f.OrderBy);
    return this.http.get<ReorderLevelRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
