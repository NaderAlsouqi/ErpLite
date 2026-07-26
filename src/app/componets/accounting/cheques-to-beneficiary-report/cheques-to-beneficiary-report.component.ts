import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import {
  OutwardChequesService,
  OutwardChequeRowDto,
} from '../../../shared/services/outward-cheques.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-cheques-to-beneficiary-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective, PaginatorComponent, PaginatePipe],
  templateUrl: './cheques-to-beneficiary-report.component.html',
  styleUrl: './cheques-to-beneficiary-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChequesToBeneficiaryReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 acu08 form) ────────────────
  beneficiaries: string[] = [];
  beneficiary: string | null = null;
  lookupLoading = false;

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());
  sortBy: 'DATE' | 'AMOUNT' = 'DATE';

  // ─── Results ───────────────────────────────────────────────
  rows: OutwardChequeRowDto[] = [];
  loading = false;
  fetched = false;
  shownBeneficiary = '';
  page = 1;
  pageSize = 10;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get totalLocal(): number { return this.rows.reduce((s, r) => s + r.LocalAmount, 0); }

  constructor(
    private svc:         OutwardChequesService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.svc.getBeneficiaries().subscribe({
      next: data => { this.beneficiaries = data ?? []; this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; this.shownBeneficiary = ''; }

  generate(): void {
    if (!this.beneficiary || !this.beneficiary.trim()) {
      this.toastr.warning(this.translate.instant('ChequesToBeneficiary.BeneficiaryRequired'));
      return;
    }
    if (!this.dateFrom || !this.dateTo) {
      this.toastr.warning(this.translate.instant('ChequesToBeneficiary.DateRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('ChequesToBeneficiary.DateError'));
      return;
    }

    const ben = this.beneficiary.trim();
    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getToBeneficiary({
      Beneficiary: ben,
      DateFrom:    this.dateFrom,
      DateTo:      this.dateTo,
      SortBy:      this.sortBy,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.page = 1;
        this.shownBeneficiary = ben;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('ChequesToBeneficiary.NoData'));
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
      { label: t('ChequesToBeneficiary.ChequeNo') },
      { label: t('ChequesToBeneficiary.ChequeDate') },
      { label: t('ChequesToBeneficiary.Amount') },
      { label: t('ChequesToBeneficiary.Currency') },
      { label: t('ChequesToBeneficiary.Rate') },
      { label: t('ChequesToBeneficiary.AccNo') },
      { label: t('ChequesToBeneficiary.DocNo') },
    ];
    const body = this.rows.map(r => `<tr>
      <td>${r.ChequeNum}</td>
      <td>${r.Date1}</td>
      <td style="text-align:end">${fmt(r.Amount)}</td>
      <td>${this.isAr ? r.CurName : (r.CurEName || r.CurName)}</td>
      <td style="text-align:end">${r.Rate}</td>
      <td>${r.AccNo}</td>
      <td>${r.DocNum}</td>
    </tr>`).join('');
    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="2">${t('ChequesToBeneficiary.LocalTotal')}</td>
      <td style="text-align:end">${fmt(this.totalLocal)}</td>
      <td colspan="4"></td></tr>`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('ChequesToBeneficiary.Beneficiary')}:</span><span class="filter-value">${this.shownBeneficiary}</span></div>
      <div class="filter-item"><span class="filter-label">${t('ChequesToBeneficiary.Period')}:</span><span class="filter-value">${this.dateFrom} — ${this.dateTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('ChequesToBeneficiary.Count')}:</span><span class="filter-value">${this.rows.length}</span></div>`;

    this.reportPrint.printReport(t('ChequesToBeneficiary.Title'), cols, body + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
