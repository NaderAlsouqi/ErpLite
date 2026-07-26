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
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  MonthlyBalancesService,
  MonthlyBalancesResultDto,
} from '../../../shared/services/monthly-balances.service';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

/** One display row: the beginning-balance row or a calendar month. */
interface DisplayRow {
  label:   string;
  debit:   number;   // movement debit (blank-able)
  credit:  number;   // movement credit
  balDebit:  number; // running balance, debit side
  balCredit: number; // running balance, credit side
  isBeg:   boolean;
}

@Component({
  selector: 'app-monthly-balances-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, PaginatorComponent, PaginatePipe],
  templateUrl: './monthly-balances-report.component.html',
  styleUrl: './monthly-balances-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MonthlyBalancesReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  readonly currentYear = new Date().getFullYear();
  year: number | null = this.currentYear;
  selectedAcc: ChartOfAccountDto | null = null;
  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  // ─── Results ───────────────────────────────────────────────
  result: MonthlyBalancesResultDto | null = null;
  rows: DisplayRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  get totalDebitTrans():  number { return this.rows.filter(r => !r.isBeg).reduce((s, r) => s + r.debit, 0); }
  get totalCreditTrans(): number { return this.rows.filter(r => !r.isBeg).reduce((s, r) => s + r.credit, 0); }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         MonthlyBalancesService,
    private accountsSvc: ChartOfAccountsService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accountsSvc.getAll().subscribe({
      next: data => {
        this.accounts = (data ?? []).sort((a, b) => a.no - b.no);
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
  }

  /** Localized month name (1-based) — mirrors the VB6 Month_Name(N). */
  monthName(m: number): string {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString(this.isAr ? 'ar' : 'en', { month: 'long' });
  }

  generate(): void {
    if (!this.selectedAcc) {
      this.toastr.warning(this.translate.instant('MonthlyBalances.AccRequired'));
      return;
    }
    if (!this.year || this.year < 1900 || this.year > 2100) {
      this.toastr.warning(this.translate.instant('MonthlyBalances.YearRequired'));
      return;
    }

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport({ AccNo: this.selectedAcc.no, Year: this.year }).subscribe({
      next: data => {
        this.result = data;
        this.buildRows(data);
        this.page = 1;
        this.fetched = true;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.result = null;
    this.rows = [];
  }

  /**
   * Builds the beginning-balance row + 12 month rows with a running balance,
   * accumulating begin + Σ(debit − credit) exactly like the VB6 setdata loop.
   */
  private buildRows(d: MonthlyBalancesResultDto): void {
    const rows: DisplayRow[] = [];
    let bal = d.BegBalance ?? 0;

    rows.push({
      label:     this.translate.instant('MonthlyBalances.BegBalance'),
      debit:     0,
      credit:    0,
      balDebit:  bal > 0 ? bal : 0,
      balCredit: bal < 0 ? -bal : 0,
      isBeg:     true,
    });

    const byMonth = new Map(d.Months.map(m => [m.Month, m]));
    for (let n = 1; n <= 12; n++) {
      const m = byMonth.get(n);
      const debit  = m?.DebitTrans  ?? 0;
      const credit = m?.CreditTrans ?? 0;
      bal += debit - credit;
      rows.push({
        label:     this.monthName(n),
        debit,
        credit,
        balDebit:  bal >= 0 ? bal : 0,
        balCredit: bal <  0 ? -bal : 0,
        isBeg:     false,
      });
    }
    this.rows = rows;
  }

  print(): void {
    if (!this.result || this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const blank = (n: number) => n ? fmt(n) : '';

    const cols = [
      { label: t('MonthlyBalances.Month') },
      { label: t('MonthlyBalances.DebitTrans') },
      { label: t('MonthlyBalances.CreditTrans') },
      { label: t('MonthlyBalances.DebitBalance') },
      { label: t('MonthlyBalances.CreditBalance') },
    ];

    const rowsHtml = this.rows.map(r => `<tr${r.isBeg ? ' style="font-weight:700;background:#eef4ff"' : ''}>
      <td>${r.label}</td>
      <td style="text-align:end">${r.isBeg ? '' : blank(r.debit)}</td>
      <td style="text-align:end">${r.isBeg ? '' : blank(r.credit)}</td>
      <td style="text-align:end">${blank(r.balDebit)}</td>
      <td style="text-align:end">${blank(r.balCredit)}</td>
    </tr>`).join('');

    const accLabel = `${this.result.AccNo} — ${this.isAr ? this.result.AccName : (this.result.AccEName || this.result.AccName)}`;
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('MonthlyBalances.Account')}:</span><span class="filter-value">${accLabel}</span></div>
      <div class="filter-item"><span class="filter-label">${t('MonthlyBalances.Year')}:</span><span class="filter-value">${this.year}</span></div>`;

    const title = `${t('MonthlyBalances.Title')} — ${this.year}`;
    this.reportPrint.printReport(title, cols, rowsHtml, filtersHtml);
  }
}
