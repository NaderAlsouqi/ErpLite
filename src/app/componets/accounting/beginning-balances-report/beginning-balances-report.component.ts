import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import {
  BeginningBalancesService,
  BeginningBalancesFilterDto,
  BeginningBalanceRowDto,
} from '../../../shared/services/beginning-balances.service';

@Component({
  selector: 'app-beginning-balances-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule],
  templateUrl: './beginning-balances-report.component.html',
  styleUrl: './beginning-balances-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BeginningBalancesReportComponent {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  readonly currentYear = new Date().getFullYear();
  year:  number | null = this.currentYear;
  level: number | null = 1;
  showZero = false;

  // ─── Results ───────────────────────────────────────────────
  rows: BeginningBalanceRowDto[] = [];
  loading = false;
  fetched = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  get totalDebit():  number { return this.rows.reduce((s, r) => s + r.Debit,  0); }
  get totalCredit(): number { return this.rows.reduce((s, r) => s + r.Credit, 0); }

  constructor(
    private svc:         BeginningBalancesService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  /** Account name with its currency suffix, mirroring the VB6 "name - currency". */
  accountLabel(r: BeginningBalanceRowDto): string {
    const name = this.isAr ? r.AccName : (r.AccEName || r.AccName);
    const cur  = this.isAr ? r.CurName : (r.CurEName || r.CurName);
    return cur ? `${name} - ${cur}` : name;
  }

  generate(): void {
    if (!this.year || this.year < 1900 || this.year > 2100) {
      this.toastr.warning(this.translate.instant('BeginningBalances.YearRequired'));
      return;
    }
    if (!this.level || this.level <= 0) {
      this.toastr.warning(this.translate.instant('BeginningBalances.LevelRequired'));
      return;
    }

    const filter: BeginningBalancesFilterDto = {
      Year:     this.year,
      Level:    this.level,
      ShowZero: this.showZero,
    };

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport(filter).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('BeginningBalances.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const cols = [
      { label: t('BeginningBalances.AccNo') },
      { label: t('BeginningBalances.Level') },
      { label: t('BeginningBalances.AccName') },
      { label: t('BeginningBalances.Debit') },
      { label: t('BeginningBalances.Credit') },
    ];

    const rowsHtml = this.rows.map(r => `<tr>
      <td>${r.AccNo}</td>
      <td style="text-align:center">${r.Lvl}</td>
      <td>${this.accountLabel(r)}</td>
      <td style="text-align:end">${fmt(r.Debit)}</td>
      <td style="text-align:end">${fmt(r.Credit)}</td>
    </tr>`).join('');

    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="3">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.totalDebit)}</td>
      <td style="text-align:end">${fmt(this.totalCredit)}</td>
    </tr>`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('BeginningBalances.Year')}:</span><span class="filter-value">${this.year}</span></div>
      <div class="filter-item"><span class="filter-label">${t('BeginningBalances.Level')}:</span><span class="filter-value">${this.level}</span></div>`;

    this.reportPrint.printReport(t('BeginningBalances.Title'), cols, rowsHtml + totRow, filtersHtml);
  }
}
