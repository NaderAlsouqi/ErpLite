import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemLookup {
  ItemNo: string;
  ItemName?: string | null;
  Ename?: string | null;
}

export interface ItemUnit {
  UnitNo: number;
  UnitName?: string | null;
  UnitEname?: string | null;
  Operand: number;
}

export interface ItemBarcode {
  AutoNo: number;
  Barcode: string;
  Old: number;       // 1 = primary (read-only)
  Operand: number;
}

export interface SaveItemBarcodesRequest {
  ItemNo: string;
  UnitNo: number;
  Operand: number;
  Barcodes: string[];
}

@Injectable({ providedIn: 'root' })
export class ItemBarcodeService {
  private apiUrl = `${environment.apiUrl}/ItemBarcodes`;

  constructor(private http: HttpClient) {}

  searchItems(term: string): Observable<ItemLookup[]> {
    const params = new HttpParams().set('term', term || '');
    return this.http.get<ItemLookup[]>(`${this.apiUrl}/SearchItems`, { params });
  }

  getItemUnits(itemNo: string): Observable<ItemUnit[]> {
    return this.http.get<ItemUnit[]>(`${this.apiUrl}/GetItemUnits/${encodeURIComponent(itemNo)}`);
  }

  getBarcodes(itemNo: string, unitNo: number): Observable<ItemBarcode[]> {
    const params = new HttpParams().set('itemNo', itemNo).set('unitNo', unitNo);
    return this.http.get<ItemBarcode[]>(`${this.apiUrl}/GetBarcodes`, { params });
  }

  save(req: SaveItemBarcodesRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, req);
  }
}
