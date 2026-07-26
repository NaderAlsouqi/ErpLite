import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaterialRequestLine {
  ItemNo?: string | null;
  ItemName?: string | null;
  UnitNo?: number | null;
  UnitName?: string | null;
  Qty?: number | null;
  Barcode?: string | null;
  Operand?: number | null;
}

export interface MaterialRequest {
  OrderNo?: string | null;
  ODate?: string | null;      // yyyy-MM-dd
  Section?: string | null;
  Notes?: string | null;
  State?: number;
  Lines: MaterialRequestLine[];
}

export interface MaterialRequestListRow {
  OrderNo: string;
  ODate?: string | null;
  Section?: string | null;
  State?: number;
}

export interface MaterialRequestItemUnit {
  UnitNo: number;
  UnitName?: string | null;
  UnitEname?: string | null;
  Operand: number;
  Barcode?: string | null;
}

export interface MaterialRequestItemDetails {
  ItemNo?: string | null;
  ItemName?: string | null;
  Ename?: string | null;
  Units: MaterialRequestItemUnit[];
}

@Injectable({ providedIn: 'root' })
export class MaterialRequestService {
  private apiUrl = `${environment.apiUrl}/MaterialRequests`;

  constructor(private http: HttpClient) {}

  nextNo(): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`);
  }

  list(): Observable<MaterialRequestListRow[]> {
    return this.http.get<MaterialRequestListRow[]>(`${this.apiUrl}/List`);
  }

  get(orderNo: string): Observable<MaterialRequest> {
    return this.http.get<MaterialRequest>(`${this.apiUrl}/Get/${encodeURIComponent(orderNo)}`);
  }

  itemDetails(itemNo: string): Observable<MaterialRequestItemDetails> {
    return this.http.get<MaterialRequestItemDetails>(`${this.apiUrl}/ItemDetails/${encodeURIComponent(itemNo)}`);
  }

  save(req: MaterialRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, req);
  }

  delete(orderNo: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${encodeURIComponent(orderNo)}`);
  }
}
