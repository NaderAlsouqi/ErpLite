import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemPricesFilter {
  ItemFrom?: string | null;
  ItemTo?: string | null;
  ShowZero: boolean;
}

export interface ItemPriceRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  CategNo: number | null;
  CatName: string | null;
  CatEName: string | null;
  Price: number;
  MinPrice: number;
  Discount: number;
  Bonus: number;
}

@Injectable({ providedIn: 'root' })
export class ItemPricesService {
  private base = `${environment.apiUrl}/ItemPrices`;

  constructor(private http: HttpClient) {}

  getReport(f: ItemPricesFilter): Observable<ItemPriceRow[]> {
    let p = new HttpParams().set('ShowZero', f.ShowZero);
    if (f.ItemFrom) p = p.set('ItemFrom', f.ItemFrom);
    if (f.ItemTo) p = p.set('ItemTo', f.ItemTo);
    return this.http.get<ItemPriceRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
