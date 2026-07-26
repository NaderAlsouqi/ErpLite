import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemLookup {
  ItemNo: string;
  ItemName?: string | null;
  Ename?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReplaceItemCodeService {
  private apiUrl = `${environment.apiUrl}/ReplaceItemCode`;

  constructor(private http: HttpClient) {}

  searchItems(term: string): Observable<ItemLookup[]> {
    const params = new HttpParams().set('term', term || '');
    return this.http.get<ItemLookup[]>(`${this.apiUrl}/SearchItems`, { params });
  }

  replace(oldItemNo: string, newItemNo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/Replace`, { OldItemNo: oldItemNo, NewItemNo: newItemNo });
  }
}
