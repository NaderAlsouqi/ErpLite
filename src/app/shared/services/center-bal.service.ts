import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CenterBalDto {
  CcNo: number;
  AccNo: number;
  Bb: number | null;
}

export interface SaveCenterBalRequest {
  ccNo: number;
  entries: { accNo: number; bb: number }[];
}

@Injectable({ providedIn: 'root' })
export class CenterBalService {
  private apiUrl = `${environment.apiUrl}/CenterBal`;

  constructor(private http: HttpClient) {}

  getByCcNo(ccNo: number): Observable<CenterBalDto[]> {
    return this.http.get<CenterBalDto[]>(`${this.apiUrl}/GetByCcNo/${ccNo}`);
  }

  saveBatch(req: SaveCenterBalRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, req);
  }
}
