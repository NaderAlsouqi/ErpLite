import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VoucherPostingService {
  private api = `${environment.apiUrl}/Vouchers`;

  constructor(private http: HttpClient) {}

  getUnpostedCount(fromDate?: string | null, toDate?: string | null): Observable<{ unpostedCount: number }> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<{ unpostedCount: number }>(`${this.api}/UnpostedCount`, { params });
  }

  /** اعتماد — post all unposted movements in the (optional) date range. */
  post(fromDate?: string | null, toDate?: string | null): Observable<{ posted: number; message: string }> {
    return this.http.post<{ posted: number; message: string }>(
      `${this.api}/Post`, { fromDate: fromDate || null, toDate: toDate || null });
  }
}
