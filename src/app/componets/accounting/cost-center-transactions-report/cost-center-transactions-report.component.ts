import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  CostCenterTransactionsService,
  CostCenterTransactionRowDto,
} from '../../../shared/services/cost-center-transactions.service';

/** Cost-center group with its transactions and totals. */
interface CcTxnGroup {
  ccntrNo:  number;
  ccAname:  string;
  ccEname:  string;
  rows:     CostCenterTransactionRowDto[];
  totDebit:  number;
  totCredit: number;
  /** Net balance shown on the debit side (>0) or credit side (>0). */
  balDebit:  number;
  balCredit: number;
}

@Component({
  selector: 'app-cost-center-transactions-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './cost-center-transactions-report.component.html',
  styleUrl: './cost-center-transactions-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CostCenterTransactionsReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 dialog) ────────────────────
  // "All" sentinel (CcntrNo < 0) — a real, selectable option meaning all centers.
  readonly allOption: CostCenterDto = { CcntrNo: -1, CcAname: '', Ccename: '' };
  ccFrom: CostCenterDto | null = this.allOption;
  ccTo:   CostCenterDto | null = this.allOption;

  // Account range (Option3): when false → all accounts.
  accountRange = false;
  accFrom: ChartOfAccountDto | null = null;
  accTo:   ChartOfAccountDto | null = null;

  // Date range (Option2): when false → all periods.
  dateRange = false;
  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  costCenters: CostCenterDto[] = [];
  /** STABLE array reference (rebuilt only when costCenters loads) — a getter
   *  here would hand ng-select a new array each change-detection cycle and
   *  reset the selection. */
  ccOptions: CostCenterDto[] = [this.allOption];
  isAllCc(c: CostCenterDto | null): boolean { return !c || (c.CcntrNo ?? 0) < 0; }

  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  // ─── Results ───────────────────────────────────────────────
  groups: CcTxnGroup[] = [];
  loading = false;
  fetched = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  get grandDebit():  number { return this.groups.reduce((s, g) => s + g.totDebit,  0); }
  get grandCredit(): number { return this.groups.reduce((s, g) => s + g.totCredit, 0); }

  ccSearchFn = (term: string, item: CostCenterDto): boolean => {
    const t = term.toLowerCase();
    return String(item.CcntrNo).includes(t)
      || (item.CcAname ?? '').toLowerCase().includes(t)
      || (item.Ccename ?? '').toLowerCase().includes(t);
  };
  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         CostCenterTransactionsService,
    private ccSvc:       CostCenterService,
    private accountsSvc: ChartOfAccountsService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.ccSvc.getAll().subscribe({
      next: data => {
        this.costCenters = (data ?? []).sort((a, b) => (a.CcntrNo ?? 0) - (b.CcntrNo ?? 0));
        this.ccOptions = [this.allOption, ...this.costCenters];
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
    this.accountsSvc.getAll().subscribe({
      next: data => { this.accounts = (data ?? []).sort((a, b) => a.no - b.no); },
    });
  }

  ccLabel(c: CostCenterDto): string { return this.isAr ? (c.CcAname ?? '') : (c.Ccename || c.CcAname || ''); }

  generate(): void {
    // VB6 DoValidation
    if (this.isAllCc(this.ccFrom) && !this.isAllCc(this.ccTo)) {
      this.toastr.warning(this.translate.instant('CostCenterTransactions.CcFromRequired'));
      return;
    }
    if (this.accountRange && (!this.accFrom || !this.accTo)) {
      this.toastr.warning(this.translate.instant('CostCenterTransactions.AccountsRequired'));
      return;
    }
    if (this.dateRange) {
      if (!this.dateFrom || !this.dateTo) {
        this.toastr.warning(this.translate.instant('CostCenterTransactions.DateRequired'));
        return;
      }
      if (this.dateFrom > this.dateTo) {
        this.toastr.warning(this.translate.instant('CostCenterTransactions.DateError'));
        return;
      }
    }

    this.loading = true;
    this.fetched = false;
    this.groups = [];

    this.svc.getReport({
      CcFrom:   this.isAllCc(this.ccFrom) ? 0 : (this.ccFrom!.CcntrNo ?? 0),
      CcTo:     this.isAllCc(this.ccTo)   ? 0 : (this.ccTo!.CcntrNo   ?? 0),
      AccFrom:  this.accountRange ? (this.accFrom?.no ?? 0) : 0,
      AccTo:    this.accountRange ? (this.accTo?.no   ?? 0) : 0,
      DateFrom: this.dateRange ? this.dateFrom : '',
      DateTo:   this.dateRange ? this.dateTo   : '',
    }).subscribe({
      next: data => {
        this.groups = this.groupRows(data ?? []);
        this.fetched = true;
        this.loading = false;
        if (this.groups.length === 0) {
          this.toastr.info(this.translate.instant('CostCenterTransactions.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  /** Clear stale results whenever a filter value changes. */
  onFilterChange(): void {
    this.fetched = false;
    this.groups = [];
  }

  private groupRows(rows: CostCenterTransactionRowDto[]): CcTxnGroup[] {
    const map = new Map<number, CcTxnGroup>();
    for (const r of rows) {
      let g = map.get(r.CcntrNo);
      if (!g) {
        g = {
          ccntrNo: r.CcntrNo, ccAname: r.CcAname, ccEname: r.CcEname,
          rows: [], totDebit: 0, totCredit: 0, balDebit: 0, balCredit: 0,
        };
        map.set(r.CcntrNo, g);
      }
      g.rows.push(r);
      g.totDebit  += r.Debit;
      g.totCredit += r.Credit;
    }
    // Per-center balance: net on the heavier side (mirrors VB6 الرصيد row).
    for (const g of map.values()) {
      const net = g.totDebit - g.totCredit;
      g.balDebit  = net > 0 ?  net : 0;
      g.balCredit = net < 0 ? -net : 0;
    }
    return [...map.values()].sort((a, b) => a.ccntrNo - b.ccntrNo);
  }

  print(): void {
    if (this.groups.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const cols = [
      { label: t('CostCenterTransactions.DocNo') },
      { label: t('CostCenterTransactions.DocType') },
      { label: t('CostCenterTransactions.Date') },
      { label: t('CostCenterTransactions.AccNo') },
      { label: t('CostCenterTransactions.AccName') },
      { label: t('CostCenterTransactions.Debit') },
      { label: t('CostCenterTransactions.Credit') },
      { label: t('CostCenterTransactions.Description') },
      { label: t('CostCenterTransactions.CostCenter') },
    ];

    let body = '';
    for (const g of this.groups) {
      const ccName = this.isAr ? g.ccAname : (g.ccEname || g.ccAname);
      body += `<tr style="font-weight:700;background:#cfe2ff">
        <td colspan="9">${g.ccntrNo} — ${ccName}</td>
      </tr>`;
      body += g.rows.map(r => `<tr>
        <td>${r.DocNum}</td>
        <td>${r.SerialName}</td>
        <td>${r.Date}</td>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : (r.AccEName || r.AccName)}</td>
        <td style="text-align:end">${fmt(r.Debit)}</td>
        <td style="text-align:end">${fmt(r.Credit)}</td>
        <td>${r.Des}</td>
        <td>${this.isAr ? r.CcAname : (r.CcEname || r.CcAname)}</td>
      </tr>`).join('');
      body += `<tr style="font-weight:700;background:#eef4ff">
        <td colspan="5">${t('CostCenterTransactions.GroupTotal')}</td>
        <td style="text-align:end">${fmt(g.totDebit)}</td>
        <td style="text-align:end">${fmt(g.totCredit)}</td>
        <td colspan="2"></td>
      </tr>`;
      body += `<tr style="font-weight:700;background:#f1f5f9">
        <td colspan="5">${t('CostCenterTransactions.Balance')}</td>
        <td style="text-align:end">${fmt(g.balDebit)}</td>
        <td style="text-align:end">${fmt(g.balCredit)}</td>
        <td colspan="2"></td>
      </tr>`;
    }
    body += `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="5">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.grandDebit)}</td>
      <td style="text-align:end">${fmt(this.grandCredit)}</td>
      <td colspan="2"></td>
    </tr>`;

    const ccLbl = (c: CostCenterDto | null) =>
      this.isAllCc(c) ? t('CostCenterTransactions.All') : c!.CcntrNo + ' — ' + this.ccLabel(c!);
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('CostCenterTransactions.CcFrom')}:</span><span class="filter-value">${ccLbl(this.ccFrom)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('CostCenterTransactions.CcTo')}:</span><span class="filter-value">${ccLbl(this.ccTo)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('CostCenterTransactions.Period')}:</span><span class="filter-value">${this.dateRange ? this.dateFrom + ' — ' + this.dateTo : t('CostCenterTransactions.AllPeriods')}</span></div>`;

    this.reportPrint.printReport(t('CostCenterTransactions.Title'), cols, body, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
