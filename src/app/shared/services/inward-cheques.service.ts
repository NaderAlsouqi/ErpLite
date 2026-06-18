import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InwardChequesFilterDto {
  DateBasis:  'DUE' | 'RECEIPT';
  DateFrom:   string;
  DateTo:     string;
  ChequeFrom: string;
  ChequeTo:   string;
  AmtFrom:    number;
  AmtTo:      number;
  Status:     number;   // -1 = all
  ChqType:    'BEG' | 'RECEIVED' | 'BOTH';
  BankAccNo:  number;
  CustAccNo:  number;
  BranchNo:   number;
  Drawer:     string;
  SortBy:     'DRAWER' | 'BANK' | 'DATE' | 'AMOUNT';
}

export interface InwardChequeRowDto {
  CustAccNo:   number;
  ChequeNum:   string;
  DueDate:     string;
  ReceiptDate: string;
  DocNum:      string;
  Amount:      number;
  CurNo:       number;
  CurName:     string;
  CurEName:    string;
  Rate:        number;
  LocalAmount: number;
  BankName:    string;
  BankEName:   string;
  Drawer:      string;
  Status:      number;
}

@Injectable({ providedIn: 'root' })
export class InwardChequesService {
  private readonly base = `${environment.apiUrl}/InwardCheques`;

  constructor(private http: HttpClient) {}

  getReport(f: InwardChequesFilterDto): Observable<InwardChequeRowDto[]> {
    const p = new HttpParams()
      .set('DateBasis',  f.DateBasis)
      .set('DateFrom',   f.DateFrom)
      .set('DateTo',     f.DateTo)
      .set('ChequeFrom', f.ChequeFrom ?? '')
      .set('ChequeTo',   f.ChequeTo ?? '')
      .set('AmtFrom',    f.AmtFrom)
      .set('AmtTo',      f.AmtTo)
      .set('Status',     f.Status)
      .set('ChqType',    f.ChqType)
      .set('BankAccNo',  f.BankAccNo)
      .set('CustAccNo',  f.CustAccNo)
      .set('BranchNo',   f.BranchNo)
      .set('Drawer',     f.Drawer ?? '')
      .set('SortBy',     f.SortBy);
    return this.http.get<InwardChequeRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
