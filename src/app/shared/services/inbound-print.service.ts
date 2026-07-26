import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InboundPrintFilter {
  Year: number;
  SerialNo: number;
  DocNo: string;
}

export interface InboundPrintRow {
  DocNo: string;
  TransDate: string;
  AccNo: number;
  Des: string;
  VendorName: string;
  VendorEName: string;
  SerialName: string;
  SerialEName: string;
  CounterKey: number;
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Barcode: string;
  Unit: string;
  UnitE: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  Qty: number;
  Cost: number;
  Total: number;
  Price: number;
  ExpDate: string;
  BatchNo: string;
}

@Injectable({ providedIn: 'root' })
export class InboundPrintService {
  private base = `${environment.apiUrl}/InboundPrint`;

  constructor(private http: HttpClient) {}

  getReport(f: InboundPrintFilter): Observable<InboundPrintRow[]> {
    const p = new HttpParams()
      .set('Year', f.Year)
      .set('SerialNo', f.SerialNo)
      .set('DocNo', f.DocNo);
    return this.http.get<InboundPrintRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
