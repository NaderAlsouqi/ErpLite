import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaterialBalancesFilter {
  DateFrom: string;
  DateTo: string;
  ItemFrom?: string | null;
  ItemTo?: string | null;
  CatNo: number;            // 0 = all
  StoreFrom: number;        // 0 = all
  StoreTo: number;
  ExcludeTransfers: boolean;
  ShowZero: boolean;
  LargestUnit: boolean;
  OrderBy: number;          // 0=ItemNo 1=ItemName 2=Cat+ItemNo 3=Cat+ItemName 4=ItemNo numeric
}

export interface MaterialBalanceRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  Unit: string;
  UnitE: string;
  OpeningQty: number;
  TotalIn: number;
  TotalOut: number;
  NetBalance: number;
  AvgCost: number;
  TotalValue: number;
}

@Injectable({ providedIn: 'root' })
export class MaterialBalancesService {
  private base = `${environment.apiUrl}/MaterialBalances`;

  constructor(private http: HttpClient) {}

  getReport(f: MaterialBalancesFilter): Observable<MaterialBalanceRow[]> {
    let p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('CatNo', f.CatNo)
      .set('StoreFrom', f.StoreFrom)
      .set('StoreTo', f.StoreTo)
      .set('ExcludeTransfers', f.ExcludeTransfers)
      .set('ShowZero', f.ShowZero)
      .set('LargestUnit', f.LargestUnit)
      .set('OrderBy', f.OrderBy);
    if (f.ItemFrom) p = p.set('ItemFrom', f.ItemFrom);
    if (f.ItemTo) p = p.set('ItemTo', f.ItemTo);
    return this.http.get<MaterialBalanceRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
