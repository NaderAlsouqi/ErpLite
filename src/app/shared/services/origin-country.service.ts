import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OriginCountryDto {
  OriginNo: number;
  OriginName?: string | null;    // Arabic name
  OriginEname?: string | null;   // English name
}

@Injectable({ providedIn: 'root' })
export class OriginCountryService {
  private apiUrl = `${environment.apiUrl}/OriginCountries`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<OriginCountryDto[]> {
    return this.http.get<OriginCountryDto[]>(`${this.apiUrl}/GetAll`);
  }

  getById(id: number): Observable<OriginCountryDto> {
    return this.http.get<OriginCountryDto>(`${this.apiUrl}/GetById/${id}`);
  }

  add(dto: OriginCountryDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Add`, dto);
  }

  update(id: number, dto: OriginCountryDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Update/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Delete/${id}`);
  }
}
