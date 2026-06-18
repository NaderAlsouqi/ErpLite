import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Branch {
  BranchNo: number;
  BranchArName: string;
  BranchEnName: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchesService {
  private apiUrl = `${environment.apiUrl}/Branches`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Branch[]> {
    return this.http.get<Branch[]>(`${this.apiUrl}/GetAll`);
  }

  save(dto: Branch): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, dto);
  }

  delete(branchNo: number): Observable<any> {
    const params = new HttpParams().set('branchNo', branchNo.toString());
    return this.http.delete(`${this.apiUrl}/Delete`, { params });
  }
}
