import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccfDto {
  no: number;
  name?: string | null;
  Ename?: string | null;
  belong?: number | null;
  branch?: number | null;
  level?: number | null;
  bb?: number | null;
  f_bb?: number | null;
  CurNo?: number | null;
  LRate?: number | null;
  balance1?: number | null;
  BB_Tr?: number | null;
  CcntrNo?: number | null;
  budgetF?: number | null;
  ProfL?: number | null;
  Stopped?: number | null;
  Celing?: number | null;
  accorder?: number | null;
  fatherorder?: number | null;
  br_no?: number | null;
}

export interface AccfNameDto {
  no: number;
  name?: string | null;
  Ename?: string | null;
  level?: number | null;
  belong?: number | null;
  Stopped?: number | null;
}

export interface RenameAccountDto {
  no: number;
  name: string | null;
  Ename: string | null;  // if null/empty the backend copies name → Ename
}

@Injectable({ providedIn: 'root' })
export class AccfService {
  private apiUrl = `${environment.apiUrl}/Accf`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AccfDto[]> {
    return this.http.get<AccfDto[]>(`${this.apiUrl}/GetAll`);
  }

  update(no: number, dto: AccfDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${no}`, dto);
  }

  updateBatch(rows: AccfDto[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/UpdateBatch`, rows);
  }

  /** All accounts (leaf + parent) with name fields — used by Edit Account Names page. */
  getAllNames(): Observable<AccfNameDto[]> {
    return this.http.get<AccfNameDto[]>(`${this.apiUrl}/GetAllNames`);
  }

  /**
   * Rename accounts with cascading update to cusf, billf1, billf1_Serv.
   * Mirrors the VB6 logic: if Ename is blank the backend copies name → Ename.
   */
  renameBatch(rows: RenameAccountDto[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/RenameBatch`, rows);
  }
}
