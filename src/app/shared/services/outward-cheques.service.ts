import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OutwardChequesFilterDto {
  DateFrom:    string;
  DateTo:      string;
  Status:      number;   // -1 = all
  ChqKind:     'BEG' | 'PAYMENT' | 'BOTH';
  BankAccNo:   number;
  ChequeAccNo: number;
  CustAccNo:   number;
  ChequeFrom:  string;
  ChequeTo:    string;
  AmtFrom:     number;
  AmtTo:       number;
  SerialNo:    number;
  SortBy:      'DATE' | 'CHEQUE' | 'AMOUNT' | 'BENEFICIARY';
}

export interface OutwardChequeRowDto {
  ChequeNum:   string;
  Date1:       string;
  Amount:      number;
  CurNo:       number;
  CurName:     string;
  CurEName:    string;
  Rate:        number;
  LocalAmount: number;
  AccNo:       number;
  AccName:     string;
  AccEName:    string;
  Beneficiary: string;
  DocNum:      string;
  Status:      number;
}

export interface ChequesToBeneficiaryFilterDto {
  Beneficiary: string;
  DateFrom:    string;
  DateTo:      string;
  SortBy:      'DATE' | 'AMOUNT';
}

@Injectable({ providedIn: 'root' })
export class OutwardChequesService {
  private readonly base = `${environment.apiUrl}/OutwardCheques`;

  constructor(private http: HttpClient) {}

  getBeneficiaries(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/GetBeneficiaries`);
  }

  getToBeneficiary(f: ChequesToBeneficiaryFilterDto): Observable<OutwardChequeRowDto[]> {
    const p = new HttpParams()
      .set('Beneficiary', f.Beneficiary ?? '')
      .set('DateFrom',    f.DateFrom)
      .set('DateTo',      f.DateTo)
      .set('SortBy',      f.SortBy);
    return this.http.get<OutwardChequeRowDto[]>(`${this.base}/GetToBeneficiary`, { params: p });
  }

  getReport(f: OutwardChequesFilterDto): Observable<OutwardChequeRowDto[]> {
    const p = new HttpParams()
      .set('DateFrom',    f.DateFrom)
      .set('DateTo',      f.DateTo)
      .set('Status',      f.Status)
      .set('ChqKind',     f.ChqKind)
      .set('BankAccNo',   f.BankAccNo)
      .set('ChequeAccNo', f.ChequeAccNo)
      .set('CustAccNo',   f.CustAccNo)
      .set('ChequeFrom',  f.ChequeFrom ?? '')
      .set('ChequeTo',    f.ChequeTo ?? '')
      .set('AmtFrom',     f.AmtFrom)
      .set('AmtTo',       f.AmtTo)
      .set('SerialNo',    f.SerialNo)
      .set('SortBy',      f.SortBy);
    return this.http.get<OutwardChequeRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
