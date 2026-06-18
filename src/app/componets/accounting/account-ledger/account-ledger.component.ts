import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  AccountLedgerService,
  AccountLedgerResultDto,
} from '../../../shared/services/account-ledger.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-account-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './account-ledger.component.html',
  styleUrl: './account-ledger.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountLedgerComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  accounts: ChartOfAccountDto[] = [];
  selectedAcc: ChartOfAccountDto | null = null;
  lookupLoading = false;

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  // ─── Results ───────────────────────────────────────────────
  result: AccountLedgerResultDto | null = null;
  loading = false;
  fetched = false;
  shownAcc: ChartOfAccountDto | null = null;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get rows() { return this.result?.Rows ?? []; }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         AccountLedgerService,
    private accountsSvc: ChartOfAccountsService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
    private router:      Router,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accountsSvc.getAll().subscribe({
      next: data => { this.accounts = (data ?? []).sort((a, b) => a.no - b.no); this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
  }

  onFilterChange(): void { this.fetched = false; this.result = null; this.shownAcc = null; }

  docTypeName(r: { DocTypeName: string; DocTypeEName: string }): string {
    return this.isAr ? r.DocTypeName : (r.DocTypeEName || r.DocTypeName);
  }

  /** Fiscal year for a ledger row — used by the deep-link to its source voucher. */
  vYear(dateStr: string): number {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  /** رصيد الحساب label: مدين (>0) / دائن (<0). */
  get balanceLabelKey(): string {
    const b = this.result?.FinalBalance ?? 0;
    return b > 0 ? 'AccountLedger.Debit' : (b < 0 ? 'AccountLedger.Credit' : '');
  }
  get absFinal(): number { return Math.abs(this.result?.FinalBalance ?? 0); }

  fetch(): void {
    if (!this.selectedAcc) {
      this.toastr.warning(this.translate.instant('AccountLedger.AccRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('AccountLedger.DateError'));
      return;
    }

    const acc = this.selectedAcc;
    this.loading = true;
    this.fetched = false;
    this.result = null;

    this.svc.getLedger(acc.no, this.dateFrom, this.dateTo).subscribe({
      next: data => {
        this.result = data ?? { OpeningBalance: 0, FinalBalance: 0, Rows: [] };
        this.shownAcc = acc;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('AccountLedger.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  openDetailed(): void {
    // Carry the current account + period into the detailed statement report
    // so it opens pre-filtered and auto-runs for the same account — in a popup
    // window instead of navigating away from the ledger.
    const acc = this.shownAcc ?? this.selectedAcc;
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/accounting/reports/detailed-statement'], {
        queryParams: {
          accNo:    acc ? acc.no : null,
          dateFrom: this.dateFrom,
          dateTo:   this.dateTo,
        },
      }),
    );

    const w = Math.min(1200, window.screen.availWidth);
    const h = Math.min(800, window.screen.availHeight);
    const left = (window.screen.availWidth - w) / 2;
    const top  = (window.screen.availHeight - h) / 2;
    window.open(
      url,
      'detailedStatement',
      `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
  }

  print(): void {
    if (!this.result || this.rows.length === 0 || !this.shownAcc) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const c   = this.shownAcc;

    const cols = [
      { label: t('AccountLedger.DocNo') },
      { label: t('AccountLedger.DocDate') },
      { label: t('AccountLedger.DocType') },
      { label: t('AccountLedger.Description') },
      { label: t('AccountLedger.Debit') },
      { label: t('AccountLedger.Credit') },
      { label: t('AccountLedger.Balance') },
    ];
    const body = this.rows.map(r => `<tr>
      <td>${r.DocNum}</td>
      <td>${r.DocDate}</td>
      <td>${this.docTypeName(r)}</td>
      <td>${r.Des}</td>
      <td style="text-align:end">${r.Debit ? fmt(r.Debit) : ''}</td>
      <td style="text-align:end">${r.Credit ? fmt(r.Credit) : ''}</td>
      <td style="text-align:end">${fmt(r.Balance)}</td>
    </tr>`).join('');
    const openRow = `<tr style="font-weight:700;background:#eef4ff"><td colspan="6">${t('AccountLedger.OpeningBalance')}</td><td style="text-align:end">${fmt(this.result.OpeningBalance)}</td></tr>`;
    const finalRow = `<tr style="font-weight:700;background:#dbeafe"><td colspan="6">${t('AccountLedger.FinalBalance')}</td><td style="text-align:end">${fmt(this.result.FinalBalance)}</td></tr>`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('AccountLedger.Account')}:</span><span class="filter-value">${c.no} — ${this.isAr ? c.name : (c.Ename || c.name)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('AccountLedger.Period')}:</span><span class="filter-value">${this.dateFrom} — ${this.dateTo}</span></div>`;

    this.reportPrint.printReport(t('AccountLedger.Title'), cols, openRow + body + finalRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
