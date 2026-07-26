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
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { ItemsPricingService, ItemsPricingFilter, ItemPricingRow } from '../../../shared/services/items-pricing.service';

interface PricingDisplayRow extends ItemPricingRow { catFirst: boolean; }

@Component({
  selector: 'app-items-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent],
  templateUrl: './items-pricing.component.html',
  styleUrl: './items-pricing.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ItemsPricingComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  scope: 'all' | 'item' = 'all';        // لجميع المواد / للمادة رقم
  itemNo: string | null = null;
  catNo: number | null = null;          // optional category (subtree)
  orderBy: 0 | 1 = 0;                    // 0 = item no, 1 = item name (both TypeNo first)
  qtyFilter: 0 | 1 | 2 = 0;             // all / only zero / hide zero

  // display toggles (no re-fetch)
  showPrice = true;                     // إظهار السعر (+ unit)
  showQty = true;                       // إظهار الكمية
  showFamily = false;                   // إظهار العائلة
  groupByCategory = false;              // مقسمة حسب الصنف
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  categories: MainCategoryDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: PricingDisplayRow[] = [];
  loading = false;
  fetched = false;

  constructor(
    private svc: ItemsPricingService,
    private catSvc: MainCategoryService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  /** visible column count (for the category header colspan). */
  get colCount(): number { return 8 + (this.showPrice ? 2 : 0) + (this.showQty ? 1 : 0) + (this.showFamily ? 1 : 0); }

  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };
  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onScopeChange(): void { if (this.scope !== 'item') this.itemNo = null; this.onFilterChange(); }

  private validate(): boolean {
    if (this.scope === 'item' && !this.itemNo) { this.toastr.warning(this.translate.instant('ItemsPricing.ItemRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: ItemsPricingFilter = {
      ItemNo: this.scope === 'item' ? this.itemNo : null,
      CatNo: this.catNo || 0,
      QtyFilter: this.qtyFilter,
      OrderBy: this.orderBy,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = this.markCats(data || []); this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  /** flag the first row of each category (for the "grouped by category" header rows). */
  private markCats(data: ItemPricingRow[]): PricingDisplayRow[] {
    return data.map((r, i) => ({ ...r, catFirst: i === 0 || data[i - 1].TypeNo !== r.TypeNo }));
  }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));

    const cols: { label: string }[] = [
      { label: t('ItemsPricing.ItemNo') }, { label: t('ItemsPricing.ItemName') }, { label: t('ItemsPricing.Category') },
      { label: t('ItemsPricing.Barcode') },
      ...(this.showPrice ? [{ label: t('ItemsPricing.Unit') }] : []),
      { label: t('ItemsPricing.Operand') },
      ...(this.showPrice ? [{ label: t('ItemsPricing.Price') }] : []),
      { label: t('ItemsPricing.Tax') },
      ...(this.showQty ? [{ label: t('ItemsPricing.Qty') }] : []),
      ...(this.showFamily ? [{ label: t('ItemsPricing.Family') }] : []),
      { label: t('ItemsPricing.Brand') }, { label: t('ItemsPricing.Origin') },
    ];
    let body = '';
    for (const r of this.rows) {
      if (this.groupByCategory && r.catFirst) {
        body += `<tr style="background:#e5e7eb;font-weight:700"><td colspan="${cols.length}">${this.isAr ? (r.Category ?? '') : (r.CategoryE || r.Category || '')}</td></tr>`;
      }
      body += `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
        `<td>${this.isAr ? (r.Category ?? '') : (r.CategoryE || r.Category || '')}</td><td>${r.Barcode ?? ''}</td>` +
        (this.showPrice ? `<td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` : '') +
        `<td style="text-align:end">${fmt(r.Operand)}</td>` +
        (this.showPrice ? `<td style="text-align:end">${fmt(r.Price)}</td>` : '') +
        `<td style="text-align:end">${fmt(r.Tax)}%</td>` +
        (this.showQty ? `<td style="text-align:end">${fmt(r.Qty)}</td>` : '') +
        (this.showFamily ? `<td>${this.isAr ? (r.Family ?? '') : (r.FamilyE || r.Family || '')}</td>` : '') +
        `<td>${this.isAr ? (r.Brand ?? '') : (r.BrandE || r.Brand || '')}</td>` +
        `<td>${this.isAr ? (r.Origin ?? '') : (r.OriginE || r.Origin || '')}</td></tr>`;
    }

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      (this.scope === 'item' ? fi(t('ItemsPricing.Item'), this.itemNo) : '') +
      (this.catNo ? fi(t('ItemsPricing.Category'), this.catLabel()) : '');

    this.reportPrint.printReport(t('ItemsPricing.Title'), cols, body, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
}
