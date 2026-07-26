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
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { SlowMovingService, SlowMovingFilter, SlowMovingRow } from '../../../shared/services/slow-moving.service';

@Component({
  selector: 'app-slow-moving',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './slow-moving.component.html',
  styleUrl: './slow-moving.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SlowMovingComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  pct: number | null = null;            // نسبة الحركة أقل من (required)

  storeAll = true;
  storeNo: number | null = null;

  catAll = true;
  catNo: number | null = null;

  orderBy: 0 | 1 | 2 | 5 = 0;           // 0 item no, 1 item name, 2 category no, 5 trans %
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  categories: MainCategoryDto[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: SlowMovingRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: SlowMovingService,
    private storeSvc: StoreService,
    private catSvc: MainCategoryService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  // ─── Totals ────────────────────────────────────────────────
  get totIn(): number { return this.rows.reduce((s, r) => s + (+r.QtyIn || 0), 0); }
  get totOut(): number { return this.rows.reduce((s, r) => s + (+r.QtyOut || 0), 0); }
  get totBal(): number { return this.rows.reduce((s, r) => s + (+r.Balance || 0), 0); }

  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };
  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onStoreModeChange(): void { if (this.storeAll) { this.storeNo = null; } this.onFilterChange(); }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('SlowMoving.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('SlowMoving.DateRangeInvalid')); return false; }
    if (this.pct == null || this.pct === ('' as any)) { this.toastr.warning(this.translate.instant('SlowMoving.PctRequired')); return false; }
    if (!this.storeAll && !this.storeNo) { this.toastr.warning(this.translate.instant('SlowMoving.StoreRequired')); return false; }
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('SlowMoving.CategoryRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: SlowMovingFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      Pct: +(this.pct as number),
      StoreNo: this.storeAll ? 0 : (this.storeNo || 0),
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      OrderBy: this.orderBy,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  itemName(r: SlowMovingRow): string { return this.isAr ? (r.ItemName ?? '') : (r.ItemEName || r.ItemName || ''); }
  typeName(r: SlowMovingRow): string { return this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || ''); }
  pctPct(r: SlowMovingRow): number { return (+r.Perc || 0) * 100; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const fmt2 = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    const cols = [
      { label: t('SlowMoving.ItemNo') }, { label: t('SlowMoving.ItemName') },
      { label: t('SlowMoving.CategoryNo') }, { label: t('SlowMoving.CategoryName') },
      { label: t('SlowMoving.QtyIn') }, { label: t('SlowMoving.QtyOut') },
      { label: t('SlowMoving.Balance') }, { label: t('SlowMoving.Perc') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.itemName(r)}</td>` +
      `<td>${r.TypeNo ?? ''}</td><td>${this.typeName(r)}</td>` +
      `<td style="text-align:end">${fmt(r.QtyIn)}</td><td style="text-align:end">${fmt(r.QtyOut)}</td>` +
      `<td style="text-align:end">${fmt(r.Balance)}</td><td style="text-align:end">${fmt2(this.pctPct(r))}%</td></tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="4">${t('General.Total')}</td>` +
      `<td style="text-align:end">${fmt(this.totIn)}</td><td style="text-align:end">${fmt(this.totOut)}</td>` +
      `<td style="text-align:end">${fmt(this.totBal)}</td><td></td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const ordKey = this.orderBy === 1 ? 'SlowMoving.OrderByName'
      : this.orderBy === 2 ? 'SlowMoving.OrderByCat'
      : this.orderBy === 5 ? 'SlowMoving.OrderByPerc' : 'SlowMoving.OrderByItem';
    const filtersHtml =
      fi(t('SlowMoving.Period'), `${this.dateFrom} — ${this.dateTo}`) +
      fi(t('SlowMoving.PctLabel'), `${this.pct}%`) +
      (this.storeAll ? '' : fi(t('SlowMoving.Store'), this.storeLabel())) +
      (this.catAll ? '' : fi(t('SlowMoving.Category'), this.catLabel())) +
      fi(t('SlowMoving.OrderBy'), t(ordKey));

    this.reportPrint.printReport(t('SlowMoving.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
  private storeLabel(): string {
    const s = this.stores.find(x => x.StoreNo === this.storeNo);
    return s ? `${s.StoreNo} — ${this.isAr ? s.StoreName : (s.StoreEname || s.StoreName)}` : String(this.storeNo ?? '');
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
