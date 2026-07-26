import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Company-wide styling for the standardized report print output. */
export interface ReportPrintSettings {
  // colors
  HeaderBg: string;
  HeaderTextColor: string;
  TitleColor: string;
  BorderColor: string;
  ZebraColor: string;
  BodyTextColor: string;
  // fonts
  FontFamily: string;
  BaseFontSize: number;
  TitleFontSize: number;
  HeaderFontSize: number;
  // header content
  ShowCompanyName: boolean;
  ShowAddress: boolean;
  ShowTaxNumber: boolean;
  ShowTel: boolean;
  ShowLogo: boolean;
  TitleAlign: 'left' | 'center' | 'right';
  // custom text + page setup
  CustomHeader: string;
  CustomFooter: string;
  Orientation: 'portrait' | 'landscape';
  MarginPx: number;
}

/** Defaults — match the original hard-coded print look, used as a fallback. */
export const DEFAULT_PRINT_SETTINGS: ReportPrintSettings = {
  HeaderBg: '#cfe2ff',
  HeaderTextColor: '#084298',
  TitleColor: '#1e293b',
  BorderColor: '#9ec5fe',
  ZebraColor: '#f8fafc',
  BodyTextColor: '#334155',
  FontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
  BaseFontSize: 12,
  TitleFontSize: 20,
  HeaderFontSize: 16,
  ShowCompanyName: true,
  ShowAddress: true,
  ShowTaxNumber: true,
  ShowTel: true,
  ShowLogo: true,
  TitleAlign: 'center',
  CustomHeader: '',
  CustomFooter: '',
  Orientation: 'portrait',
  MarginPx: 30,
};

@Injectable({ providedIn: 'root' })
export class ReportPrintSettingsService {
  private base = `${environment.apiUrl}/ReportPrintSettings`;
  private _current: ReportPrintSettings = { ...DEFAULT_PRINT_SETTINGS };

  constructor(private http: HttpClient) {}

  /** Cached settings for synchronous read by ReportService.printReport(). */
  get value(): ReportPrintSettings { return this._current; }

  /** Load + cache at app startup; never throws (falls back to defaults). */
  load(): Observable<ReportPrintSettings> {
    return this.get().pipe(
      tap(s => { this._current = s; }),
      catchError(() => of(this._current)),
    );
  }

  /** Fetch the server row, merged over defaults so null/missing fields stay sane. */
  get(): Observable<ReportPrintSettings> {
    return this.http.get<Partial<ReportPrintSettings> | null>(`${this.base}/Get`).pipe(
      map(row => this.merge(row)),
    );
  }

  save(s: ReportPrintSettings): Observable<any> {
    return this.http.post(`${this.base}/Save`, s).pipe(
      tap(() => { this._current = { ...s }; }),
    );
  }

  /** Merge a partial (server) row over the defaults (keeps booleans, incl. false). */
  merge(partial: Partial<ReportPrintSettings> | null | undefined): ReportPrintSettings {
    const m: any = { ...DEFAULT_PRINT_SETTINGS };
    if (partial) {
      for (const k of Object.keys(DEFAULT_PRINT_SETTINGS)) {
        const v = (partial as any)[k];
        if (v !== null && v !== undefined && v !== '') { m[k] = v; }
      }
    }
    return m as ReportPrintSettings;
  }
}
