import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LookupItem {
  Id: number;
  Name: string;
  EName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private apiUrl = `${environment.apiUrl}/Lookup`;

  constructor(private http: HttpClient) { }

  getVoucherTypes(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/VoucherTypes`);
  }

  getBranches(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/Branches`);
  }

  getStores(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.apiUrl}/Stores`);
  }
}
