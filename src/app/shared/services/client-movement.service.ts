import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClientMovementFilter {
  DateFrom: string;   // yyyy-MM-dd
  DateTo: string;
  Both: boolean;      // كلا هما — both kinds
  Kind: number;       // 1 = input, 2 = output (when Both = false)
  ClientFrom: number; // venf.no range; 0 = all
  ClientTo: number;
  EntityNo: number;   // 0 = all جهات; else Sideno (output)
  ItemFrom: string;   // item-code range ('' = all)
  ItemTo: string;
}

export interface ClientMovementRow {
  ClientNo: number;
  ClientName: string;
  ClientEName: string;
  Kind: number;       // 1 = input (ادخال), 2 = output (اخراج)
  ItemNo: string;
  ItemName: string;
  ItemEName: string;
  UnitName: string;
  UnitEName: string;
  StoreNo: number;
  StoreName: string;
  StoreEName: string;
  TotQty: number;
  TotalPrice: number;
  AvgCost: number;
  Wcost: number;
}

export interface ClientMovementClient {
  ClientNo: number;
  Name: string;
  EName: string;
}

@Injectable({ providedIn: 'root' })
export class ClientMovementService {
  private base = `${environment.apiUrl}/ClientMovement`;

  constructor(private http: HttpClient) {}

  getReport(f: ClientMovementFilter): Observable<ClientMovementRow[]> {
    const p = new HttpParams()
      .set('DateFrom', f.DateFrom)
      .set('DateTo', f.DateTo)
      .set('Both', f.Both)
      .set('Kind', f.Kind)
      .set('ClientFrom', f.ClientFrom)
      .set('ClientTo', f.ClientTo)
      .set('EntityNo', f.EntityNo)
      .set('ItemFrom', f.ItemFrom || '')
      .set('ItemTo', f.ItemTo || '');
    return this.http.get<ClientMovementRow[]>(`${this.base}/GetReport`, { params: p });
  }

  getClients(): Observable<ClientMovementClient[]> {
    return this.http.get<ClientMovementClient[]>(`${this.base}/Clients`);
  }
}
