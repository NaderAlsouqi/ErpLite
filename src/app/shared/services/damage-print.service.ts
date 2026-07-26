import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DamagePrintFilter {
  Year: number;
  SerialNo: number;
  DocNo: string;
}

export interface DamagePrintRow {
  DocNo: string;
  TransDate: string;
  AccNo: number;
  Des: string;
  CustomerName: string;
  SerialName: string;
  SerialEName: string;
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  Qty: number;
  BatchNo: string;
  ExpDate: string;
}

@Injectable({ providedIn: 'root' })
export class DamagePrintService {
  private base = `${environment.apiUrl}/DamagePrint`;

  constructor(private http: HttpClient) {}

  getReport(f: DamagePrintFilter): Observable<DamagePrintRow[]> {
    const p = new HttpParams()
      .set('Year', f.Year)
      .set('SerialNo', f.SerialNo)
      .set('DocNo', f.DocNo);
    return this.http.get<DamagePrintRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
