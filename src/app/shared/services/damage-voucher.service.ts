import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DamageLine {
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
  CreditAcc?: number | null;   // per-line = store inventory account
  CreditAccName?: string;
  CostCenter?: number | null;
  Expired?: boolean;          // client-only: item allows expiry
  Units?: DmgUnit[];         // client-only: the item's units for the row dropdown
  AvailStores?: ItemStoreStock[]; // client-only: stores where this item is in stock
  MaxQty?: number | null;         // client-only: available qty in the selected store (selected units)
  Serials?: string[];             // client-only: serial numbers picked for this line (serial system)
}

export interface DmgCategoryItem {
  ItemNo: string; ItemName?: string; Ename?: string;
  UnitNo: number; UnitName?: string; UnitEname?: string;
  Operand: number; Price?: number | null; DefaultCost?: number | null; Expired?: boolean;
}

export interface DamageVoucher {
  TransNo?: number | null;
  DocNo?: string;
  VType?: number | null;
  VTypeName?: string;
  Myear?: number | null;
  TransDate?: string;
  Tg?: number | null;          // جهة الصرف
  TgName?: string;
  BrNo?: number | null;
  Des?: string;
  CurNo?: number | null;
  Rate?: number | null;
  DebitAcc?: number | null;    // header رقم الحساب المدين
  DebitAccName?: string;
  CostCenter?: number | null;  // header م.الكلفة
  PdfPath?: string;
  Lines: DamageLine[];
}

export interface DamageGLRow { Acc: number; AccName?: string; Debit: number; Credit: number; CostCenter?: number | null; Des?: string; }

export interface DmgUnit { UnitNo: number; UnitName?: string; UnitEname?: string; Operand: number; Price?: number | null; }

export interface DmgSerialType { VType: number; Name: string; Ename: string; StoreNo?: number; BrNo?: number; }
export interface DmgEntity { Tg: number; Name: string; Ename: string; }          // جهة الصرف
export interface DmgStore { StoreNo: number; Name: string; Ename: string; AccountNo?: number; AccountName?: string; }
export interface ItemStoreStock { StoreNo: number; Name: string; Ename: string; OnHand: number; }
export interface DmgCategory { TypeNo: number; Name: string; Ename: string; }

export interface DamageLookups {
  SerialTypes: DmgSerialType[];
  Entities: DmgEntity[];      // جهة الصرف
  Stores: DmgStore[];
  Categories: DmgCategory[];
  Perpetual?: boolean;   // جرد مستمر — GL fields + posting only when true
  SerialSystem?: boolean; // نظام الأرقام التسلسلية — serial entry only when true
}

export interface DamageItemInfo { ItemName?: string; Ename?: string; DefaultCost?: number | null; Expired?: boolean; Units: DmgUnit[]; }
export interface ItemSearchResult { ItemNo: string; ItemName: string; Ename: string; }
export interface DamageListRow { DocNo: string; VType: number; VTypeName?: string; TransDate?: string; TgName?: string; Myear?: number; Total: number; Lines: number; }

@Injectable({ providedIn: 'root' })
export class DamageVoucherService {
  private apiUrl = `${environment.apiUrl}/DamageVoucher`;

  constructor(private http: HttpClient) {}

  getLookups(): Observable<DamageLookups> { return this.http.get<DamageLookups>(`${this.apiUrl}/Lookups`); }

  searchItems(term: string): Observable<ItemSearchResult[]> {
    return this.http.get<ItemSearchResult[]>(`${this.apiUrl}/SearchItems`, { params: new HttpParams().set('term', term || '') });
  }

  getItemInfo(itemNo: string): Observable<DamageItemInfo> {
    return this.http.get<DamageItemInfo>(`${this.apiUrl}/ItemInfo/${encodeURIComponent(itemNo)}`);
  }

  nextNo(vType: number, myear: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('vType', vType).set('myear', myear) });
  }

  /** FIFO issue cost for a line — qty is in BASE units (Qty * UnitRate). Returns cost per BASE unit. */
  fifoCost(item: string, qty: number, store: number, date: string): Observable<{ cost: number }> {
    return this.http.get<{ cost: number }>(`${this.apiUrl}/FifoCost`,
      { params: new HttpParams().set('item', item).set('qty', qty).set('store', store).set('date', date) });
  }

  /** Stores where the item is in stock (OnHand > 0) as of a date. */
  itemStock(item: string, date: string): Observable<ItemStoreStock[]> {
    return this.http.get<ItemStoreStock[]>(`${this.apiUrl}/ItemStock`,
      { params: new HttpParams().set('item', item).set('date', date) });
  }

  get(vType: number, docNo: string, myear: number): Observable<DamageVoucher> {
    return this.http.get<DamageVoucher>(`${this.apiUrl}/Get`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  list(myear: number, vType?: number | null): Observable<DamageListRow[]> {
    let p = new HttpParams().set('myear', myear);
    if (vType) p = p.set('vType', vType);
    return this.http.get<DamageListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  save(v: DamageVoucher): Observable<{ message: string; transNo: number; docNo: string }> {
    return this.http.post<{ message: string; transNo: number; docNo: string }>(`${this.apiUrl}/Save`, v);
  }

  itemsByCategory(typeNo: number): Observable<DmgCategoryItem[]> {
    return this.http.get<DmgCategoryItem[]>(`${this.apiUrl}/ItemsByCategory/${typeNo}`);
  }

  getGL(vType: number, docNo: string, myear: number): Observable<DamageGLRow[]> {
    return this.http.get<DamageGLRow[]>(`${this.apiUrl}/GL`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  delete(vType: number, docNo: string, myear: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }
}
