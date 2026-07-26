import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Status of a supplier quotation (SuppQuot1.Status). */
export const SQ_STATUS = { New: 0, Approved: 1, Rejected: 2 } as const;

export interface SupplierQuotationLine {
  ItemNo?: string | null;
  ItemName?: string | null;
  UnitNo?: number | null;
  UnitName?: string | null;
  UnitRate?: number | null;
  Qty?: number | null;
  Cost?: number | null;
  LineDis?: number | null;
  StoreNo?: number | null;
  StoreName?: string | null;
  CCntrNo?: number | null;
  Barcode?: string | null;
  DelvDays?: number | null;
  Note?: string | null;
}

export interface SupplierQuotation {
  QuotNo?: string | null;
  Myear: number;
  QDate?: string | null;
  ValidUntil?: string | null;
  VenNo: number;
  VenName?: string | null;
  CurNo: number;
  Rate: number;
  Cluse: number;
  DelvTime?: string | null;
  ItemReq?: string | null;
  Tot: number;
  Dis: number;
  Percentage: number;
  Status?: number;
  PONo?: string | null;
  POYear?: number;
  POVType?: number;
  Note1?: string | null;
  Note2?: string | null;
  Note3?: string | null;
  Lines: SupplierQuotationLine[];
}

export interface SupplierQuotationListRow {
  QuotNo: string;
  QDate?: string | null;
  VenNo: number;
  VenName?: string | null;
  ItemReq?: string | null;
  Tot: number;
  Dis: number;
  Percentage: number;
  Status: number;
  PONo?: string | null;
  ValidUntil?: string | null;
}

export interface RfqQuotation {
  QuotNo: string;
  QDate?: string | null;
  ValidUntil?: string | null;
  VenNo: number;
  VenName?: string | null;
  ItemReq?: string | null;
  CurNo: number;
  CurName?: string | null;
  DelvTime?: string | null;
  Tot: number;
  Dis: number;
  Percentage: number;
  Net: number;
  Status: number;
  PONo?: string | null;
  POYear: number;
  POVType: number;
  ApprovedDate?: string | null;
  LineCount: number;
  Expired: number;
}

export interface RfqComparisonRow {
  ItemNo: string;
  ItemName?: string | null;
  QuotNo: string;
  VenNo: number;
  VenName?: string | null;
  Status: number;
  ItemReq?: string | null;
  Qty: number;
  UnitNo: number;
  UnitName?: string | null;
  DelvDays: number;
  NetPrice: number;
  LineTotal: number;
  IsLowest: number;
  OfferCount: number;
}

export interface RfqSupplierSummary {
  QuotNo: string;
  VenNo: number;
  VenName?: string | null;
  Status: number;
  CurName?: string | null;
  LineTotal: number;
  DisAmt: number;
  Net: number;
  ItemsQuoted: number;
  ItemsInScope: number;
  /** 1 when this supplier quoted every item in scope. */
  IsComplete: number;
  MaxDelvDays: number;
  /** 1 for the cheapest COMPLETE offer. */
  IsBestSingle: number;
}

export interface RfqSplitAward {
  ItemNo: string;
  ItemName?: string | null;
  Qty: number;
  UnitName?: string | null;
  VenNo: number;
  VenName?: string | null;
  QuotNo: string;
  DelvDays: number;
  EffPrice: number;
  LineTotal: number;
  OfferCount: number;
}

export interface RfqBestDealTotals {
  ItemsInScope: number;
  OfferCount: number;
  /** null when no supplier quoted the whole basket. */
  BestSingleTotal?: number | null;
  SplitTotal: number;
  Savings?: number | null;
  BestSingleVenNo?: number | null;
  BestSingleVenName?: string | null;
  BestSingleQuotNo?: string | null;
}

export interface RfqBestDeal {
  Suppliers: RfqSupplierSummary[];
  SplitAward: RfqSplitAward[];
  Totals: RfqBestDealTotals;
}

export interface RfqApprovalResult { PONo?: string | null; POYear: number; POVType: number; }

export interface SqSupplier { VenNo: number; Name?: string | null; Ename?: string | null; }
export interface SqCurrency { CurNo: number; Cur?: string | null; Ename?: string | null; Decimals: number; Rate: number; }
export interface SqPaymentTerm { TermNo: number; Des?: string | null; Ename?: string | null; }
export interface SqStore { StoreNo: number; Name?: string | null; Ename?: string | null; }
export interface SqCostCenter { CenterNo: number; Name?: string | null; Ename?: string | null; }
export interface SqMaterialReq { ReqNo: string; ODate?: string | null; Section?: string | null; }
/** A purchase order shown in the رقم طلب شراء المواد dropdown. */
export interface SqPurchaseOrder {
  OrderNo: string;
  Myear: number;
  VType: number;
  ODate?: string | null;
  VenNo: number;
  VenName?: string | null;
  Tot: number;
}

