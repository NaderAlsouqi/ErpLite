import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrandDto {
  BrandNo: number;
  BrandName?: string | null;    // Arabic name
  BrandEname?: string | null;   // English name
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private apiUrl = `${environment.apiUrl}/Brands`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<BrandDto[]> {
    return this.http.get<BrandDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<BrandDto> {
    return this.http.get<BrandDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: BrandDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: BrandDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
