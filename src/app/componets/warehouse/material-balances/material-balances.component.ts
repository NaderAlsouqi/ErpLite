import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { MaterialBalancesService, MaterialBalancesFilter, MaterialBalanceRow } from '../../../shared/services/material-balances.service';

@Component({
  selector: 'app-material-balances',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './material-balances.component.html',
  styleUrl: './material-balances.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MaterialBalancesComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  itemAll = true;                       // لجميع المواد vs للمواد من رقم
  itemFrom: string | null = null;
  itemTo: string | null = null;

  catAll = true;                        // لجميع الاصناف vs للصنف
  catNo: number | null = null;

  storeAll = true;                      // في جميع المستودعات vs في مستودع رقم
  storeFrom: number | null = null;
  storeTo: number | null = null;

  orderBy: 0 | 1 | 2 | 3 | 4 = 0;
  showZero = true;                      // اظهار المواد التي رصيدها صفر
  largestUnit = false;                  // اكبر وحدة
  excludeTransfers = false;             // إستثناء سندات النقل
  showCostCol = true;                   // إظهار متوسط الكلفة (VB6 Check2) — only usable with the ViewCost permission
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  categories: MainCategoryDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: MaterialBalanceRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: MaterialBalancesService,
    private storeSvc: StoreService,
    private catSvc: MainCategoryService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  /** whether the user is ALLOWED to see cost (VB6 TrustyShowCost(74)) — gates the checkbox. */
  get canViewCost(): boolean { return this.auth.hasPermission('MaterialBalances.ViewCost'); }
  /** whether the متوسط الكلفة/القيمة columns actually show = permission AND checkbox ticked. */
  get showCostColumns(): boolean { return this.canViewCost && this.showCostCol; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  // ─── Totals ────────────────────────────────────────────────
  get totOpening(): number { return this.rows.reduce((s, r) => s + (+r.OpeningQty || 0), 0); }
  get totIn(): number { return this.rows.reduce((s, r) => s + (+r.TotalIn || 0), 0); }
  get totOut(): number { return this.rows.reduce((s, r) => s + (+r.TotalOut || 0), 0); }
  get totNet(): number { return this.rows.reduce((s, r) => s + (+r.NetBalance || 0), 0); }
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
  onItemModeChange(): void { if (this.itemAll) { this.itemFrom = null; this.itemTo = null; } this.onFilterChange(); }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }
  onStoreModeChange(): void { if (this.storeAll) { this.storeFrom = null; this.storeTo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('MaterialBalances.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('MaterialBalances.DateRangeInvalid')); return false; }
    if (!this.itemAll && (!this.itemFrom || !this.itemTo)) { this.toastr.warning(this.translate.instant('MaterialBalances.ItemRangeRequired')); return false; }
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('MaterialBalances.CategoryRequired')); return false; }
    if (!this.storeAll && (!this.storeFrom || !this.storeTo)) { this.toastr.warning(this.translate.instant('MaterialBalances.StoreRangeRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: MaterialBalancesFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      ItemFrom: this.itemAll ? null : this.itemFrom,
      ItemTo: this.itemAll ? null : this.itemTo,
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      StoreFrom: this.storeAll ? 0 : (this.storeFrom || 0),
      StoreTo: this.storeAll ? 0 : (this.storeTo || 0),
      ExcludeTransfers: this.excludeTransfers,
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

    const cols = [
      { label: t('MaterialBalances.ItemNo') }, { label: t('MaterialBalances.ItemName') },
      { label: t('MaterialBalances.Category') }, { label: t('MaterialBalances.Unit') },
      { label: t('MaterialBalances.Opening') }, { label: t('MaterialBalances.TotalIn') },
      { label: t('MaterialBalances.TotalOut') }, { label: t('MaterialBalances.Balance') },
      ...(showCost ? [{ label: t('MaterialBalances.AvgCost') }, { label: t('MaterialBalances.Value') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || '')}</td><td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td style="text-align:end">${fmt(r.OpeningQty)}</td><td style="text-align:end">${fmt(r.TotalIn)}</td>` +
      `<td style="text-align:end">${fmt(r.TotalOut)}</td><td style="text-align:end">${fmt(r.NetBalance)}</td>` +
      (showCost ? `<td style="text-align:end">${fmt(r.AvgCost)}</td><td style="text-align:end">${fmt(r.TotalValue)}</td>` : ``) +
      `</tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="4">${t('General.Total')}</td>` +
      `<td style="text-align:end">${fmt(this.totOpening)}</td><td style="text-align:end">${fmt(this.totIn)}</td>` +
      `<td style="text-align:end">${fmt(this.totOut)}</td><td style="text-align:end">${fmt(this.totNet)}</td>` +
      (showCost ? `<td></td><td style="text-align:end">${fmt(this.totValue)}</td>` : ``) + `</tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('MaterialBalances.DateFrom'), this.dateFrom) + fi(t('MaterialBalances.DateTo'), this.dateTo) +
      (this.itemAll ? '' : fi(t('MaterialBalances.Items'), `${this.itemFrom} — ${this.itemTo}`)) +
      (this.catAll ? '' : fi(t('MaterialBalances.Category'), this.catLabel())) +
      (this.storeAll ? '' : fi(t('MaterialBalances.Stores'), `${this.storeFrom} — ${this.storeTo}`)) +
      (this.excludeTransfers ? fi(t('MaterialBalances.ExcludeTransfers'), '✓') : '');

    this.reportPrint.printReport(t('MaterialBalances.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
