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
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { ZeroedItemsService, ZeroedItemsFilter, ZeroedItemRow } from '../../../shared/services/zeroed-items.service';

@Component({
  selector: 'app-zeroed-items',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './zeroed-items.component.html',
  styleUrl: './zeroed-items.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ZeroedItemsComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  catAll = true;                        // لجميع الأصناف vs للصنف رقم
  catNo: number | null = null;
  orderBy: 0 | 1 = 0;                   // 0 = Item No, 1 = Item Name
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  categories: MainCategoryDto[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: ZeroedItemRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: ZeroedItemsService,
    private catSvc: MainCategoryService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('ZeroedItems.CategoryRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: ZeroedItemsFilter = {
      CatNo: this.catAll ? 0 : (this.catNo || 0),
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
      { label: t('ZeroedItems.ItemNo') }, { label: t('ZeroedItems.ItemName') },
      { label: t('ZeroedItems.Category') }, { label: t('ZeroedItems.OnHand') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.OnHand)}</td></tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')} (${this.rows.length})</td><td></td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml = this.catAll ? '' : fi(t('ZeroedItems.Category'), this.catLabel());

    this.reportPrint.printReport(t('ZeroedItems.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
}
