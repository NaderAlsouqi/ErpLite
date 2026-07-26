import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemsPricingFilter {
  ItemNo?: string | null;   // single item; null = all
  CatNo: number;            // 0 = all
  QtyFilter: number;        // 0 = all, 1 = only Qty=0, 2 = hide Qty=0
  OrderBy: number;          // 0 = TypeNo,ItemNo   1 = TypeNo,ItemName
}

export interface ItemPricingRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  Category: string;
  CategoryE: string;
  Barcode: string;
  Unit: string;
  UnitE: string;
  Operand: number;
  Price: number;
  Tax: number;
  Qty: number;
  FamilyNo: number;
  Family: string;
  FamilyE: string;
  Brand: string;
  BrandE: string;
  Origin: string;
  OriginE: string;
}

@Injectable({ providedIn: 'root' })
export class ItemsPricingService {
  private base = `${environment.apiUrl}/ItemsPricing`;

  constructor(private http: HttpClient) {}

  getReport(f: ItemsPricingFilter): Observable<ItemPricingRow[]> {
    let p = new HttpParams()
      .set('CatNo', f.CatNo)
      .set('QtyFilter', f.QtyFilter)
      .set('OrderBy', f.OrderBy);
    if (f.ItemNo) p = p.set('ItemNo', f.ItemNo);
    return this.http.get<ItemPricingRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
