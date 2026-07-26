import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** طلب الشراء status-badge lifecycle (pof1.POStatus). */
export const PO_REQ_STATUS = { Draft: 0, Pending: 1, Approved: 2, Closed: 3, Cancelled: 4, Linked: 5 } as const;

export interface PurchaseOrderLine {
  ItemNo?: string | null;
  ItemName?: string | null;
  UnitNo?: number | null;
  UnitName?: string | null;
  Qty?: number | null;
  Cost?: number | null;
  Operand?: number | null;
  StoreNo?: number | null;
  StoreName?: string | null;
  CCntrNo?: number | null;
  Barcode?: string | null;
}

export interface PurchaseOrder {
  OrderNo?: string | null;
  Myear: number;
  VType: number;
  BrNo: number;
  ODate?: string | null;
  VenNo: number;
  VenName?: string | null;
  DAcc?: string | null;
  Cluse: number;
  CurNo: number;
  Rate: number;
  ItemReq?: string | null;
  ManF: number;
  DelvTime?: string | null;
  DelvD?: string | null;
  DelivNote?: string | null;
  Origin?: string | null;
  Packing?: string | null;
  Partial: number;
  Tot: number;
  Dis: number;
  Percentage: number;
  Note1?: string | null; Note2?: string | null; Note3?: string | null; Note4?: string | null; Note5?: string | null;
  State?: number;
  POStatus?: number;
  LinkedPO?: string | null;
  Lines: PurchaseOrderLine[];
}

export interface PurchaseOrderListRow {
  OrderNo: string;
  ODate?: string | null;
  VenNo: number;
  VenName?: string | null;
  Total: number;
  State: number;
  POStatus: number;
  LinkedPO?: string | null;
}

export interface PofUnit { UnitNo: number; UnitName?: string | null; UnitEname?: string | null; Operand: number; Barcode?: string | null; }
export interface PofItemDetails { ItemNo?: string | null; ItemName?: string | null; Ename?: string | null; Cost: number; Barcode?: string | null; Units: PofUnit[]; }

export interface PofSerial { SerialNo: number; SName?: string | null; SEName?: string | null; BranchNo: number; StoreNo: number; }
export interface PofCurrency { CurNo: number; Cur?: string | null; Ename?: string | null; Decimals: number; Rate: number; }
export interface PofPaymentTerm { TermNo: number; Des?: string | null; Ename?: string | null; }
export interface PofSupplier { VenNo: number; Name?: string | null; Ename?: string | null; }
export interface PofContactRep { ManNo: number; Name?: string | null; Ename?: string | null; Note?: string | null; JobTitle?: string | null; }
export interface PofStore { StoreNo: number; Name?: string | null; Ename?: string | null; }
export interface PofCostCenter { CenterNo: number; Name?: string | null; Ename?: string | null; }
export interface PofMaterialReq { ReqNo: string; ODate?: string | null; Section?: string | null; }
export interface PofAccount { AccNo: string; Name?: string | null; Ename?: string | null; }

export interface PurchaseOrderLookups {
  Serials: PofSerial[];
  Currencies: PofCurrency[];
  PaymentTerms: PofPaymentTerm[];
  Suppliers: PofSupplier[];
  ContactReps: PofContactRep[];
  Stores: PofStore[];
  CostCenters: PofCostCenter[];
  MaterialRequests: PofMaterialReq[];
  DebitAccounts: PofAccount[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private apiUrl = `${environment.apiUrl}/PurchaseOrders`;

  constructor(private http: HttpClient) {}

  lookups(): Observable<PurchaseOrderLookups> {
    return this.http.get<PurchaseOrderLookups>(`${this.apiUrl}/Lookups`);
  }

  nextNo(year: number, vtype: number): Observable<{ nextNo: string }> {
    const p = new HttpParams().set('year', year).set('vtype', vtype);
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: p });
  }

  list(year: number, vtype: number): Observable<PurchaseOrderListRow[]> {
    const p = new HttpParams().set('year', year).set('vtype', vtype);
    return this.http.get<PurchaseOrderListRow[]>(`${this.apiUrl}/List`, { params: p });
  }

  get(orderNo: string, year: number, vtype: number): Observable<PurchaseOrder> {
    const p = new HttpParams().set('orderNo', orderNo).set('year', year).set('vtype', vtype);
    return this.http.get<PurchaseOrder>(`${this.apiUrl}/Get`, { params: p });
  }

  itemDetails(itemNo: string): Observable<PofItemDetails> {
    return this.http.get<PofItemDetails>(`${this.apiUrl}/ItemDetails/${encodeURIComponent(itemNo)}`);
  }

  fromRequest(reqNo: string): Observable<PurchaseOrderLine[]> {
    return this.http.get<PurchaseOrderLine[]>(`${this.apiUrl}/FromRequest/${encodeURIComponent(reqNo)}`);
  }

  save(order: PurchaseOrder): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, order);
  }

  setStatus(orderNo: string, year: number, vtype: number, action: string): Observable<{ status: number }> {
    const p = new HttpParams().set('orderNo', orderNo).set('year', year).set('vtype', vtype).set('action', action);
    return this.http.post<{ status: number }>(`${this.apiUrl}/Status`, {}, { params: p });
  }

  delete(orderNo: string, year: number, vtype: number): Observable<any> {
    const p = new HttpParams().set('orderNo', orderNo).set('year', year).set('vtype', vtype);
    return this.http.delete(`${this.apiUrl}/Delete`, { params: p });
  }
}
