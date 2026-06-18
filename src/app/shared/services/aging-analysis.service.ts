import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgingAnalysisFilterDto {
  AsOfDate:  string;
  BelongAcc: number;
  SalesMan?: number;
  AreaNo?:   number;
  SortBy?:   number;   // 1=No 2=Name 3=SMan 4=PayType 5=Balance
}

export interface AreaDto {
  Id:    number;
  Name:  string;
  EName: string;
}

export interface AgingAnalysisRowDto {
  AccNo:              number;
  AccName:            string;
  AccEName:           string;
  Address:            string;
  Tel:                string;
  PayType:            number;
  AreaNo:             number;
  SalesManNo:         number;
  SalesManName:       string;
  SalesManEName:      string;
  Balance:            number;
  Bucket1_30:         number;
  Bucket31_60:        number;
  Bucket61_90:        number;
  Bucket91_120:       number;
  BucketOver120:      number;
  UncollectedCheques: number;
}

@Injectable({ providedIn: 'root' })
export class AgingAnalysisService {
  private readonly base = `${environment.apiUrl}/AgingAnalysis`;

  constructor(private http: HttpClient) {}

  getAreas(): Observable<AreaDto[]> {
    return this.http.get<AreaDto[]>(`${environment.apiUrl}/Lookup/Areas`);
  }

  getReport(f: AgingAnalysisFilterDto): Observable<AgingAnalysisRowDto[]> {
    let p = new HttpParams()
      .set('AsOfDate',  f.AsOfDate)
      .set('BelongAcc', f.BelongAcc)
      .set('SalesMan',  f.SalesMan ?? 0)
      .set('AreaNo',    f.AreaNo   ?? 0)
      .set('SortBy',    f.SortBy   ?? 1);
    return this.http.get<AgingAnalysisRowDto[]>(`${this.base}/GetReport`, { params: p });
  }
}
