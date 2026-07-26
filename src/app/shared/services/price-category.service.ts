import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PriceCategoryDto {
  CatNo: number;
  CatName?: string | null;    // Arabic name
  CatEname?: string | null;   // English name
}

@Injectable({ providedIn: 'root' })
export class PriceCategoryService {
  private apiUrl = `${environment.apiUrl}/PriceCategories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PriceCategoryDto[]> {
    return this.http.get<PriceCategoryDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<PriceCategoryDto> {
    return this.http.get<PriceCategoryDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: PriceCategoryDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: PriceCategoryDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
