import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── DTOs (PascalCase to match API JSON serialization) ────────

export interface CheqTrackingHeaderDto {
  DocNo: number;
  MyYear: number;
  VType: number;
  Date: string;
  BrNo: number;
  CurNo: number;
  CurRate: number;
  IsPosted: boolean;
}

export interface CheqTrackingLineDto {
  CheqNum: string;
  Date1: string | null;
  Amt: number;
  Ben: string | null;
  BankAcc: number;
  Acc2: number;
  Acc2Name: string | null;
  DocNum: string | null;
}

export interface CheqTrackingVoucherDto {
  Header: CheqTrackingHeaderDto;
  Lines: CheqTrackingLineDto[];
}

export interface CheqTrackingListItemDto {
  DocNo: number;
  MyYear: number;
  VType: number;
  Date: string;
  BrNo: number;
  CurNo: number;
  Total: number;
  LineCount: number;
}

export interface CheqTrackingNavigationDto {
  MinDocNo: number;
  MaxDocNo: number;
}

export interface AvailableCheq2Dto {
  CheqNum: string;
  Date1: string | null;
  Amt: number;
  Ben: string | null;
  Rate: number;
  BankAcc: number;
  Acc2: number;
  Acc2Name: string | null;
  DocNum: string | null;
}

export interface SaveCheqTrackingLine {
  cheqNum: string;
  bankAcc: number;
  acc2: number;
  amt: number;
}

export interface SaveCheqTrackingRequest {
  docNo: number;
  myYear: number;
  vType: number;
  date: string;
  brNo: number;
  curNo: number;
  curRate: number;
  lines: SaveCheqTrackingLine[];
}

export interface SaveCheqTrackingResult {
  Success: boolean;
  DocNo: number;
  Message: string | null;
}

// ─── Service ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CheqTrackingService {
  private readonly api = `${environment.apiUrl}/CheqTracking`;

  constructor(private http: HttpClient) {}

  getList(myYear: number, vType: number, page: number, pageSize: number):
      Observable<{ items: CheqTrackingListItemDto[]; total: number }> {
    const params = new HttpParams()
      .set('myYear', myYear).set('vType', vType)
      .set('page', page).set('pageSize', pageSize);
    return this.http.get<{ items: CheqTrackingListItemDto[]; total: number }>(
      `${this.api}/list`, { params }).pipe(catchError(this.handleError));
  }

  getVoucher(docNo: number, myYear: number, vType: number):
      Observable<CheqTrackingVoucherDto> {
    const params = new HttpParams()
      .set('docNo', docNo).set('myYear', myYear).set('vType', vType);
    return this.http.get<CheqTrackingVoucherDto>(
      `${this.api}/voucher`, { params }).pipe(catchError(this.handleError));
  }

  getNextDocNo(myYear: number, vType: number): Observable<number> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http.get<number>(
      `${this.api}/nextDocNo`, { params }).pipe(catchError(this.handleError));
  }

  getNavigation(myYear: number, vType: number):
      Observable<CheqTrackingNavigationDto> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http.get<CheqTrackingNavigationDto>(
      `${this.api}/navigation`, { params }).pipe(catchError(this.handleError));
  }

  getAdjacentDocNo(docNo: number, myYear: number, vType: number, direction: string):
      Observable<number> {
    const params = new HttpParams()
      .set('docNo', docNo).set('myYear', myYear)
      .set('vType', vType).set('direction', direction);
    return this.http.get<number>(
      `${this.api}/adjacentDocNo`, { params }).pipe(catchError(this.handleError));
  }

  getAvailableCheques(vType: number, fromDate: string, toDate: string):
      Observable<AvailableCheq2Dto[]> {
    let params = new HttpParams().set('vType', vType);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate)   params = params.set('toDate', toDate);
    return this.http.get<AvailableCheq2Dto[]>(
      `${this.api}/availableCheques`, { params }).pipe(catchError(this.handleError));
  }

  save(req: SaveCheqTrackingRequest): Observable<SaveCheqTrackingResult> {
    return this.http.post<SaveCheqTrackingResult>(
      `${this.api}/save`, req).pipe(catchError(this.handleError));
  }

  delete(docNo: number, myYear: number, vType: number): Observable<SaveCheqTrackingResult> {
    const params = new HttpParams().set('myYear', myYear).set('vType', vType);
    return this.http.delete<SaveCheqTrackingResult>(
      `${this.api}/${docNo}`, { params }).pipe(catchError(this.handleError));
  }

  private handleError(err: any): Observable<never> {
    const msg = err?.error?.message ?? err?.message ?? 'Server error';
    return throwError(() => new Error(msg));
  }
}
