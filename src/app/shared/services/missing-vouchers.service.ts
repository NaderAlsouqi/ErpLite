import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MissingVouchersFilterDto {
  DocType: number;
  Year:    number;
  Serial:  number;
  DocFrom: number;
  DocTo:   number;
}

export interface MissingVoucherRowDto {
  DocNum: number;
}

export interface VoucherDocRangeDto {
  MinDoc: number;
  MaxDoc: number;
}

export interface UnbalancedTransactionRowDto {
  DocNum:    string;
  DocType:   number;
  TypeName:  string;
  TypeEName: string;
  Date:      string;
  Diff:      number;
}

@Injectable({ providedIn: 'root' })
export class MissingVouchersService {
  private readonly base = `${environment.apiUrl}/MissingVouchers`;

  constructor(private http: HttpClient) {}

  getMaxDoc(docType: number, year: number, serial: number): Observable<number> {
    const p = new HttpParams()
      .set('docType', docType).set('year', year).set('serial', serial);
    return this.http.get<number>(`${this.base}/GetMaxDoc`, { params: p });
  }

  getDocRange(docType: number, year: number, serial: number): Observable<VoucherDocRangeDto> {
    const p = new HttpParams()
      .set('docType', docType).set('year', year).set('serial', serial);
    return this.http.get<VoucherDocRangeDto>(`${this.base}/GetDocRange`, { params: p });
  }

  getReport(f: MissingVouchersFilterDto): Observable<MissingVoucherRowDto[]> {
    const p = new HttpParams()
      .set('DocType', f.DocType).set('Year', f.Year).set('Serial', f.Serial)
      .set('DocFrom', f.DocFrom).set('DocTo', f.DocTo);
    return this.http.get<MissingVoucherRowDto[]>(`${this.base}/GetReport`, { params: p });
  }

  getUnbalanced(): Observable<UnbalancedTransactionRowDto[]> {
    return this.http.get<UnbalancedTransactionRowDto[]>(`${this.base}/GetUnbalanced`);
  }
}
