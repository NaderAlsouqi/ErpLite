import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import {
  MissingVouchersService,
  MissingVoucherRowDto,
  UnbalancedTransactionRowDto,
} from '../../../shared/services/missing-vouchers.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-missing-vouchers-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, HasPermissionDirective, PaginatorComponent, PaginatePipe],
  templateUrl: './missing-vouchers-report.component.html',
  styleUrl: './missing-vouchers-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MissingVouchersReportComponent implements OnInit {

  // Voucher types → doctype codes (VB6 DocType1 map)
  readonly docTypes = [1, 2, 3, 4, 41, 42, 30, 32];

  // ─── Filters ───────────────────────────────────────────────
  docType = 1;
  year    = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  serial  = 1;
  docFrom = 1;
  docTo: number | null = null;

  // ─── Results ───────────────────────────────────────────────
  rows: MissingVoucherRowDto[] = [];
  unbalancedRows: UnbalancedTransactionRowDto[] = [];
  view: 'missing' | 'unbalanced' = 'missing';
  loading = false;
  maxLoading = false;
  fetched = false;
  page = 1;
  pageSize = 10;
  shownType = 1;
  /** Server caps the result set; warn the user when it's hit. */
  readonly resultCap = 50000;
  get capped(): boolean { return this.rows.length >= this.resultCap; }

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  unbalTypeName(r: UnbalancedTransactionRowDto): string {
    return this.isAr ? r.TypeName : (r.TypeEName || r.TypeName);
  }

  constructor(
    private svc:         MissingVouchersService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void { this.refreshMax(); }

  typeLabel(code: number): string { return this.translate.instant('MissingVouchers.Types.' + code); }

  onFilterChange(): void { this.fetched = false; this.rows = []; this.unbalancedRows = []; }

  /** كشف الحركات غير المتوازنة — vouchers whose lines don't sum to zero. */
  checkUnbalanced(): void {
    this.loading = true;
    this.fetched = false;
    this.unbalancedRows = [];
    this.svc.getUnbalanced().subscribe({
      next: data => {
        this.unbalancedRows = data ?? [];
        this.view = 'unbalanced';
        this.fetched = true;
        this.loading = false;
        if (this.unbalancedRows.length === 0) {
          this.toastr.success(this.translate.instant('MissingVouchers.NoneUnbalanced'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  /** When type/year/serial change, default من رقم / إلى رقم to the actual
   *  min / max existing doc numbers. */
  refreshMax(): void {
    this.onFilterChange();
    if (!this.year || !this.serial) return;
    this.maxLoading = true;
    this.svc.getDocRange(this.docType, this.year, this.serial).subscribe({
      next: r => {
        this.docFrom = r && r.MinDoc > 0 ? r.MinDoc : 1;
        this.docTo   = r && r.MaxDoc > 0 ? r.MaxDoc : null;
        this.maxLoading = false;
      },
      error: () => { this.maxLoading = false; },
    });
  }

  onlyDigits(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
  }

  generate(): void {
    if (!this.docTo || this.docTo < 1) {
      this.toastr.warning(this.translate.instant('MissingVouchers.RangeRequired'));
      return;
    }
    if ((this.docFrom ?? 0) > this.docTo) {
      this.toastr.warning(this.translate.instant('MissingVouchers.RangeError'));
      return;
    }

    const type = this.docType;
    this.loading = true;
    this.fetched = false;
    this.rows = [];
    this.view = 'missing';

    this.svc.getReport({
      DocType: this.docType,
      Year:    this.year,
      Serial:  this.serial,
      DocFrom: this.docFrom || 1,
      DocTo:   this.docTo,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.page = 1;
        this.shownType = type;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('MissingVouchers.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    if (this.view === 'unbalanced') {
      if (this.unbalancedRows.length === 0) return;
      const cols = [
        { label: t('MissingVouchers.DocNo') },
        { label: t('MissingVouchers.DocType') },
        { label: t('MissingVouchers.Date') },
        { label: t('MissingVouchers.Diff') },
      ];
      const body = this.unbalancedRows.map(r =>
        `<tr><td>${r.DocNum}</td><td>${this.isAr ? r.TypeName : (r.TypeEName || r.TypeName)}</td><td>${r.Date}</td><td style="text-align:end">${(r.Diff ?? 0).toFixed(6)}</td></tr>`).join('');
      this.reportPrint.printReport(t('MissingVouchers.UnbalancedTitle'), cols, body, '');
      return;
    }

    if (this.rows.length === 0) return;
    const typeName = this.typeLabel(this.shownType);
    const cols = [
      { label: t('MissingVouchers.DocType') },
      { label: t('MissingVouchers.DocNo') },
    ];
    const body = this.rows.map(r => `<tr><td>${typeName}</td><td>${r.DocNum}</td></tr>`).join('');

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('MissingVouchers.DocType')}:</span><span class="filter-value">${typeName}</span></div>
      <div class="filter-item"><span class="filter-label">${t('MissingVouchers.Year')}:</span><span class="filter-value">${this.year}</span></div>
      <div class="filter-item"><span class="filter-label">${t('MissingVouchers.Range')}:</span><span class="filter-value">${this.docFrom} — ${this.docTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('MissingVouchers.Count')}:</span><span class="filter-value">${this.rows.length}</span></div>`;

    this.reportPrint.printReport(t('MissingVouchers.Title'), cols, body, filtersHtml);
  }
}
