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
import { AuthService } from '../../../shared/services/auth.service';
import { StoreService, StoreDto } from '../../../shared/services/store.service';
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { StockListService, StockListFilter, StockListRow } from '../../../shared/services/stock-list.service';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StockListComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  asOfDate = this.toDateStr(new Date());          // لتاريخ

  storeAll = true;                                // في جميع المستودعات vs في مستودع رقم
  storeNo: number | null = null;

  scope: 'all' | 'category' | 'item' = 'all';     // لجميع الأصناف / لصنف رقم / لمادة رقم
  catNo: number | null = null;
  itemNo: string | null = null;

  largestUnit = false;                            // أكبر وحدة (true) / أصغر وحدة (false)
  showZero = false;                               // إظهار المواد التي رصيدها صفر (Check2)
  showCostCol = true;                             // إظهار الكلفة (Check1) — gated by ViewCost
  showPrice = false;                              // أظهار سعر البيع (Check3)
  orderBy: 0 | 1 | 2 | 3 = 0;
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  categories: MainCategoryDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: StockListRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: StockListService,
    private storeSvc: StoreService,
    private catSvc: MainCategoryService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get canViewCost(): boolean { return this.auth.hasPermission('StockList.ViewCost'); }
  get showCostColumns(): boolean { return this.canViewCost && this.showCostCol; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  // ─── Totals ────────────────────────────────────────────────
  get totQoH(): number { return this.rows.reduce((s, r) => s + (+r.QoH || 0), 0); }
  get totValue(): number { return this.rows.reduce((s, r) => s + (+r.TotalValue || 0), 0); }

  // ─── search fns ────────────────────────────────────────────
  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };
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
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onStoreModeChange(): void { if (this.storeAll) { this.storeNo = null; } this.onFilterChange(); }
  onScopeChange(): void {
    if (this.scope !== 'category') this.catNo = null;
    if (this.scope !== 'item') this.itemNo = null;
    this.onFilterChange();
  }

  private validate(): boolean {
    if (!this.asOfDate) { this.toastr.warning(this.translate.instant('StockList.DateRequired')); return false; }
    if (!this.storeAll && !this.storeNo) { this.toastr.warning(this.translate.instant('StockList.StoreRequired')); return false; }
    if (this.scope === 'category' && !this.catNo) { this.toastr.warning(this.translate.instant('StockList.CategoryRequired')); return false; }
    if (this.scope === 'item' && !this.itemNo) { this.toastr.warning(this.translate.instant('StockList.ItemRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: StockListFilter = {
      AsOfDate: this.asOfDate,
      StoreNo: this.storeAll ? 0 : (this.storeNo || 0),
      CatNo: this.scope === 'category' ? (this.catNo || 0) : 0,
      ItemNo: this.scope === 'item' ? this.itemNo : null,
      ShowZero: this.showZero,
      LargestUnit: this.largestUnit,
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
    const showCost = this.showCostColumns;
    const showPrice = this.showPrice;

    const cols = [
      { label: t('StockList.ItemNo') }, { label: t('StockList.ItemName') },
      { label: t('StockList.Category') }, { label: t('StockList.Unit') },
      { label: t('StockList.Quantity') }, { label: t('StockList.ManualQty') },
      ...(showCost ? [{ label: t('StockList.Cost') }, { label: t('StockList.Total') }] : []),
      ...(showPrice ? [{ label: t('StockList.Price') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || '')}</td><td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td style="text-align:end">${fmt(r.QoH)}</td><td></td>` +
      (showCost ? `<td style="text-align:end">${fmt(r.AvgCost)}</td><td style="text-align:end">${fmt(r.TotalValue)}</td>` : '') +
      (showPrice ? `<td style="text-align:end">${fmt(r.Price)}</td>` : '') +
      `</tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="4">${t('General.Total')}</td>` +
      `<td style="text-align:end">${fmt(this.totQoH)}</td><td></td>` +
      (showCost ? `<td></td><td style="text-align:end">${fmt(this.totValue)}</td>` : '') +
      (showPrice ? `<td></td>` : '') + `</tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('StockList.AsOfDate'), this.asOfDate) +
      (this.storeAll ? '' : fi(t('StockList.Store'), this.storeLabel())) +
      (this.scope === 'category' ? fi(t('StockList.Category'), this.catLabel()) : '') +
      (this.scope === 'item' ? fi(t('StockList.Item'), this.itemNo) : '') +
      (this.largestUnit ? fi(t('StockList.Unit'), t('StockList.LargestUnit')) : '');

    this.reportPrint.printReport(t('StockList.Title'), cols, rowsHtml + totRow, filtersHtml);
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
