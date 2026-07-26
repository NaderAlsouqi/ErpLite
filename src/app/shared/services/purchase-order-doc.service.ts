import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** أمر الشراء status lifecycle. */
export const PO_STATUS = { Draft: 0, Pending: 1, Approved: 2, Closed: 3, Cancelled: 4 } as const;

export interface PurchaseOrderDocLine {
  LineNum?: number | null;
  ItemNo?: string | null;
  ItemName?: string | null;
  UnitNo?: number | null;
  UnitName?: string | null;
  UnitRate?: number | null;
  Qty?: number | null;
  UnitPrice?: number | null;
  DiscPerc?: number | null;
  DiscAmt?: number | null;
  TaxNo?: number | null;
  TaxPerc?: number | null;
  TaxAmt?: number | null;
  StoreNo?: number | null;
  StoreName?: string | null;
  LineTotal?: number | null;
  IsFreeGoods: boolean;
  Barcode?: string | null;
  Note?: string | null;
}

export interface PoDocDelvDate { DelvDate?: string | null; Note?: string | null; }

export interface PurchaseOrderDoc {
  PONo?: string | null;
  Myear: number;
  PODate?: string | null;
  DelvDate?: string | null;
  MultiDelv: boolean;
  DelvDates: PoDocDelvDate[];
  VenNo: number;
  VenName?: string | null;
  VenTaxNo?: string | null;
  CurNo: number;
  Rate: number;
  Cluse: number;
  StoreNo: number;
  SourcePONo?: string | null;
  SourcePOYear: number;
  SourcePOVType: number;
  Subtotal: number;
  TotalDiscount: number;
  TotalTax: number;
  GrandTotal: number;
  Remarks?: string | null;
  Status: number;
  SubmittedAt?: string | null;
  ApprovedAt?: string | null;
  CancelledAt?: string | null;
  CancelReason?: string | null;
  Lines: PurchaseOrderDocLine[];
}

export interface PurchaseOrderDocListRow {
  PONo: string;
  Myear: number;
  PODate?: string | null;
  DelvDate?: string | null;
  MultiDelv: boolean;
  DelvDates: PoDocDelvDate[];
  VenNo: number;
  VenName?: string | null;
  CurNo: number;
  CurName?: string | null;
  Subtotal: number;
  TotalDiscount: number;
  TotalTax: number;
  GrandTotal: number;
  Status: number;
  SourcePONo?: string | null;
  LineCount: number;
}

export interface PoDocLastPrice { LastPrice?: number | null; LastDate?: string | null; LastPONo?: string | null; }

export interface PoDocVendor { VenNo: number; Name?: string | null; Ename?: string | null; TaxId?: string | null; }
export interface PoDocCurrency { CurNo: number; Cur?: string | null; Ename?: string | null; Decimals: number; Rate: number; }
export interface PoDocTerm { TermNo: number; Des?: string | null; Ename?: string | null; }
export interface PoDocStore { StoreNo: number; Name?: string | null; Ename?: string | null; }
export interface PoDocTax { TaxNo: number; NameA?: string | null; NameE?: string | null; Perc: number; }
export interface PoDocSource { OrderNo: string; Myear: number; VType: number; ODate?: string | null; VenNo: number; VenName?: string | null; Tot: number; LinkedPO?: string | null; }

export interface PurchaseOrderDocLookups {
  Vendors: PoDocVendor[];
  Currencies: PoDocCurrency[];
  PaymentTerms: PoDocTerm[];
  Stores: PoDocStore[];
  Taxes: PoDocTax[];
  SourceOrders: PoDocSource[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderDocService {
  private apiUrl = `${environment.apiUrl}/PurchaseOrderDocs`;

  constructor(private http: HttpClient) {}

  lookups(): Observable<PurchaseOrderDocLookups> {
    return this.http.get<PurchaseOrderDocLookups>(`${this.apiUrl}/Lookups`);
  }

  nextNo(year: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('year', year) });
  }

  list(year: number, f: { status?: number | null; venNo?: number | null } = {}): Observable<PurchaseOrderDocListRow[]> {
    let p = new HttpParams().set('year', year);
    if (f.status !== null && f.status !== undefined) p = p.set('status', f.status);
    if (f.venNo) p = p.set('venNo', f.venNo);
    return this.http.get<PurchaseOrderDocListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  get(poNo: string, year: number): Observable<PurchaseOrderDoc> {
    const p = new HttpParams().set('poNo', poNo).set('year', year);
    return this.http.get<PurchaseOrderDoc>(`${this.apiUrl}/Get`, { params: p });
  }

  /** Pull the lines of the طلب الشراء this order is raised against. */
  fromRequest(orderNo: string, year?: number | null, vtype?: number | null): Observable<PurchaseOrderDocLine[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    if (vtype) p = p.set('vtype', vtype);
    return this.http.get<PurchaseOrderDocLine[]>(
      `${this.apiUrl}/FromRequest/${encodeURIComponent(orderNo)}`, { params: p });
  }

  lastPrice(itemNo: string, venNo?: number | null): Observable<PoDocLastPrice> {
    let p = new HttpParams();
    if (venNo) p = p.set('venNo', venNo);
    return this.http.get<PoDocLastPrice>(
      `${this.apiUrl}/LastPrice/${encodeURIComponent(itemNo)}`, { params: p });
  }

  save(dto: PurchaseOrderDoc): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, dto);
  }

  setStatus(poNo: string, year: number, action: string, reason?: string | null): Observable<{ status: number }> {
    let p = new HttpParams().set('poNo', poNo).set('year', year).set('action', action);
    if (reason) p = p.set('reason', reason);
    return this.http.post<{ status: number }>(`${this.apiUrl}/Status`, {}, { params: p });
  }

  delete(poNo: string, year: number): Observable<any> {
    const p = new HttpParams().set('poNo', poNo).set('year', year);
    return this.http.delete(`${this.apiUrl}/Delete`, { params: p });
  }
}
