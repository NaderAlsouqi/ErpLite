import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { MainCategoryService, MainCategoryDto } from '../../../shared/services/main-category.service';
import { CategoriesListService, CategoriesListFilter, CategoryListRow } from '../../../shared/services/categories-list.service';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CategoriesListComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  catAll = true;                        // لجميع الأصناف vs للصنف رقم
  catNo: number | null = null;

  orderBy: 0 | 1 = 0;                   // 0 = رقم الصنف (route), 1 = إسم الصنف

  // ─── Lookups ───────────────────────────────────────────────
  categories: MainCategoryDto[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: CategoryListRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: CategoriesListService,
    private catSvc: MainCategoryService,
    public reportPrint: ReportService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  catSearchFn = (term: string, c: MainCategoryDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.Etname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.catSvc.getAll().subscribe({ next: r => this.categories = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('CategoriesList.CategoryRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: CategoriesListFilter = {
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      OrderBy: this.orderBy,
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  catName(r: CategoryListRow): string { return this.isAr ? (r.TypeName ?? '') : (r.TypeEName || r.TypeName || ''); }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);

    const cols = [
      { label: t('CategoriesList.CategoryNo') },
      { label: t('CategoriesList.CategoryName') },
    ];
    const rowsHtml = this.rows.map(r => {
      const w = r.IsBold ? ' style="font-weight:700"' : '';
      return `<tr${w}><td>${r.TypeNo ?? ''}</td><td>${this.catName(r)}</td></tr>`;
    }).join('');

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      (this.catAll ? '' : fi(t('CategoriesList.Category'), this.catLabel())) +
      fi(t('CategoriesList.OrderBy'), t(this.orderBy === 1 ? 'CategoriesList.OrderByName' : 'CategoriesList.OrderByNo'));

    this.reportPrint.printReport(t('CategoriesList.Title'), cols, rowsHtml, filtersHtml);
  }

  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.Etname || c.TypeName)}` : String(this.catNo ?? '');
  }
}
