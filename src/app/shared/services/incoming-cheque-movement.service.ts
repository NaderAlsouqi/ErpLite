import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncomingChequeDto {
  ChequeNum:    string;
  BankNum:      number;
  Draw:         string;
  Amount:       number;
  DueDate:      string;
  ReceiptDate:  string;
  CustAccNo:    number;
  CustAccName:  string;
  CustAccEName: string;
  SerialTypeNo: number;
  SerialNo:     number;
  SerialName:   string;
  SerialEName:  string;
  BranchNo:     number;
  BranchName:   string;
  BranchEName:  string;
}

export interface ChequeSerialTypeDto {
  SerialTypeNo: number;
  SerialNo:     number;
  SerialName:   string;
  SerialEName:  string;
  BranchNo:     number;
  BranchName:   string;
  BranchEName:  string;
}

export interface IncomingChequeMovementRowDto {
  Section:   number;
  DocNum:    string;
  DocDate:   string;
  TransType: string;   // code — client localizes
  AccName:   string;
  AccEName:  string;
  Note:      string;
}

@Injectable({ providedIn: 'root' })
export class IncomingChequeMovementService {
  private readonly base = `${environment.apiUrl}/IncomingChequeMovement`;

  constructor(private http: HttpClient) {}

  getSerialTypes(): Observable<ChequeSerialTypeDto[]> {
    return this.http.get<ChequeSerialTypeDto[]>(`${this.base}/GetSerialTypes`);
  }

  getCheques(): Observable<IncomingChequeDto[]> {
    return this.http.get<IncomingChequeDto[]>(`${this.base}/GetCheques`);
  }

  getMovement(chequeNum: string, bankNum: number, draw: string): Observable<IncomingChequeMovementRowDto[]> {
    const p = new HttpParams()
      .set('ChequeNum', chequeNum)
      .set('BankNum',   bankNum)
      .set('Draw',      draw ?? '');
    return this.http.get<IncomingChequeMovementRowDto[]>(`${this.base}/GetMovement`, { params: p });
  }
}
