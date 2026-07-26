import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ItemUnitRow {
  UnitNo: number;
  UnitName?: string;
  Operand: number;
  Price?: number | null;
  Barcode?: string;
  IsMin: boolean;
  IsMax: boolean;
}

export interface ItemCategRow {
  CategNo: number;
  CatName?: string;
  Price?: number | null;
  MinPrice?: number | null;
  Dis?: number | null;
  Bonus?: number | null;
}

export interface ItemAltRow {
  InstedItem?: string;
  InstedName?: string;
}

export interface ItemCard {
  ItemNo?: string;
  ItemName?: string;
  Ename?: string;
  TypeNo?: number | null;
  TypeName?: string;
  Barcode?: string;
  Place?: string;
  OrderLimit?: number | null;
  OrderQty?: number | null;
  Price?: number | null;
  Cost?: number | null;
  OriginNo?: number | null;
  OriginName?: string;
  BrandNo?: number | null;
  BrandName?: string;
  Pack40?: number | null;
  Pack20?: number | null;
  ItemWeight?: number | null;
  ContLength?: number | null;
  ContWidth?: number | null;
  TaxNo?: number | null;
  TaxPerc?: number | null;
  TaxCheck?: boolean;
  Stopped?: boolean;
  Expired?: boolean;
  Units: ItemUnitRow[];
  Categs: ItemCategRow[];
  Alts: ItemAltRow[];
}

export interface ItemCardLookups {
  Categories: { TypeNo: number; TypeName: string; Etname: string }[];
  Origins: { OriginNo: number; OriginName: string; OriginEname: string }[];
  Brands: { BrandNo: number; BrandName: string; BrandEname: string }[];
  Taxes: { TaxNo: number; TaxNameA: string; TaxNameE: string; TaxPerc: number }[];
  Units: { UnitNo: number; UnitName: string; UnitEname: string }[];
  PriceCategories: { CategNo: number; CatName: string; CateEname: string }[];
}

export interface ItemSearchResult { ItemNo: string; ItemName: string; Ename: string; }

export interface ItemImportResult {
  Added: number;
  Updated: number;
  Failed: number;
  Errors: string[];
}

export interface ItemListRow {
  ItemNo: string;
  ItemName?: string;
  Ename?: string;
  TypeNo?: number | null;
  CategoryName?: string;
  Price?: number | null;
  Unit?: string;
  Barcode?: string;
  Stopped?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ItemCardService {
  private apiUrl = `${environment.apiUrl}/ItemCard`;

  constructor(private http: HttpClient) {}

  getLookups(): Observable<ItemCardLookups> {
    return this.http.get<ItemCardLookups>(`${this.apiUrl}/Lookups`);
  }

  search(term: string): Observable<ItemSearchResult[]> {
    const params = new HttpParams().set('term', term || '');
    return this.http.get<ItemSearchResult[]>(`${this.apiUrl}/Search`, { params });
  }

  get(itemNo: string): Observable<ItemCard> {
    return this.http.get<ItemCard>(`${this.apiUrl}/Get/${encodeURIComponent(itemNo)}`);
  }

  list(): Observable<ItemListRow[]> {
    return this.http.get<ItemListRow[]>(`${this.apiUrl}/List`);
  }

  nextNo(typeNo: number): Observable<{ nextNo: string }> {
    return this.http.get<{ nextNo: string }>(`${this.apiUrl}/NextNo/${typeNo}`);
  }

  save(card: ItemCard): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, card);
  }

  import(items: ItemCard[]): Observable<ItemImportResult> {
    return this.http.post<ItemImportResult>(`${this.apiUrl}/Import`, items);
  }

  delete(itemNo: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${encodeURIComponent(itemNo)}`);
  }
}
