import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TransferPrintFilter {
  Year: number;
  SerialNo: number;
  DocNo: string;
}

export interface TransferPrintRow {
  DocNo: string;
  TransDate: string;
  FromStore: number;
  FromStoreName: string;
  FromStoreEName: string;
  ToStore: number;
  ToStoreName: string;
  ToStoreEName: string;
  Des: string;
  Notes: string;
  SerialName: string;
  SerialEName: string;
  RowId: number;
  ItemNo: string;
  ItemName: string;
  Ename: string;
  Unit: string;
  UnitE: string;
  Qty: number;
  BatchNo: string;
  ExpDate: string;
}

@Injectable({ providedIn: 'root' })
export class TransferPrintService {
  private base = `${environment.apiUrl}/TransferPrint`;

  constructor(private http: HttpClient) {}

  getReport(f: TransferPrintFilter): Observable<TransferPrintRow[]> {
    const p = new HttpParams()
      .set('Year', f.Year)
      .set('SerialNo', f.SerialNo)
      .set('DocNo', f.DocNo);
    return this.http.get<TransferPrintRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
