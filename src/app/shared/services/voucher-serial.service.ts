import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VoucherSerial {
  VtypeNo: number;
  VSerialNo: number;
  InvoiceType: number;
  BR_No: number;
  SName: string;
  Sename: string;
  StoreNo: number;
  ACCNO1?: number;
  ACCNO2?: number;
  VoucherTypeName?: string;
  BranchArName?: string;
  StoreName?: string;
  AccountName1?: string;
  AccountName2?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoucherSerialService {
  private apiUrl = `${environment.apiUrl}/VoucherSerial`;

  constructor(private http: HttpClient) { }

  getAll(vTypeNo?: number, vSerialNo?: number): Observable<VoucherSerial[]> {
    let params = new HttpParams();
    if (vTypeNo) params = params.set('vTypeNo', vTypeNo.toString());
    if (vSerialNo) params = params.set('vSerialNo', vSerialNo.toString());
    
    return this.http.get<VoucherSerial[]>(`${this.apiUrl}/GetAll`, { params });
  }

  save(dto: VoucherSerial): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, dto);
  }

  delete(vTypeNo: number, vSerialNo: number): Observable<any> {
    let params = new HttpParams()
      .set('vTypeNo', vTypeNo.toString())
      .set('vSerialNo', vSerialNo.toString());
      
    return this.http.delete(`${this.apiUrl}/Delete`, { params });
  }
}
