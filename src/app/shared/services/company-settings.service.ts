import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CompanyInfoDto, ComfService } from './comf.service';

@Injectable({ providedIn: 'root' })
export class CompanySettingsService {
  private _settings = new BehaviorSubject<CompanyInfoDto | null>(null);

  constructor(private comfService: ComfService) {}

  /** Load (or reload) company settings from the API and cache them. */
  load(): Observable<CompanyInfoDto> {
    return this.comfService.getCompanyInfo().pipe(
      tap(data => this._settings.next(data))
    );
  }

  /** Raw snapshot — null until first load completes. */
  get snapshot(): CompanyInfoDto | null { return this._settings.value; }

  // ── Scalar accessors with safe defaults ─────────────────────────────────────

  /** Decimal places for accounting / balance amounts. */
  get decimals(): number { return this._settings.value?.decimals ?? 3; }

  /** Decimal places for invoice / sales amounts. */
  get billDecimals(): number { return this._settings.value?.billDecimals ?? 3; }

  /** Arabic company name. */
  get companyName(): string { return this._settings.value?.name ?? ''; }

  /** English company name. */
  get companyEName(): string { return this._settings.value?.eName ?? ''; }

  /** Best available display name (Arabic first, then English). */
  get displayName(): string {
    return this._settings.value?.name || this._settings.value?.eName || '';
  }

  get address(): string              { return this._settings.value?.address ?? ''; }
  get tel(): string                  { return this._settings.value?.tel ?? ''; }
  get taxNum(): string               { return this._settings.value?.taxNum ?? ''; }

  get allowTax(): boolean            { return this._settings.value?.allowTax ?? true; }
  get alowDateMoreThanToday(): boolean { return this._settings.value?.alowDateMoreThanToday ?? false; }
  get alowMultiCCnter(): boolean     { return this._settings.value?.alowMultiCCnter ?? false; }
  get hiddenCurrency(): boolean      { return this._settings.value?.hiddenCurrency ?? false; }
  get cur(): string                  { return this._settings.value?.cur ?? ''; }
  get bbd(): string | null           { return this._settings.value?.bbd ?? null; }

  // ── Formatting helpers ───────────────────────────────────────────────────────

  /**
   * Format an accounting / balance value using `decimals`.
   * Returns '—' for null/undefined/NaN.
   */
  fmt(val: number | null | undefined): string {
    if (val == null || isNaN(+val)) return '—';
    return (+val).toFixed(this.decimals);
  }

  /**
   * Format an invoice / sales amount using `billDecimals`.
   * Returns '—' for null/undefined/NaN.
   */
  fmtBill(val: number | null | undefined): string {
    if (val == null || isNaN(+val)) return '—';
    return (+val).toFixed(this.billDecimals);
  }
}
