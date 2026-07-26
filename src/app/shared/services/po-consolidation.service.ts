import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** One purchase order with the عرض سعر it was approved from. */
export interface PoConsolidationRow {
  OrderNo: string;
  Myear: number;
  VType: number;
  ODate?: string | null;
  VenNo: number;
  VenName?: string | null;
  ItemReq?: string | null;
  CurNo: number;
  CurName?: string | null;
  DelvTime?: string | null;
  DelvD?: string | null;
  State: number;
  Tot: number;
  Dis: number;
  Percentage: number;
  Net: number;

  // the deal
  QuotNo?: string | null;
  QuotDate?: string | null;
  ApprovedDate?: string | null;
  DealNet: number;
  HasDeal: number;

  LineCount: number;
  TotalQty: number;
  /** كمية العرض — qty on the linked عرض سعر; null when the order has no deal. */
  QuotQty?: number | null;
  /** الكمية المتبقية = كمية العرض - كمية طلب الشراء; null without a deal. */
  RemainQty?: number | null;
  /** الكمية المستلمة — goods received against this order (via its أمر الشراء). */
  RecvQty: number;
  /** المتبقي للاستلام = مطلوب - مستلم. */
  RemainToReceive: number;
  /** Consolidation document holding this order; '' when free. */
  ConsNo?: string | null;
  /** Order net - deal net; null without a deal, 0 when untouched since approval. */
  Variance?: number | null;
}

export interface PoConsolidationLine {
  OrderNo: string;
  Myear: number;
  VType: number;
  ItemNo: string;
  ItemName?: string | null;
  UnitNo: number;
  UnitName?: string | null;
  Qty: number;
  QuotQty?: number | null;
  RemainQty?: number | null;
  RecvQty: number;
  RemainToReceive: number;
  Cost: number;
  LineTotal: number;
  StoreNo: number;
  StoreName?: string | null;
  Barcode?: string | null;
}

export interface PoConsolidation {
  Orders: PoConsolidationRow[];
  Lines: PoConsolidationLine[];
}

/** طلب التجميع — groups purchase orders under one number. */
export interface PoConsOrderRef { OrderNo: string; POYear: number; POVType: number; }

export interface PoConsDoc {
  ConsNo?: string | null;
  Myear: number;
  CDate?: string | null;
  Notes?: string | null;
  State?: number;
  Orders: PoConsOrderRef[];
}

export interface PoConsListRow {
  ConsNo: string;
  CDate?: string | null;
  Notes?: string | null;
  State: number;
  OrderCount: number;
  Net: number;
  RemainQty: number;
}

export interface PoConsSerial { SerialNo: number; SName?: string | null; SEName?: string | null; }
export interface PoConsSupplier { VenNo: number; Name?: string | null; Ename?: string | null; }

export interface PoConsolidationLookups {
  Serials: PoConsSerial[];
  Suppliers: PoConsSupplier[];
}

@Injectable({ providedIn: 'root' })
export class PoConsolidationService {
  private apiUrl = `${environment.apiUrl}/PoConsolidation`;

  constructor(private http: HttpClient) {}

  lookups(): Observable<PoConsolidationLookups> {
    return this.http.get<PoConsolidationLookups>(`${this.apiUrl}/Lookups`);
  }

  list(year: number, f: {
    vtype?: number | null; venNo?: number | null;
    fromDate?: string | null; toDate?: string | null; dealOnly?: number | null;
    consNo?: string | null; unconsolidated?: number | null;
  } = {}): Observable<PoConsolidation> {
    let p = new HttpParams().set('year', year);
    if (f.vtype) p = p.set('vtype', f.vtype);
    if (f.venNo) p = p.set('venNo', f.venNo);
    if (f.fromDate) p = p.set('fromDate', f.fromDate);
    if (f.toDate) p = p.set('toDate', f.toDate);
    if (f.dealOnly !== null && f.dealOnly !== undefined) p = p.set('dealOnly', f.dealOnly);
    if (f.consNo) p = p.set('consNo', f.consNo);
    if (f.unconsolidated) p = p.set('unconsolidated', f.unconsolidated);
    return this.http.get<PoConsolidation>(`${this.apiUrl}/List`, { params: p });
  }

  // ── طلب التجميع document ──

  docNextNo(year: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/Doc/NextNo`, { params: new HttpParams().set('year', year) });
  }

  docList(year: number): Observable<PoConsListRow[]> {
    return this.http.get<PoConsListRow[]>(`${this.apiUrl}/Doc/List`, { params: new HttpParams().set('year', year) });
  }

  docGet(consNo: string, year: number): Observable<PoConsDoc> {
    const p = new HttpParams().set('consNo', consNo).set('year', year);
    return this.http.get<PoConsDoc>(`${this.apiUrl}/Doc/Get`, { params: p });
  }

  docSave(dto: PoConsDoc): Observable<any> {
    return this.http.post(`${this.apiUrl}/Doc/Save`, dto);
  }

  docDelete(consNo: string, year: number): Observable<any> {
    const p = new HttpParams().set('consNo', consNo).set('year', year);
    return this.http.delete(`${this.apiUrl}/Doc/Delete`, { params: p });
  }
}