export interface SqPoSerial { SerialNo: number; SName?: string | null; SEName?: string | null; BranchNo: number; StoreNo: number; }

export interface SupplierQuotationLookups {
  Suppliers: SqSupplier[];
  Currencies: SqCurrency[];
  PaymentTerms: SqPaymentTerm[];
  Stores: SqStore[];
  CostCenters: SqCostCenter[];
  MaterialRequests: SqMaterialReq[];
  PoSerials: SqPoSerial[];
}

@Injectable({ providedIn: 'root' })
export class SupplierQuotationService {
  private apiUrl = `${environment.apiUrl}/SupplierQuotations`;

  constructor(private http: HttpClient) {}

  lookups(): Observable<SupplierQuotationLookups> {
    return this.http.get<SupplierQuotationLookups>(`${this.apiUrl}/Lookups`);
  }

  nextNo(year: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('year', year) });
  }

  list(year: number): Observable<SupplierQuotationListRow[]> {
    return this.http.get<SupplierQuotationListRow[]>(`${this.apiUrl}/List`, { params: new HttpParams().set('year', year) });
  }

  get(quotNo: string, year: number): Observable<SupplierQuotation> {
    const p = new HttpParams().set('quotNo', quotNo).set('year', year);
    return this.http.get<SupplierQuotation>(`${this.apiUrl}/Get`, { params: p });
  }

  purchaseOrders(year?: number | null): Observable<SqPurchaseOrder[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    return this.http.get<SqPurchaseOrder[]>(`${this.apiUrl}/PurchaseOrders`, { params: p });
  }

  /** Seed a quotation's lines from a purchase order. */
  fromPurchaseOrder(orderNo: string, year?: number | null, vtype?: number | null): Observable<SupplierQuotationLine[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    if (vtype) p = p.set('vtype', vtype);
    return this.http.get<SupplierQuotationLine[]>(
      `${this.apiUrl}/FromPurchaseOrder/${encodeURIComponent(orderNo)}`, { params: p });
  }

  fromRequest(reqNo: string): Observable<SupplierQuotationLine[]> {
    return this.http.get<SupplierQuotationLine[]>(`${this.apiUrl}/FromRequest/${encodeURIComponent(reqNo)}`);
  }

  save(dto: SupplierQuotation): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, dto);
  }

  delete(quotNo: string, year: number): Observable<any> {
    const p = new HttpParams().set('quotNo', quotNo).set('year', year);
    return this.http.delete(`${this.apiUrl}/Delete`, { params: p });
  }

  // ── RFQ ──

  rfq(year: number, f: { status?: number | null; venNo?: number | null; itemReq?: string | null;
                         fromDate?: string | null; toDate?: string | null } = {}): Observable<RfqQuotation[]> {
    let p = new HttpParams().set('year', year);
    if (f.status !== null && f.status !== undefined) p = p.set('status', f.status);
    if (f.venNo) p = p.set('venNo', f.venNo);
    if (f.itemReq) p = p.set('itemReq', f.itemReq);
    if (f.fromDate) p = p.set('fromDate', f.fromDate);
    if (f.toDate) p = p.set('toDate', f.toDate);
    return this.http.get<RfqQuotation[]>(`${this.apiUrl}/Rfq`, { params: p });
  }

  comparison(year: number, itemReq?: string | null): Observable<RfqComparisonRow[]> {
    let p = new HttpParams().set('year', year);
    if (itemReq) p = p.set('itemReq', itemReq);
    return this.http.get<RfqComparisonRow[]>(`${this.apiUrl}/Comparison`, { params: p });
  }

  /** Single-supplier vs split-award analysis for the scope. */
  bestDeal(year: number, itemReq?: string | null): Observable<RfqBestDeal> {
    let p = new HttpParams().set('year', year);
    if (itemReq) p = p.set('itemReq', itemReq);
    return this.http.get<RfqBestDeal>(`${this.apiUrl}/BestDeal`, { params: p });
  }

  approve(quotNo: string, year: number, poVType: number): Observable<RfqApprovalResult> {
    const p = new HttpParams().set('quotNo', quotNo).set('year', year).set('poVType', poVType);
    return this.http.post<RfqApprovalResult>(`${this.apiUrl}/Approve`, null, { params: p });
  }

  unapprove(quotNo: string, year: number): Observable<any> {
    const p = new HttpParams().set('quotNo', quotNo).set('year', year);
    return this.http.post(`${this.apiUrl}/Unapprove`, null, { params: p });
  }

  reject(quotNo: string, year: number, reject = 1): Observable<any> {
    const p = new HttpParams().set('quotNo', quotNo).set('year', year).set('reject', reject);
    return this.http.post(`${this.apiUrl}/Reject`, null, { params: p });
  }
}
