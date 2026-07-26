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
import { ReorderLevelService, ReorderLevelFilter, ReorderLevelRow } from '../../../shared/services/reorder-level.service';

@Component({
  selector: 'app-reorder-level',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './reorder-level.component.html',
  styleUrl: './reorder-level.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ReorderLevelComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  catAll = true;                        // لجميع الأصناف vs للصنف رقم
  catNo: number | null = null;

  storeAll = true;                      // في جميع المستودعات vs في مستودع رقم
  storeNo: number | null = null;        // single store (VB6 Text1(1))

  orderBy: 0 | 1 = 0;                   // 0 = Item No, 1 = Item Name
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  categories: MainCategoryDto[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: ReorderLevelRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: ReorderLevelService,
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
  get totOnHand(): number { return this.rows.reduce((s, r) => s + (+r.OnHand || 0), 0); }
  get totOnOrder(): number { return this.rows.reduce((s, r) => s + (+r.OnOrder || 0), 0); }
  get totOrderQty(): number { return this.rows.reduce((s, r) => s + (+r.OrderQty || 0), 0); }

  // ─── search fns ────────────────────────────────────────────
  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };
  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }
  onStoreModeChange(): void { if (this.storeAll) { this.storeNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('ReorderLevel.CategoryRequired')); return false; }
    if (!this.storeAll && !this.storeNo) { this.toastr.warning(this.translate.instant('ReorderLevel.StoreRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: ReorderLevelFilter = {
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      StoreNo: this.storeAll ? 0 : (this.storeNo || 0),
      OrderBy: this.orderBy,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));

    const cols = [
      { label: t('ReorderLevel.ItemNo') }, { label: t('ReorderLevel.ItemName') },
      { label: t('ReorderLevel.Category') }, { label: t('ReorderLevel.OnHand') },
      { label: t('ReorderLevel.OnOrder') }, { label: t('ReorderLevel.ReorderPoint') },
      { label: t('ReorderLevel.OrderQty') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.OnHand)}</td><td style="text-align:end">${fmt(r.OnOrder)}</td>` +
      `<td style="text-align:end">${fmt(r.ReorderPoint)}</td><td style="text-align:end">${fmt(r.OrderQty)}</td></tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td>` +
      `<td style="text-align:end">${fmt(this.totOnHand)}</td><td style="text-align:end">${fmt(this.totOnOrder)}</td>` +
      `<td></td><td style="text-align:end">${fmt(this.totOrderQty)}</td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      (this.catAll ? '' : fi(t('ReorderLevel.Category'), this.catLabel())) +
      (this.storeAll ? '' : fi(t('ReorderLevel.Store'), this.storeLabel()));

    this.reportPrint.printReport(t('ReorderLevel.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
  private storeLabel(): string {
    const s = this.stores.find(x => x.StoreNo === this.storeNo);
    return s ? `${s.StoreNo} — ${this.isAr ? s.StoreName : (s.StoreEname || s.StoreName)}` : String(this.storeNo ?? '');
  }
}
