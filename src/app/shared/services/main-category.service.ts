import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MainCategoryDto {
  TypeNo: number;
  TypeName?: string | null;    // Arabic name
  Etname?: string | null;      // English name
  ViewMe: boolean;             // visible flag
  NonStk: boolean;             // non-stock flag
}

@Injectable({ providedIn: 'root' })
export class MainCategoryService {
  private apiUrl = `${environment.apiUrl}/MainCategories`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<MainCategoryDto[]> {
    return this.http.get<MainCategoryDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<MainCategoryDto> {
    return this.http.get<MainCategoryDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: MainCategoryDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: MainCategoryDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
