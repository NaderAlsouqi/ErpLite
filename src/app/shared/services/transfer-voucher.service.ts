import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TransferLine {
  ItemNo?: string;
  ItemName?: string;
  Ename?: string;
  UnitNo: number;
  UnitName?: string;
  UnitRate: number;
  Qty?: number | null;
  Weight?: number | null;
  Wcost?: number | null;          // weighted-average cost per base unit
  Cost?: number | null;           // = Wcost * UnitRate
  ItemTot?: number | null;
  ExpDate?: string;
  BatchNo?: string;
  AccountNo?: number | null;      // per-line account (defaults to ToStore account)
  AccountName?: string;
  CostCenter?: number | null;
  OrderId?: string;
  Expired?: boolean;              // client-only: item allows expiry
  Units?: TrnUnit[];              // client-only
  MaxQty?: number | null;         // client-only: available qty in FromStore (selected units)
  RawWcost?: number | null;       // client-only: FIFO/weighted cost per base unit (before additional cost)
  Serials?: string[];             // client-only: serial numbers picked for this line (serial system)
}

export interface TrnCategoryItem {
  ItemNo: string; ItemName?: string; Ename?: string;
  UnitNo: number; UnitName?: string; UnitEname?: string;
  Operand: number; Price?: number | null; DefaultCost?: number | null; Expired?: boolean;
}

export interface TransferVoucher {
  TransNo?: number | null;
  DocNo?: string;
  VType?: number | null;
  VTypeName?: string;
  Myear?: number | null;
  TransDate?: string;
  FromStore?: number | null;      // من مستودع
  FromStoreName?: string;
  ToStore?: number | null;        // إلى مستودع
  ToStoreName?: string;
  AdditionalCost?: number | null; // تكلفة إضافية
  CurNo?: number | null;
  Rate?: number | null;
  DebitAcc?: number | null;       // الحساب المدين = ToStore account
  DebitAccName?: string;
  CreditAcc?: number | null;      // الحساب الدائن = FromStore account
  CreditAccName?: string;
  DbCostCenter?: number | null;
  CrCostCenter?: number | null;
  BrNo?: number | null;
  Des?: string;
  Lines: TransferLine[];
}

export interface TransferGLRow { Acc: number; AccName?: string; Debit: number; Credit: number; CostCenter?: number | null; Des?: string; }
export interface TrnUnit { UnitNo: number; UnitName?: string; UnitEname?: string; Operand: number; Price?: number | null; }
export interface TrnSerialType { VType: number; Name: string; Ename: string; StoreNo?: number; BrNo?: number; }
export interface TrnStore { StoreNo: number; Name: string; Ename: string; AccountNo?: number; AccountName?: string; }
export interface TrnCurrency { CurNo: number; Name: string; Ename: string; Rate?: number; }
export interface TrnCategory { TypeNo: number; Name: string; Ename: string; }
export interface TrnItemStoreStock { StoreNo: number; Name: string; Ename: string; OnHand: number; }
export interface TrnItemBatch { BatchNo: string; ExpDate: string; NetQty: number; }

export interface TransferLookups {
  SerialTypes: TrnSerialType[];
  Stores: TrnStore[];
  Currencies: TrnCurrency[];
  Categories: TrnCategory[];
  Perpetual?: boolean;
  SerialSystem?: boolean;
  Fifo?: boolean;
}

export interface TransferItemInfo { ItemName?: string; Ename?: string; DefaultCost?: number | null; Expired?: boolean; Units: TrnUnit[]; }
export interface ItemSearchResult { ItemNo: string; ItemName: string; Ename: string; }
export interface TransferListRow { DocNo: string; VType: number; VTypeName?: string; TransDate?: string; FromStoreName?: string; ToStoreName?: string; Myear?: number; Total: number; Lines: number; }

@Injectable({ providedIn: 'root' })
export class TransferVoucherService {
  private apiUrl = `${environment.apiUrl}/TransferVoucher`;

  constructor(private http: HttpClient) {}

  getLookups(): Observable<TransferLookups> { return this.http.get<TransferLookups>(`${this.apiUrl}/Lookups`); }

  getItemInfo(itemNo: string): Observable<TransferItemInfo> {
    return this.http.get<TransferItemInfo>(`${this.apiUrl}/ItemInfo/${encodeURIComponent(itemNo)}`);
  }

  nextNo(vType: number, myear: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('vType', vType).set('myear', myear) });
  }

  /** Stores where the item is in stock (OnHand > 0) as of a date. */
  itemStock(item: string, date: string): Observable<TrnItemStoreStock[]> {
    return this.http.get<TrnItemStoreStock[]>(`${this.apiUrl}/ItemStock`,
      { params: new HttpParams().set('item', item).set('date', date) });
  }

  /** Issue cost (FIFO or weighted-avg per tenant) for a line — qty in BASE units. */
  fifoCost(item: string, qty: number, store: number, date: string): Observable<{ cost: number }> {
    return this.http.get<{ cost: number }>(`${this.apiUrl}/FifoCost`,
      { params: new HttpParams().set('item', item).set('qty', qty).set('store', store).set('date', date) });
  }

  /** Available batches/expiries of an item in the source store. */
  itemBatches(item: string, store: number, date: string): Observable<TrnItemBatch[]> {
    return this.http.get<TrnItemBatch[]>(`${this.apiUrl}/ItemBatches`,
      { params: new HttpParams().set('item', item).set('store', store).set('date', date) });
  }

  get(vType: number, docNo: string, myear: number): Observable<TransferVoucher> {
    return this.http.get<TransferVoucher>(`${this.apiUrl}/Get`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  list(myear: number, vType?: number | null): Observable<TransferListRow[]> {
    let p = new HttpParams().set('myear', myear);
    if (vType) p = p.set('vType', vType);
    return this.http.get<TransferListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  save(v: TransferVoucher): Observable<{ message: string; transNo: number; docNo: string }> {
    return this.http.post<{ message: string; transNo: number; docNo: string }>(`${this.apiUrl}/Save`, v);
  }

  itemsByCategory(typeNo: number): Observable<TrnCategoryItem[]> {
    return this.http.get<TrnCategoryItem[]>(`${this.apiUrl}/ItemsByCategory/${typeNo}`);
  }

  getGL(vType: number, docNo: string, myear: number): Observable<TransferGLRow[]> {
    return this.http.get<TransferGLRow[]>(`${this.apiUrl}/GL`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }

  delete(vType: number, docNo: string, myear: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete`, { params: new HttpParams().set('vType', vType).set('docNo', docNo).set('myear', myear) });
  }
}
