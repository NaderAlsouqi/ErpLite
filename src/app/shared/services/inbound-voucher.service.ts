import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InboundLine {
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
  Expired?: boolean;          // client-only: item allows expiry
  Units?: InbUnit[];          // client-only: the item's units for the row dropdown
  Serials?: string[];         // client-only: serial numbers entered for this line (serial system)
}

export interface InbCategoryItem {
  ItemNo: string; ItemName?: string; Ename?: string;
  UnitNo: number; UnitName?: string; UnitEname?: string;
  Operand: number; Price?: number | null; DefaultCost?: number | null; Expired?: boolean;
}

export interface InboundVoucher {
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
  Lines: InboundLine[];
}

export interface InboundGLRow { Acc: number; AccName?: string; Debit: number; Credit: number; CostCenter?: number | null; Des?: string; }

export interface InbUnit { UnitNo: number; UnitName?: string; UnitEname?: string; Operand: number; Price?: number | null; }

export interface InboundLookups {
  SerialTypes: { VType: number; Name: string; Ename: string; StoreNo: number; BrNo: number; Acc1?: number; Acc2?: number }[];
  Vendors: { No: number; Name: string; Ename: string; Acc: number; AccName?: string }[];
  Entities: { Tg: number; Name: string; Ename: string }[];
  Stores: { StoreNo: number; Name: string; Ename: string; AccountNo: number; AccountName?: string }[];
  Categories: { TypeNo: number; Name: string; Ename: string }[];
  Perpetual?: boolean;   // جرد مستمر — GL fields + posting only when true
  SerialSystem?: boolean; // نظام الأرقام التسلسلية — serial entry only when true
}

export interface InboundItemInfo { ItemName?: string; Ename?: string; DefaultCost?: number | null; Expired?: boolean; Units: InbUnit[]; }
export interface ItemSearchResult { ItemNo: string; ItemName: string; Ename: string; }
export interface InboundListRow { DocNo: string; VType: number; VTypeName?: string; TransDate?: string; VendorName?: string; TgName?: string; Myear?: number; Total: number; Lines: number; }

@Injectable({ providedIn: 'root' })
export class InboundVoucherService {
  private apiUrl = `${environment.apiUrl}/InboundVoucher`;

  constructor(private http: HttpClient) {}

  getLookups(): Observable<InboundLookups> { return this.http.get<InboundLookups>(`${this.apiUrl}/Lookups`); }

  searchItems(term: string): Observable<ItemSearchResult[]> {
    return this.http.get<ItemSearchResult[]>(`${this.apiUrl}/SearchItems`, { params: new HttpParams().set('term', term || '') });
  }

  getItemInfo(itemNo: string): Observable<InboundItemInfo> {
    return this.http.get<InboundItemInfo>(`${this.apiUrl}/ItemInfo/${encodeURIComponent(itemNo)}`);
  }

  nextNo(vType: number, myear: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('vType', vType).set('myear', myear) });
  }

  get(vType: number, docNo: string, myear: number): Observable<InboundVoucher> {
    return this.http.get<InboundVoucher>(`${this.apiUrl}/Get`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  list(myear: number, vType?: number | null): Observable<InboundListRow[]> {
    let p = new HttpParams().set('myear', myear);
    if (vType) p = p.set('vType', vType);
    return this.http.get<InboundListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  save(v: InboundVoucher): Observable<{ message: string; transNo: number; docNo: string }> {
    return this.http.post<{ message: string; transNo: number; docNo: string }>(`${this.apiUrl}/Save`, v);
  }

  itemsByCategory(typeNo: number): Observable<InbCategoryItem[]> {
    return this.http.get<InbCategoryItem[]>(`${this.apiUrl}/ItemsByCategory/${typeNo}`);
  }

  getGL(vType: number, docNo: string, myear: number): Observable<InboundGLRow[]> {
    return this.http.get<InboundGLRow[]>(`${this.apiUrl}/GL`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  delete(vType: number, docNo: string, myear: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }
}
