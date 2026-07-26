import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SubCategory {
  Code: number;
  ArName?: string | null;
  EnName?: string | null;
  CanDelete: boolean;
}

export interface BranchingParent {
  TypeNo: number;
  TypeName?: string | null;
  Etname?: string | null;
  Route?: string | null;
  HasItems: boolean;
}

export interface SaveSubCategoriesRequest {
  ParentNo: number;
  ConvertItems: boolean;
  Children: { Code: number; ArName?: string | null; EnName?: string | null }[];
}

@Injectable({ providedIn: 'root' })
export class SubCategoryService {
  private apiUrl = `${environment.apiUrl}/SubCategories`;

  constructor(private http: HttpClient) {}

  getParent(typeNo: number): Observable<BranchingParent> {
    return this.http.get<BranchingParent>(`${this.apiUrl}/GetParent/${typeNo}`);
  }

  getChildren(parentNo: number): Observable<SubCategory[]> {
    return this.http.get<SubCategory[]>(`${this.apiUrl}/GetChildren/${parentNo}`);
  }

  save(req: SaveSubCategoriesRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, req);
  }
}
