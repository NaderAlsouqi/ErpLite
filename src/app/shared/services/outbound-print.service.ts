import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OutboundPrintFilter {
  Year: number;
  SerialNo: number;
  DocNo: string;
}

export interface OutboundPrintRow {
  DocNo: string;
  TransDate: string;
  AccNo: number;
  Des: string;
  CustomerName: string;
  TargetName: string;
  TargetEName: string;
  SerialName: string;
  SerialEName: string;
  CounterKey: number;
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  Qty: number;
  Cost: number;
  Total: number;
  CrAccNo: number;
  CrAccName: string;
  DrAccNo: number;
  DrAccName: string;
  BatchNo: string;
  ExpDate: string;
}

@Injectable({ providedIn: 'root' })
export class OutboundPrintService {
  private base = `${environment.apiUrl}/OutboundPrint`;

  constructor(private http: HttpClient) {}

  getReport(f: OutboundPrintFilter): Observable<OutboundPrintRow[]> {
    const p = new HttpParams()
      .set('Year', f.Year)
      .set('SerialNo', f.SerialNo)
      .set('DocNo', f.DocNo);
    return this.http.get<OutboundPrintRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
