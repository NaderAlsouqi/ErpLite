import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import {
  PaymentVouchersService,
  PaymentVoucherRowDto,
} from '../../../shared/services/payment-vouchers.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-payment-vouchers-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, HasPermissionDirective, PaginatorComponent, PaginatePipe],
  templateUrl: './payment-vouchers-report.component.html',
  styleUrl: './payment-vouchers-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PaymentVouchersReportComponent {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  filterMode: 'DATE' | 'DOC' = 'DATE';
  dateFrom = '2000-01-01';
  dateTo   = this.toDateStr(new Date());
  docFrom: number | null = null;
  docTo:   number | null = null;
  sortBy: 'DOC' | 'DATE' = 'DOC';

  // ─── Results ───────────────────────────────────────────────
  rows: PaymentVoucherRowDto[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  get totalAmount(): number { return this.rows.reduce((s, r) => s + r.Amount, 0); }

  constructor(
    private svc:         PaymentVouchersService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  onFilterChange(): void { this.fetched = false; this.rows = []; }

  onlyDigits(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
  }
  sanitizeDoc(which: 'from' | 'to'): void {
    const v = which === 'from' ? this.docFrom : this.docTo;
    if (v != null && v < 1) { if (which === 'from') this.docFrom = null; else this.docTo = null; }
    this.onFilterChange();
  }

  generate(): void {
    if (this.filterMode === 'DATE') {
      if (!this.dateFrom || !this.dateTo) {
        this.toastr.warning(this.translate.instant('PaymentVouchers.DateRequired'));
        return;
      }
      if (this.dateFrom > this.dateTo) {
        this.toastr.warning(this.translate.instant('PaymentVouchers.DateError'));
        return;
      }
    } else {
      if (!this.docFrom || !this.docTo) {
        this.toastr.warning(this.translate.instant('PaymentVouchers.DocRequired'));
        return;
      }
    }

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport({
      FilterMode: this.filterMode,
      DateFrom:   this.filterMode === 'DATE' ? this.dateFrom : '',
      DateTo:     this.filterMode === 'DATE' ? this.dateTo   : '',
      DocFrom:    this.filterMode === 'DOC'  ? (this.docFrom ?? 0) : 0,
      DocTo:      this.filterMode === 'DOC'  ? (this.docTo   ?? 0) : 0,
      SortBy:     this.sortBy,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.page = 1;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('PaymentVouchers.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const cols = [
      { label: t('PaymentVouchers.DocNo') },
      { label: t('PaymentVouchers.DocDate') },
      { label: t('PaymentVouchers.Amount') },
      { label: t('PaymentVouchers.Beneficiary') },
      { label: t('PaymentVouchers.User') },
    ];
    const body = this.rows.map(r => `<tr>
      <td>${r.DocNum}</td>
      <td>${r.Date}</td>
      <td style="text-align:end">${fmt(r.Amount)}</td>
      <td>${r.Beneficiary}</td>
      <td>${r.UserName}</td>
    </tr>`).join('');
    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="2">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.totalAmount)}</td>
      <td colspan="2"></td></tr>`;

    const scope = this.filterMode === 'DATE'
      ? `${this.dateFrom} — ${this.dateTo}`
      : `${t('PaymentVouchers.DocNo')} ${this.docFrom} — ${this.docTo}`;
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('PaymentVouchers.Scope')}:</span><span class="filter-value">${scope}</span></div>
      <div class="filter-item"><span class="filter-label">${t('PaymentVouchers.Count')}:</span><span class="filter-value">${this.rows.length}</span></div>`;

    this.reportPrint.printReport(t('PaymentVouchers.Title'), cols, body + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
