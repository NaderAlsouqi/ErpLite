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
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { ItemPricesService, ItemPricesFilter, ItemPriceRow } from '../../../shared/services/item-prices.service';

interface PriceDisplayRow extends ItemPriceRow { first: boolean; }

@Component({
  selector: 'app-item-prices',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './item-prices.component.html',
  styleUrl: './item-prices.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ItemPricesComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  itemAll = true;                       // لجميع المواد vs للمواد من رقم
  itemFrom: string | null = null;
  itemTo: string | null = null;
  showZero = false;                     // إظهار المواد التي فئاتها صفر
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: PriceDisplayRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: ItemPricesService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onItemModeChange(): void { if (this.itemAll) { this.itemFrom = null; this.itemTo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.itemAll && (!this.itemFrom || !this.itemTo)) { this.toastr.warning(this.translate.instant('ItemPrices.ItemRangeRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: ItemPricesFilter = {
      ItemFrom: this.itemAll ? null : this.itemFrom,
      ItemTo: this.itemAll ? null : this.itemTo,
      ShowZero: this.showZero,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = this.markGroups(data || []); this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  /** flag the first row of each item so item cols show once per group (VB6 per-item header). */
  private markGroups(data: ItemPriceRow[]): PriceDisplayRow[] {
    return data.map((r, i) => ({ ...r, first: i === 0 || data[i - 1].ItemNo !== r.ItemNo }));
  }

  get itemCount(): number { return this.rows.filter(r => r.first).length; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));

    const cols = [
      { label: t('ItemPrices.ItemNo') }, { label: t('ItemPrices.ItemName') }, { label: t('ItemPrices.Unit') },
      { label: t('ItemPrices.Category') }, { label: t('ItemPrices.Price') }, { label: t('ItemPrices.MinPrice') },
      { label: t('ItemPrices.Discount') }, { label: t('ItemPrices.Bonus') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr>` +
      `<td>${r.first ? (r.ItemNo ?? '') : ''}</td>` +
      `<td>${r.first ? (this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')) : ''}</td>` +
      `<td>${r.first ? (this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')) : ''}</td>` +
      `<td>${this.isAr ? (r.CatName ?? '') : (r.CatEName || r.CatName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.Price)}</td><td style="text-align:end">${fmt(r.MinPrice)}</td>` +
      `<td style="text-align:end">${fmt(r.Discount)}</td><td style="text-align:end">${fmt(r.Bonus)}</td>` +
      `</tr>`).join('');

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      (this.itemAll ? '' : fi(t('ItemPrices.Items'), `${this.itemFrom} — ${this.itemTo}`)) +
      (this.showZero ? fi(t('ItemPrices.ShowZero'), '✓') : '');

    this.reportPrint.printReport(t('ItemPrices.Title'), cols, rowsHtml, filtersHtml);
  }
}
