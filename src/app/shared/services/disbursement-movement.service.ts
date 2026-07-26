import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DisbursementMovementFilter {
  DateFrom: string;   // yyyy-MM-dd
  DateTo: string;
  Kind: number;       // 1 = input (سندات الادخال), 2 = output (سندات الاخراج)
  EntityNo: number;   // 0 = all جهات
  ItemFrom: string;   // item-code range ('' = all)
  ItemTo: string;
}

export interface DisbursementMovementRow {
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

export interface DisbursementEntity {
  EntityNo: number;
  Name: string;
  EName: string;
}

@Injectable({ providedIn: 'root' })
export class DisbursementMovementService {
  private base = `${environment.apiUrl}/DisbursementMovement`;

  constructor(private http: HttpClient) {}

  getReport(f: DisbursementMovementFilter): Observable<DisbursementMovementRow[]> {
    const p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('Kind', f.Kind)
      .set('EntityNo', f.EntityNo)
      .set('ItemFrom', f.ItemFrom || '')
      .set('ItemTo', f.ItemTo || '');
    return this.http.get<DisbursementMovementRow[]>(`${this.base}/GetReport`, { params: p });
  }

  getEntities(): Observable<DisbursementEntity[]> {
    return this.http.get<DisbursementEntity[]>(`${this.base}/Entities`);
  }
}
