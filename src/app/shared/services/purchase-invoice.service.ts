import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/* فاتورة مشتريات — clears the GRNI a goods receipt opened and books the
   supplier payable + recoverable input VAT (GL doctype 30). */

export interface PurchInvReceipt {
  RcptVType: number; RcptDocNo: string; RcptYear: number; TransDate?: string;
  VenNo: number; VenName?: string; SourcePONo?: string; GoodsAmount: number; DefaultVat: number;
}
export interface PurchInvAccounts { GrniAcc?: number; GrniAccName?: string; VatAcc?: number; VatAccName?: string; }
export interface PurchaseInvoiceLookups { Receipts: PurchInvReceipt[]; Accounts?: PurchInvAccounts; }

export interface PurchaseInvoiceLine { ItemNo?: string; ItemName?: string; Qty: number; Cost: number; LineTotal: number; }

export interface PurchaseInvoice {
  InvNo?: string; Myear?: number | null; InvDate?: string;
  VenNo?: number | null; VenName?: string; SupplierInvNo?: string;
  RcptVType?: number | null; RcptDocNo?: string; RcptYear?: number | null; SourcePONo?: string;
  GoodsAmount: number; VatAmount: number; TotalAmount: number;
  Posted?: boolean; GLDocNo?: string; Notes?: string;
  Lines?: PurchaseInvoiceLine[];
}

export interface PurchaseInvoiceListRow {
  InvNo: string; InvDate?: string; VenNo: number; VenName?: string; SupplierInvNo?: string;
  RcptDocNo?: string; GoodsAmount: number; VatAmount: number; TotalAmount: number; Posted: boolean;
}

@Injectable({ providedIn: 'root' })
export class PurchaseInvoiceService {
  private apiUrl = `${environment.apiUrl}/PurchaseInvoice`;

  constructor(private http: HttpClient) {}

  getLookups(year: number): Observable<PurchaseInvoiceLookups> {
    return this.http.get<PurchaseInvoiceLookups>(`${this.apiUrl}/Lookups`, { params: new HttpParams().set('year', year) });
  }
  nextNo(year: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo`, { params: new HttpParams().set('year', year) });
  }
  get(invNo: string, year: number): Observable<PurchaseInvoice> {
    return this.http.get<PurchaseInvoice>(`${this.apiUrl}/Get`, { params: new HttpParams().set('invNo', invNo).set('year', year) });
  }
  list(year: number): Observable<PurchaseInvoiceListRow[]> {
    return this.http.get<PurchaseInvoiceListRow[]>(`${this.apiUrl}/List`, { params: new HttpParams().set('year', year) });
  }
  save(v: PurchaseInvoice): Observable<{ message: string; result: any }> {
    return this.http.post<{ message: string; result: any }>(`${this.apiUrl}/Save`, v);
  }
  delete(invNo: string, year: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete`, { params: new HttpParams().set('invNo', invNo).set('year', year) });
  }
}
