import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StoreDto {
  StoreNo: number;
  StoreName?: string | null;    // Arabic name
  StoreEname?: string | null;   // English name
  AccountNo?: number | null;    // linked GL account
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private apiUrl = `${environment.apiUrl}/Stores`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<StoreDto[]> {
    return this.http.get<StoreDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<StoreDto> {
    return this.http.get<StoreDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: StoreDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: StoreDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
