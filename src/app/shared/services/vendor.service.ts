import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VendorDto {
  No: number;
  Name?: string | null;       // Arabic name
  Ename?: string | null;      // English name
  Person?: string | null;
  Address?: string | null;
  Tel?: string | null;
  Tel2?: string | null;
  MobileNo?: string | null;
  Fax?: string | null;
  Pobox?: string | null;
  Zipcode?: string | null;
  Email?: string | null;
  Skype?: string | null;
  Website?: string | null;
  Nickname?: string | null;
  Tradename?: string | null;
  Ceiling?: number | null;
  TaxNo?: number | null;
  PDate?: string | null;      // ISO date
  Related?: boolean;
  Pur?: number;               // read-only
  Year?: number | null;       // read-only
  Balance?: number;           // read-only
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  private apiUrl = `${environment.apiUrl}/Vendors`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VendorDto[]> {
    return this.http.get<VendorDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<VendorDto> {
    return this.http.get<VendorDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: VendorDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: VendorDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }

  import(vendors: VendorDto[]): Observable<{ Added: number; Updated: number; Failed: number; Errors: string[] }> {
    return this.http.post<{ Added: number; Updated: number; Failed: number; Errors: string[] }>(`${this.apiUrl}/Import`, vendors);
  }

  getPurchases(no: number, year: number): Observable<{ pur: number }> {
    const params = new HttpParams().set('no', no).set('year', year);
    return this.http.get<{ pur: number }>(`${this.apiUrl}/Purchases`, { params });
  }
}
