import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { StoreService, StoreDto } from '../../../shared/services/store.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { BatchExpiryService, BatchExpiryFilter, BatchExpiryRow } from '../../../shared/services/batch-expiry.service';

interface BatchDisplayRow extends BatchExpiryRow { first: boolean; }

@Component({
  selector: 'app-batch-expiry',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './batch-expiry.component.html',
  styleUrl: './batch-expiry.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BatchExpiryComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  scope: 'all' | 'item' = 'all';        // لجميع المواد / للمادة رقم
  itemNo: string | null = null;

  storeAll = true;                      // في جميع المستودعات / في مستودع رقم
  storeNo: number | null = null;

  expMode: 0 | 1 | 2 = 0;               // all / exact / up-to
  expDate: string | null = null;        // YYYY-MM-DD (input)

  batchAll = true;                      // جميع أرقام الباتش / رقم الباتش
  batchNo: string | null = null;

  decimals = 3;

  // whether the last generate ran in all-stores mode (=> show store column)
  showStoreCol = true;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: BatchDisplayRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: BatchExpiryService,
    private storeSvc: StoreService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get colCount(): number { return 4 + (this.showStoreCol ? 1 : 0); }

  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };
  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  /** block non-digit key entry in the batch field (رقم الباتش = numbers only). */
  onlyDigits(e: KeyboardEvent): void { if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); }
  /** strip any non-digits that slipped in (paste/autofill), then clear results. */
  sanitizeBatch(): void { this.batchNo = (this.batchNo ?? '').replace(/\D/g, ''); this.onFilterChange(); }
  onScopeChange(): void { if (this.scope !== 'item') this.itemNo = null; this.onFilterChange(); }
  onStoreModeChange(): void { if (this.storeAll) { this.storeNo = null; } this.onFilterChange(); }
  onExpModeChange(): void { if (this.expMode === 0) { this.expDate = null; } this.onFilterChange(); }
  onBatchModeChange(): void { if (this.batchAll) { this.batchNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (this.scope === 'item' && !this.itemNo) { this.toastr.warning(this.translate.instant('BatchExpiry.ItemRequired')); return false; }
    if (!this.storeAll && !this.storeNo) { this.toastr.warning(this.translate.instant('BatchExpiry.StoreRequired')); return false; }
    if (this.expMode !== 0 && !this.expDate) { this.toastr.warning(this.translate.instant('BatchExpiry.DateRequired')); return false; }
    if (!this.batchAll && !this.batchNo) { this.toastr.warning(this.translate.instant('BatchExpiry.BatchRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: BatchExpiryFilter = {
      ItemNo: this.scope === 'item' ? this.itemNo : null,
      StoreNo: this.storeAll ? 0 : (this.storeNo || 0),
      ExpMode: this.expMode,
      ExpDate: this.expMode !== 0 && this.expDate ? this.expDate.replace(/-/g, '/') : null,  // DB stores 'YYYY/MM/DD'
      BatchNo: this.batchAll ? null : this.batchNo,
    };
    this.showStoreCol = this.storeAll;
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = this.markGroups(data || []); this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  private markGroups(data: BatchExpiryRow[]): BatchDisplayRow[] {
    return data.map((r, i) => ({ ...r, first: i === 0 || data[i - 1].ItemNo !== r.ItemNo }));
  }

  get itemCount(): number { return this.rows.filter(r => r.first).length; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const showStore = this.showStoreCol;

    const cols = [
      { label: t('BatchExpiry.ItemNo') }, { label: t('BatchExpiry.ItemName') },
      { label: t('BatchExpiry.ExpDate') }, { label: t('BatchExpiry.BatchNo') },
      { label: t('BatchExpiry.Qty') }, ...(showStore ? [{ label: t('BatchExpiry.Store') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr>` +
      `<td>${r.first ? (r.ItemNo ?? '') : ''}</td>` +
      `<td>${r.first ? (this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')) : ''}</td>` +
      `<td>${r.ExpDate ?? ''}</td><td>${r.BatchNo ?? ''}</td>` +
      `<td style="text-align:end">${fmt(r.Qty)}${r.Unit ? '  ' + (this.isAr ? r.Unit : (r.UnitE || r.Unit)) : ''}</td>` +
      (showStore ? `<td>${r.StoreNo ?? ''}${r.StoreName ? ' — ' + (this.isAr ? r.StoreName : (r.StoreEName || r.StoreName)) : ''}</td>` : '') +
      `</tr>`).join('');

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      (this.scope === 'item' ? fi(t('BatchExpiry.Item'), this.itemNo) : '') +
      (this.storeAll ? '' : fi(t('BatchExpiry.Store'), this.storeNo)) +
      (this.expMode === 1 ? fi(t('BatchExpiry.ExpExact'), this.expDate) : '') +
      (this.expMode === 2 ? fi(t('BatchExpiry.ExpTo'), this.expDate) : '') +
      (this.batchAll ? '' : fi(t('BatchExpiry.BatchNo'), this.batchNo));

    this.reportPrint.printReport(t('BatchExpiry.Title'), cols, rowsHtml, filtersHtml);
  }
}
