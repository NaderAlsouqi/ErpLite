import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/* سند استلام بضاعة — mirrors the inbound voucher service, plus the أمر الشراء link. */

export interface GoodsReceiptLine {
  ItemNo?: string;
  ItemName?: string;
  Ename?: string;
  UnitNo: number;
  UnitName?: string;
  UnitRate: number;
  StoreNo?: number | null;
  StoreName?: string;
  Qty?: number | null;
  Weight?: number | null;
  Cost?: number | null;
  ItemTot?: number | null;
  ExpDate?: string;
  BatchNo?: string;
  DebitAcc?: number | null;
  DebitAccName?: string;
  CreditAcc?: number | null;
  CreditAccName?: string;
  CostCenter?: number | null;
  Expired?: boolean;
  Units?: GrUnit[];
  Serials?: string[];
  // client-only, when a line was loaded from a PO:
  OrderedQty?: number | null;
  ReceivedQty?: number | null;
  RemainingQty?: number | null;
}

export interface GrCategoryItem {
  ItemNo: string; ItemName?: string; Ename?: string;
  UnitNo: number; UnitName?: string; UnitEname?: string;
  Operand: number; Price?: number | null; DefaultCost?: number | null; Expired?: boolean;
}

export interface GoodsReceipt {
  TransNo?: number | null;
  DocNo?: string;
  VType?: number | null;
  VTypeName?: string;
  Myear?: number | null;
  TransDate?: string;
  Tg?: number | null;
  TgName?: string;
  VendorNo?: number | null;
  VendorName?: string;
  BrNo?: number | null;
  Des?: string;
  Prod?: boolean;
  PdfPath?: string;
  CreditAcc?: number | null;
  CreditAccName?: string;
  RcptPONo?: string | null;
  RcptPOYear?: number | null;
  RcptPOVType?: number | null;
  InbDocNo?: string | null;
  InbVType?: number | null;
  Lines: GoodsReceiptLine[];
}

export interface GoodsReceiptGLRow { Acc: number; AccName?: string; Debit: number; Credit: number; CostCenter?: number | null; Des?: string; }
export interface GrUnit { UnitNo: number; UnitName?: string; UnitEname?: string; Operand: number; Price?: number | null; }

export interface GrPurchaseOrder { PONo: string; Myear: number; PODate?: string; VenNo: number; VenName?: string; Status: number; GrandTotal: number; }
export interface GrPoLine {
  ItemNo: string; ItemName?: string; Ename?: string;
  UnitNo: number; UnitName?: string; UnitRate: number;
  OrderedQty: number; ReceivedQty: number; RemainingQty: number;
  Cost?: number | null; StoreNo?: number | null; StoreName?: string;
  Barcode?: string; Expired?: boolean;
}

export interface GoodsReceiptLookups {
  SerialTypes: { VType: number; Name: string; Ename: string; StoreNo: number; BrNo: number; Acc1?: number; Acc2?: number }[];
  Vendors: { No: number; Name: string; Ename: string; Acc: number; AccName?: string }[];
  Entities: { Tg: number; Name: string; Ename: string }[];
  Stores: { StoreNo: number; Name: string; Ename: string; AccountNo: number; AccountName?: string }[];
  Categories: { TypeNo: number; Name: string; Ename: string }[];
  Perpetual?: boolean;
  SerialSystem?: boolean;
  PurchaseOrders: GrPurchaseOrder[];
}

export interface GoodsReceiptItemInfo { ItemName?: string; Ename?: string; DefaultCost?: number | null; Expired?: boolean; Units: GrUnit[]; }
export interface GrItemSearchResult { ItemNo: string; ItemName: string; Ename: string; }
export interface GoodsReceiptListRow { DocNo: string; VType: number; VTypeName?: string; TransDate?: string; VendorName?: string; TgName?: string; Myear?: number; RcptPONo?: string; Total: number; Lines: number; }

@Injectable({ providedIn: 'root' })
export class GoodsReceiptService {
  private apiUrl = `${environment.apiUrl}/GoodsReceipt`;

  constructor(private http: HttpClient) {}

  getLookups(): Observable<GoodsReceiptLookups> { return this.http.get<GoodsReceiptLookups>(`${this.apiUrl}/Lookups`); }

  searchItems(term: string): Observable<GrItemSearchResult[]> {
    return this.http.get<GrItemSearchResult[]>(`${this.apiUrl}/SearchItems`, { params: new HttpParams().set('term', term || '') });
  }

  getItemInfo(itemNo: string): Observable<GoodsReceiptItemInfo> {
    return this.http.get<GoodsReceiptItemInfo>(`${this.apiUrl}/ItemInfo/${encodeURIComponent(itemNo)}`);
  }

  /** Pull an أمر الشراء's lines to receive (ordered / received / remaining). */
  fromPO(poNo: string, year: number): Observable<GrPoLine[]> {
    return this.http.get<GrPoLine[]>(`${this.apiUrl}/FromPO/${encodeURIComponent(poNo)}`, { params: new HttpParams().set('year', year) });
  }

  nextNo(vType: number, myear: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('vType', vType).set('myear', myear) });
  }

  get(vType: number, docNo: string, myear: number): Observable<GoodsReceipt> {
    return this.http.get<GoodsReceipt>(`${this.apiUrl}/Get`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  list(myear: number, vType?: number | null): Observable<GoodsReceiptListRow[]> {
    let p = new HttpParams().set('myear', myear);
    if (vType) p = p.set('vType', vType);
    return this.http.get<GoodsReceiptListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  save(v: GoodsReceipt): Observable<{ message: string; transNo: number; docNo: string; inbDocNo?: string }> {
    return this.http.post<{ message: string; transNo: number; docNo: string; inbDocNo?: string }>(`${this.apiUrl}/Save`, v);
  }

  itemsByCategory(typeNo: number): Observable<GrCategoryItem[]> {
    return this.http.get<GrCategoryItem[]>(`${this.apiUrl}/ItemsByCategory/${typeNo}`);
  }

  getGL(vType: number, docNo: string, myear: number): Observable<GoodsReceiptGLRow[]> {
    return this.http.get<GoodsReceiptGLRow[]>(`${this.apiUrl}/GL`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  delete(vType: number, docNo: string, myear: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }
}
