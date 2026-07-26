import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CategoryDisbursementFilter {
  DateFrom: string;   // yyyy-MM-dd
  DateTo: string;
  CatNo: number;      // 0 = all categories
  EntityNo: number;   // 0 = all جهات
}

export interface CategoryDisbursementRow {
  ItemNo: string;
  ItemName: string;
  ItemEName: string;
  UnitName: string;
  UnitEName: string;
  TotQty: number;
  TotalPrice: number;
  AvgCost: number;
  Wcost: number;
}

@Injectable({ providedIn: 'root' })
export class CategoryDisbursementService {
  private base = `${environment.apiUrl}/CategoryDisbursement`;

  constructor(private http: HttpClient) {}

  getReport(f: CategoryDisbursementFilter): Observable<CategoryDisbursementRow[]> {
    const p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('CatNo', f.CatNo)
      .set('EntityNo', f.EntityNo);
    return this.http.get<CategoryDisbursementRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
