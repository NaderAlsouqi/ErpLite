import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** One serial number to persist for a voucher line. */
export interface SerialLine {
  ItemNo: string;
  StoreNo: number;
  BatchNo?: string;
  SerialNo: string;
}

/** Save request for a voucher's serials (inbound=1 / outbound=2 / damage=3). */
export interface SaveVoucherSerials {
  DocNo: string;
  Kind: number;
  VType: number;
  Myear: number;
  DocType: string;   // '20' / '21' / '22'
  Branch: number;
  DocDate: string;
  Serials: SerialLine[];
}

export interface VoucherSerialRow { ItemNo: string; SerialNo: string; }

@Injectable({ providedIn: 'root' })
export class SerialsService {
  private apiUrl = `${environment.apiUrl}/Serials`;

  constructor(private http: HttpClient) {}

  /** Serials in stock for an item (+ store) — for the outbound/damage picker. */
  available(item: string, store: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/Available`,
      { params: new HttpParams().set('item', item).set('store', store) });
  }

  /** A voucher's already-saved serials (for edit/load). */
  list(docNo: string, kind: number, vType: number, myear: number): Observable<VoucherSerialRow[]> {
    return this.http.get<VoucherSerialRow[]>(`${this.apiUrl}/List`,
      { params: new HttpParams().set('docNo', docNo).set('kind', kind).set('vType', vType).set('myear', myear) });
  }

  /** Persist a voucher's serials (after the voucher itself is saved). */
  save(dto: SaveVoucherSerials): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Save`, dto);
  }
}
