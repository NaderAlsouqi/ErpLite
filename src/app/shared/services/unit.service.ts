import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UnitDto {
  UnitNo: number;
  UnitName?: string | null;   // Arabic name
  UnitEname?: string | null;  // English name
}

@Injectable({ providedIn: 'root' })
export class UnitService {
  private apiUrl = `${environment.apiUrl}/Units`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UnitDto[]> {
    return this.http.get<UnitDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<UnitDto> {
    return this.http.get<UnitDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: UnitDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: UnitDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
