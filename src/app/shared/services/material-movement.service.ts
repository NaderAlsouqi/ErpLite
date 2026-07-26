import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaterialMovementFilter {
  DateFrom: string;
  DateTo: string;
  ItemFrom?: string | null;
  ItemTo?: string | null;
  StoreFrom: number;        // 0 = all
  StoreTo: number;
  TransfersOnly: boolean;
  LargestUnit: boolean;
}

export interface MaterialMovementRow {
  ItemNo: string;
  ItemName: string;
  Ename: string;
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  RowType: 'O' | 'M';       // opening / movement
  TransDate: string | null;
  DocNo: string | null;
  Kind: number | null;      // 1=in 2=out 3=write-off
  Des: string | null;
  StoreNo: number | null;
  StoreName: string | null;
  StoreEName: string | null;
  InQty: number;
  InAmount: number;
  OutQty: number;
  OutAmount: number;
  OpeningQty: number;
  OpeningAmount: number;
}

@Injectable({ providedIn: 'root' })
export class MaterialMovementService {
  private base = `${environment.apiUrl}/MaterialMovement`;

  constructor(private http: HttpClient) {}

  getReport(f: MaterialMovementFilter): Observable<MaterialMovementRow[]> {
    let p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('StoreFrom', f.StoreFrom)
      .set('StoreTo', f.StoreTo)
      .set('TransfersOnly', f.TransfersOnly)
      .set('LargestUnit', f.LargestUnit);
    if (f.ItemFrom) p = p.set('ItemFrom', f.ItemFrom);
    if (f.ItemTo) p = p.set('ItemTo', f.ItemTo);
    return this.http.get<MaterialMovementRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
