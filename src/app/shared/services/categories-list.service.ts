import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CategoriesListFilter {
  CatNo: number;      // 0 = all; else that category + its route subtree
  OrderBy: number;    // 0 = by route (item no), 1 = by name
}

export interface CategoryListRow {
  TypeNo: number;
  TypeName: string;
  TypeEName: string;
  Father: number | null;
  Branch: number;
  IsBold: number;     // 1 = parent/root (bold)
}

@Injectable({ providedIn: 'root' })
export class CategoriesListService {
  private base = `${environment.apiUrl}/CategoriesList`;

  constructor(private http: HttpClient) {}

  getReport(f: CategoriesListFilter): Observable<CategoryListRow[]> {
    const p = new HttpParams()
      .set('CatNo', f.CatNo)
      .set('OrderBy', f.OrderBy);
    return this.http.get<CategoryListRow[]>(`${this.base}/GetReport`, { params: p });
  }
}
