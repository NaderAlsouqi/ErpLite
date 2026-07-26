import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { DisbursementMovementService, DisbursementEntity } from '../../../shared/services/disbursement-movement.service';
import { CategoriesListService, CategoryListRow } from '../../../shared/services/categories-list.service';
import {
  CategoryDisbursementService, CategoryDisbursementFilter, CategoryDisbursementRow,
} from '../../../shared/services/category-disbursement.service';

@Component({
  selector: 'app-category-disbursement',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './category-disbursement.component.html',
  styleUrl: './category-disbursement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CategoryDisbursementComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  entityAll = true;                     // جميع الجهات vs لجهة
  entityNo: number | null = null;

  catAll = true;                        // لجميع الاصناف vs للصنف رقم
  catNo: number | null = null;

  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  entities: DisbursementEntity[] = [];
  categories: CategoryListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: CategoryDisbursementRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: CategoryDisbursementService,
    private entitySvc: DisbursementMovementService,
    private catSvc: CategoriesListService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private auth: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get canViewCost(): boolean { return this.auth.hasPermission('CategoryDisbursement.ViewCost'); }

  get totQty(): number { return this.rows.reduce((s, r) => s + (+r.TotQty || 0), 0); }
  get grandTotal(): number { return this.rows.reduce((s, r) => s + (+r.TotalPrice || 0), 0); }

  entitySearchFn = (term: string, e: DisbursementEntity): boolean => {
    const t = (term || '').toLowerCase();
    return String(e.EntityNo).includes(t) || (e.Name || '').toLowerCase().includes(t) || (e.EName || '').toLowerCase().includes(t);
  };
  catSearchFn = (term: string, c: CategoryListRow): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.TypeNo).includes(t) || (c.TypeName || '').toLowerCase().includes(t) || (c.TypeEName || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;
    this.entitySvc.getEntities().subscribe({ next: r => this.entities = r || [], error: () => {} });
    this.catSvc.getReport({ CatNo: 0, OrderBy: 0 }).subscribe({ next: r => this.categories = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onEntityModeChange(): void { if (this.entityAll) { this.entityNo = null; } this.onFilterChange(); }
  onCatModeChange(): void { if (this.catAll) { this.catNo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('CategoryDisbursement.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('CategoryDisbursement.DateRangeInvalid')); return false; }
    if (!this.entityAll && !this.entityNo) { this.toastr.warning(this.translate.instant('CategoryDisbursement.EntityRequired')); return false; }
    if (!this.catAll && !this.catNo) { this.toastr.warning(this.translate.instant('CategoryDisbursement.CategoryRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: CategoryDisbursementFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      CatNo: this.catAll ? 0 : (this.catNo || 0),
      EntityNo: this.entityAll ? 0 : (this.entityNo || 0),
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  itemName(r: CategoryDisbursementRow): string { return this.isAr ? (r.ItemName ?? '') : (r.ItemEName || r.ItemName || ''); }
  unitName(r: CategoryDisbursementRow): string { return this.isAr ? (r.UnitName ?? '') : (r.UnitEName || r.UnitName || ''); }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const cost = this.canViewCost;

    const cols = [
      { label: t('CategoryDisbursement.ItemNo') }, { label: t('CategoryDisbursement.ItemName') },
      { label: t('CategoryDisbursement.Unit') }, { label: t('CategoryDisbursement.Qty') },
      ...(cost ? [{ label: t('CategoryDisbursement.AvgCost') }, { label: t('CategoryDisbursement.Total') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.itemName(r)}</td>` +
      `<td>${this.unitName(r)}</td><td style="text-align:end">${fmt(r.TotQty)}</td>` +
      (cost ? `<td style="text-align:end">${fmt(r.AvgCost)}</td><td style="text-align:end">${fmt(r.TotalPrice)}</td>` : '') +
      `</tr>`).join('');
    const totRow = cost
      ? `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(this.totQty)}</td><td></td><td style="text-align:end">${fmt(this.grandTotal)}</td></tr>`
      : `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(this.totQty)}</td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('CategoryDisbursement.Period'), `${this.dateFrom} — ${this.dateTo}`) +
      fi(t('CategoryDisbursement.VoucherType'), t('CategoryDisbursement.Output')) +
      (this.entityAll ? '' : fi(t('CategoryDisbursement.Entity'), this.entityLabel())) +
      (this.catAll ? '' : fi(t('CategoryDisbursement.Category'), this.catLabel()));

    this.reportPrint.printReport(t('CategoryDisbursement.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private entityLabel(): string {
    const e = this.entities.find(x => x.EntityNo === this.entityNo);
    return e ? `${e.EntityNo} — ${this.isAr ? e.Name : (e.EName || e.Name)}` : String(this.entityNo ?? '');
  }
  private catLabel(): string {
    const c = this.categories.find(x => x.TypeNo === this.catNo);
    return c ? `${c.TypeNo} — ${this.isAr ? c.TypeName : (c.TypeEName || c.TypeName)}` : String(this.catNo ?? '');
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
