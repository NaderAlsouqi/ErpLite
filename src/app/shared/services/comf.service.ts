import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ComfDto {
  acc_debit?: number | null;
  acc_credit?: number | null;
  bbd?: string | null;
}

export interface ComfLinkAccountsDto {
  acc_debit?: number | null;
  acc_credit?: number | null;
  acc_stock?: number | null;
  acc_sales?: number | null;
  acc_sales_cr?: number | null;
  acc_rsales?: number | null;
  acc_purchase?: number | null;
  acc_rpurchase?: number | null;
  acc_profitloss?: number | null;
  acc_cash?: number | null;
  chequesaccno?: number | null;
  acc_fxcomm?: number | null;
  defferdcheqacc?: number | null;
  costgoodsacc?: number | null;
}

export interface CusfDto {
  no: number;
  acc: number;
  name?: string | null;
  cename?: string | null;
  State: number;
  year: number;
}

export interface VenfDto {
  no: number;
  acc: number;
  name?: string | null;
  vename?: string | null;
  year: number;
}

@Injectable({ providedIn: 'root' })
export class ComfService {
  private apiUrl = `${environment.apiUrl}/Comf`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ComfDto[]> {
    return this.http.get<ComfDto[]>(`${this.apiUrl}/GetAll`);
  }

  getLinkAccounts(): Observable<ComfLinkAccountsDto> {
    return this.http.get<ComfLinkAccountsDto>(`${this.apiUrl}/GetLinkAccounts`);
  }

  updateLinkAccounts(dto: ComfLinkAccountsDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/UpdateLinkAccounts`, dto);
  }

  upsertCusf(dto: CusfDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/UpsertCusf`, dto);
  }

  upsertVenf(dto: VenfDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/UpsertVenf`, dto);
  }
}
