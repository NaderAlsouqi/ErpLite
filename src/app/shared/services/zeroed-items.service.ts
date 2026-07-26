import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ZeroedItemsFilter {
  CatNo: number;      // 0 = all
  OrderBy: number;    // 0 = Item No, 1 = Item Name
}

export interface ZeroedItemRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  OnHand: number;
}

@Injectable({ providedIn: 'root' })
export class ZeroedItemsService {
  private base = `${environment.apiUrl}/ZeroedItems`;

  constructor(private http: HttpClient) {}

  getReport(f: ZeroedItemsFilter): Observable<ZeroedItemRow[]> {
    const p = new HttpParams()
      .set('CatNo', f.CatNo)
      .set('OrderBy', f.OrderBy);
    return this.http.get<ZeroedItemRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
