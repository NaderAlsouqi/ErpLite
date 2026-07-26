import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { StoreService, StoreDto } from '../../../shared/services/store.service';
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { StagnantItemsService, StagnantItemsFilter, StagnantItemRow } from '../../../shared/services/stagnant-items.service';

@Component({
  selector: 'app-stagnant-items',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './stagnant-items.component.html',
  styleUrl: './stagnant-items.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StagnantItemsComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  storeAll = true;                      // لجميع المستودعات vs مستودع رقم
  storeNo: number | null = null;

  catAll = true;                        // لجميع الأصناف vs لصنف
  catNo: number | null = null;

  orderBy: 0 | 1 | 2 = 0;               // 0 = رمز المادة, 1 = اسم المادة, 2 = رقم الصنف

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  categories: MainCategoryDto[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: StagnantItemRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: StagnantItemsService,
    private storeSvc: StoreService,
    private catSvc: MainCategoryService,
    public reportPrint: ReportService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
  ) {}

  /** Set when opened from a workflow print step (?autoprint=1) → auto-run + auto-print. */
  private autoPrint = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };
  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
    if (this.route.snapshot.queryParamMap.get('autoprint') === '1') {
      this.autoPrint = true;
      setTimeout(() => this.generate(), 400);   // auto-run then auto-print (see generate)
    }
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onStoreModeChange(): void { if (this.storeAll) { this.storeNo = null; } this.onFilterChange(); }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('StagnantItems.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('StagnantItems.DateRangeInvalid')); return false; }
    if (!this.storeAll && !this.storeNo) { this.toastr.warning(this.translate.instant('StagnantItems.StoreRequired')); return false; }
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('StagnantItems.CategoryRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: StagnantItemsFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      StoreNo: this.storeAll ? 0 : (this.storeNo || 0),
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      OrderBy: this.orderBy,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => {
        this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false;
        if (this.autoPrint) { this.autoPrint = false; setTimeout(() => this.print(true), 300); }
      },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  itemName(r: StagnantItemRow): string { return this.isAr ? (r.ItemName ?? '') : (r.ItemEName || r.ItemName || ''); }
  typeName(r: StagnantItemRow): string { return this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || ''); }
  unitName(r: StagnantItemRow): string { return this.isAr ? (r.UnitName ?? '') : (r.UnitEName || r.UnitName || ''); }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(inPlace = false): void {
    const t = (k: string) => this.translate.instant(k);

    const cols = [
      { label: t('StagnantItems.ItemNo') },
      { label: t('StagnantItems.ItemName') },
      { label: t('StagnantItems.CategoryNo') },
      { label: t('StagnantItems.CategoryName') },
      { label: t('StagnantItems.Unit') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.itemName(r)}</td>` +
      `<td>${r.TypeNo ?? ''}</td><td>${this.typeName(r)}</td>` +
      `<td>${this.unitName(r)}</td></tr>`).join('');

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const ordKey = this.orderBy === 1 ? 'StagnantItems.OrderByName' : (this.orderBy === 2 ? 'StagnantItems.OrderByCat' : 'StagnantItems.OrderByItem');
    const filtersHtml =
      fi(t('StagnantItems.Period'), `${this.dateFrom} — ${this.dateTo}`) +
      (this.storeAll ? '' : fi(t('StagnantItems.Store'), this.storeLabel())) +
      (this.catAll ? '' : fi(t('StagnantItems.Category'), this.catLabel())) +
      fi(t('StagnantItems.OrderBy'), t(ordKey));

    this.reportPrint.printReport(t('StagnantItems.Title'), cols, rowsHtml, filtersHtml, '', inPlace);
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
