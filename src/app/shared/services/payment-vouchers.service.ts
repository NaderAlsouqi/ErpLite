import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentVouchersFilterDto {
  FilterMode: 'DATE' | 'DOC';
  DateFrom:   string;
  DateTo:     string;
  DocFrom:    number;
  DocTo:      number;
  SortBy:     'DOC' | 'DATE';
}

export interface PaymentVoucherRowDto {
  DocNum:      string;
  Date:        string;
  Amount:      number;
  Beneficiary: string;
  UserName:    string;
}

@Injectable({ providedIn: 'root' })
export class PaymentVouchersService {
  private readonly base = `${environment.apiUrl}/PaymentVouchers`;

  constructor(private http: HttpClient) {}

  getReport(f: PaymentVouchersFilterDto): Observable<PaymentVoucherRowDto[]> {
    const p = new HttpParams()
      .set('FilterMode', f.FilterMode)
      .set('DateFrom',   f.DateFrom)
      .set('DateTo',     f.DateTo)
      .set('DocFrom',    f.DocFrom)
      .set('DocTo',      f.DocTo)
      .set('SortBy',     f.SortBy);
    return this.http.get<PaymentVoucherRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
