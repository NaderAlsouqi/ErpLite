import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import {
  TrialBalanceService,
  TrialBalanceFilterDto,
  TrialBalanceRowDto,
} from '../../../shared/services/trial-balance.service';

@Component({
  selector: 'app-trial-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule],
  templateUrl: './trial-balance.component.html',
  styleUrl: './trial-balance.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TrialBalanceComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  allBranches  = true;
  branchNo: number | null = null;

  level: number | null = 1;

  showZero        = false;   // Check1
  subAccountsOnly = false;   // Check2
  excludeClosing  = false;   // Mtype(4)

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  detailed: boolean = false; // true=تفصيلي, false=عادي  (matches Mtype(0)/Mtype(1))
  posted:   'all' | 'posted' | 'unposted' = 'all';   // مرحل / غير مرحل / كلاهما

  // ─── Results ───────────────────────────────────────────────
  rows: TrialBalanceRowDto[] = [];
  loading = false;
  fetched = false;


  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /**
   * VB6 setdata rule:
   *  - Check2 (SubAccountsOnly) ON  → sum across ALL displayed rows (branch=0)
   *  - Check2 OFF                   → sum only level = 1 rows (avoids
   *                                    double-counting parent + children)
   *  - Regular mode displays only level=1 anyway, so the filter is a no-op.
   */
  private inTotals = (r: TrialBalanceRowDto): boolean =>
    this.subAccountsOnly ? true : r.Level === 1;

  private rawTotBegB():          number { return this.rows.filter(this.inTotals).reduce((s, r) => s + r.BegB, 0); }
  private rawTotDbtrans():       number { return this.rows.filter(this.inTotals).reduce((s, r) => s + r.Dbtrans, 0); }
  private rawTotCrtrans():       number { return this.rows.filter(this.inTotals).reduce((s, r) => s + r.Crtrans, 0); }
  private rawTotDebitBalance():  number { return this.rows.filter(this.inTotals).reduce((s, r) => s + r.DebitBalance,  0); }
  private rawTotCreditBalance(): number { return this.rows.filter(this.inTotals).reduce((s, r) => s + r.CreditBalance, 0); }

  /**
   * VB6 "force-balance" trick (setdata):
   *   If |Σ Crtrans − Σ Dbtrans| ≤ 0.003  →  force Σ Cr = Σ Db AND Σ CrBalance = Σ DbBalance
   *   Else if |Σ DbBalance − Σ CrBalance| ≤ 0.003 → same
   * Mathematically valid when the journal balances: equal debits/credits in
   * movements imply equal debits/credits in balances. We mirror it verbatim.
   */
  private adjusted(): { begB: number; dbT: number; crT: number; dbBal: number; crBal: number } {
    let begB  = this.rawTotBegB();
    let dbT   = this.rawTotDbtrans();
    let crT   = this.rawTotCrtrans();
    let dbBal = this.rawTotDebitBalance();
    let crBal = this.rawTotCreditBalance();
    if (Math.abs(crT - dbT) <= 0.003)    { crBal = dbBal; crT = dbT; }
    if (Math.abs(dbBal - crBal) <= 0.003){ crBal = dbBal; crT = dbT; }
    return { begB, dbT, crT, dbBal, crBal };
  }

  get totBegB():          number { return this.adjusted().begB;  }
  get totDbtrans():       number { return this.adjusted().dbT;   }
  get totCrtrans():       number { return this.adjusted().crT;   }
  get totDebitBalance():  number { return this.adjusted().dbBal; }
  get totCreditBalance(): number { return this.adjusted().crBal; }

  constructor(
    private svc:         TrialBalanceService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {}

  generate(): void {
    if (!this.allBranches && (!this.branchNo || this.branchNo <= 0)) {
      this.toastr.warning(this.translate.instant('TrialBalance.BranchRequired'));
      return;
    }
    if (!this.level || this.level <= 0) {
      this.toastr.warning(this.translate.instant('TrialBalance.LevelRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('TrialBalance.DateError'));
      return;
    }

    const filter: TrialBalanceFilterDto = {
      DateFrom:        this.dateFrom,
      DateTo:          this.dateTo,
      Level:           this.level,
      AllBranches:     this.allBranches,
      BranchNo:        this.allBranches ? null : this.branchNo,
      Detailed:        this.detailed,
      Posted:          this.posted === 'all' ? null : (this.posted === 'posted' ? 1 : 0),
      ExcludeClosing:  this.excludeClosing,
      ShowZero:        this.showZero,
      SubAccountsOnly: this.subAccountsOnly,
    };

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data ?? []; this.fetched = true; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  isHeaderRow(r: TrialBalanceRowDto): boolean {
    // VB6 bolds rows where level=1 OR branch<>0 (parent accounts)
    return r.Level === 1 || r.Branch !== 0;
  }

  print(): void {
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const title = `${t('TrialBalance.Title')} (${this.dateFrom} — ${this.dateTo})`;
    const postedLabel = this.posted === 'all'
      ? t('TrialBalance.PostedAll')
      : this.posted === 'posted'
        ? t('TrialBalance.PostedYes')
        : t('TrialBalance.PostedNo');

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('General.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('TrialBalance.Level')}:</span><span class="filter-value">${this.level}</span></div>
      <div class="filter-item"><span class="filter-label">${t('TrialBalance.Branch')}:</span><span class="filter-value">${this.allBranches ? t('TrialBalance.AllBranches') : this.branchNo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('TrialBalance.Type')}:</span><span class="filter-value">${this.detailed ? t('TrialBalance.Detailed') : t('TrialBalance.Regular')}</span></div>
      <div class="filter-item"><span class="filter-label">${t('TrialBalance.Posted')}:</span><span class="filter-value">${postedLabel}</span></div>`;

    const cols = this.detailed
      ? [
          { label: t('TrialBalance.AccNo') },
          { label: t('TrialBalance.AccName') },
          { label: t('TrialBalance.BegB') },
          { label: t('TrialBalance.DbTrans') },
          { label: t('TrialBalance.CrTrans') },
          { label: t('TrialBalance.DebitBalance') },
          { label: t('TrialBalance.CreditBalance') },
        ]
      : [
          { label: t('TrialBalance.AccNo') },
          { label: t('TrialBalance.AccName') },
          { label: t('TrialBalance.DebitBalance') },
          { label: t('TrialBalance.CreditBalance') },
        ];

    const rowsHtml = this.rows.map(r => {
      const weight = this.isHeaderRow(r) ? 'font-weight:700;' : '';
      return this.detailed
        ? `<tr style="${weight}">
            <td>${r.AccNo}</td>
            <td>${this.isAr ? r.AccName : r.AccEName}</td>
            <td style="text-align:end">${fmt(r.BegB)}</td>
            <td style="text-align:end">${fmt(r.Dbtrans)}</td>
            <td style="text-align:end">${fmt(r.Crtrans)}</td>
            <td style="text-align:end">${fmt(r.DebitBalance)}</td>
            <td style="text-align:end">${fmt(r.CreditBalance)}</td>
          </tr>`
        : `<tr style="${weight}">
            <td>${r.AccNo}</td>
            <td>${this.isAr ? r.AccName : r.AccEName}</td>
            <td style="text-align:end">${fmt(r.DebitBalance)}</td>
            <td style="text-align:end">${fmt(r.CreditBalance)}</td>
          </tr>`;
    }).join('');

    const totRow = this.detailed
      ? `<tr style="font-weight:700;background:#dbeafe">
          <td colspan="2">${t('General.Total')}</td>
          <td style="text-align:end">${fmt(this.totBegB)}</td>
          <td style="text-align:end">${fmt(this.totDbtrans)}</td>
          <td style="text-align:end">${fmt(this.totCrtrans)}</td>
          <td style="text-align:end">${fmt(this.totDebitBalance)}</td>
          <td style="text-align:end">${fmt(this.totCreditBalance)}</td>
        </tr>`
      : `<tr style="font-weight:700;background:#dbeafe">
          <td colspan="2">${t('General.Total')}</td>
          <td style="text-align:end">${fmt(this.totDebitBalance)}</td>
          <td style="text-align:end">${fmt(this.totCreditBalance)}</td>
        </tr>`;

    this.reportPrint.printReport(title, cols, rowsHtml + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
