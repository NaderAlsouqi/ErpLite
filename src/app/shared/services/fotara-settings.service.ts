import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Fotara (e-invoicing) company linkage settings.
 * Keys match the backend FotaraDataDto / fotaraData columns exactly
 * (API serialises with PropertyNamingPolicy = null).
 */
export interface FotaraDataDto {
  id?: number;
  the_tax_number?: string | null;
  the_global_tax_number?: string | null;
  income_source_sequence?: string | null;
  Client_Id?: string | null;
  Secret_Key?: string | null;
  the_company_name?: string | null;
  zip_code?: string | null;
  city_code?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FotaraSettingsService {
  private apiUrl = `${environment.apiUrl}/FotaraData`;

  constructor(private http: HttpClient) {}

  get(): Observable<FotaraDataDto> {
    return this.http.get<FotaraDataDto>(`${this.apiUrl}/Get`);
  }

  save(dto: FotaraDataDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/Save`, dto);
  }
}
