import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccfService, AccfDto } from '../../../shared/services/accf.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import {
  AccBelongReportService,
  AccBelongFilterDto,
  AccBelongRowDto,
  AccBelongMonthlyRowDto,
} from '../../../shared/services/acc-belong-report.service';

type ReportMode = 'summary' | 'detail' | 'monthly' | 'analysis';

@Component({
  selector: 'app-acc-belong-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule, PaginatorComponent, PaginatePipe],
  templateUrl: './acc-belong-report.component.html',
  styleUrl: './acc-belong-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccBelongReportComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  allBranches = true;
  brNo: number | null = null;

  selectedAcc: AccfDto | null = null;
  branchedAccounts: AccfDto[] = [];
  lookupLoading = false;

  showZero = true;
  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());
  reportMode: ReportMode = 'detail';

  // ─── Results ───────────────────────────────────────────────
  rows:        AccBelongRowDto[]        = [];
  monthlyRows: AccBelongMonthlyRowDto[] = [];
  loading  = false;
  fetched  = false;
  page = 1;
  pageSize = 10;

  readonly months   = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  readonly monthKeys = ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'] as const;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  // ─── Totals ────────────────────────────────────────────────
  get totBegB():          number { return this.rows.reduce((s, r) => s + r.BegB, 0); }
  get totDbtrans():       number { return this.rows.reduce((s, r) => s + r.Dbtrans, 0); }
  get totCrtrans():       number { return this.rows.reduce((s, r) => s + r.Crtrans, 0); }
  get totBalance():       number { return this.rows.reduce((s, r) => s + r.BegB + r.Dbtrans - r.Crtrans, 0); }
  get totInChq():         number { return this.rows.reduce((s, r) => s + r.InChecksUnsettled, 0); }
  get totOutChq():        number { return this.rows.reduce((s, r) => s + r.OutChecksUnsettled, 0); }
  get totDebitBalance():  number { return this.rows.reduce((s, r) => { const b = this.balance(r); return s + (b > 0 ? b : 0); }, 0); }
  get totCreditBalance(): number { return this.rows.reduce((s, r) => { const b = this.balance(r); return s + (b < 0 ? -b : 0); }, 0); }

  get mTotBegB():    number { return this.monthlyRows.reduce((s, r) => s + r.BegB, 0); }
  get mTotPeriod():  number { return this.monthlyRows.reduce((s, r) => s + r.PeriodTotal, 0); }
  get mTotBalance(): number { return this.monthlyRows.reduce((s, r) => s + r.TotalBalance, 0); }
  mColTotal(key: typeof this.monthKeys[number]): number {
    return this.monthlyRows.reduce((s, r) => s + (r[key] as number), 0);
  }

  balance(r: AccBelongRowDto): number { return r.BegB + r.Dbtrans - r.Crtrans; }
  netMovement(r: AccBelongRowDto): number { return r.Dbtrans - r.Crtrans; }
  analysisBalance(r: AccBelongRowDto): number {
    return this.balance(r) - r.InChecksUnsettled + r.OutChecksUnsettled;
  }

  accountSearchFn = (term: string, item: AccfDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         AccBelongReportService,
    private accfSvc:     AccfService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accfSvc.getBranched().subscribe({
      next: data => {
        this.branchedAccounts = data;
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
  }

  onAccountChange(item: AccfDto | null): void {
    this.selectedAcc = item ?? null;
    this.onFilterChange();
  }

  /** Clear stale results whenever any filter value changes. */
  onFilterChange(): void {
    this.rows = []; this.monthlyRows = [];
    this.fetched = false;
  }

  generate(): void {
    if (!this.selectedAcc) {
      this.toastr.warning(this.translate.instant('AccBelong.AccRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('AccBelong.DateError'));
      return;
    }

    const filter: AccBelongFilterDto = {
      DateFrom: this.dateFrom,
      DateTo:   this.dateTo,
      AccNo:    this.selectedAcc.no,
      BrNo:     this.allBranches ? null : this.brNo,
      ShowZero: this.showZero,
    };

    this.loading = true;
    this.fetched = false;
    this.rows = []; this.monthlyRows = [];

    if (this.reportMode === 'monthly') {
      this.svc.getMonthly(filter).subscribe({
        next: data => { this.monthlyRows = data; this.page = 1; this.fetched = true; this.loading = false; },
        error: () => { this.loading = false; },
      });
    } else {
      this.svc.getReport(filter).subscribe({
        next: data => { this.rows = data; this.page = 1; this.fetched = true; this.loading = false; },
        error: () => { this.loading = false; },
      });
    }
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => n.toFixed(5);
    const accLabel = this.isAr ? this.selectedAcc?.name : this.selectedAcc?.Ename;
    const title = `${t('AccBelong.Title')} – ${accLabel ?? ''} (${this.dateFrom} — ${this.dateTo})`;
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('AccBelong.AccountNo')}:</span><span class="filter-value">${this.selectedAcc?.no}</span></div>
      <div class="filter-item"><span class="filter-label">${t('AccBelong.ReportType')}:</span><span class="filter-value">${t('AccBelong.' + this.reportMode.charAt(0).toUpperCase() + this.reportMode.slice(1))}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>`;

    if (this.reportMode === 'summary') {
      const cols = [
        { label: t('AccBelong.AccNo') },
        { label: t('AccBelong.AccName') },
        { label: t('AccBelong.DebitBalance') },
        { label: t('AccBelong.CreditBalance') },
      ];
      const rows = this.rows.map(r => `<tr>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : r.AccEName}</td>
        <td style="text-align:end">${this.balance(r) > 0 ? fmt(this.balance(r)) : ''}</td>
        <td style="text-align:end">${this.balance(r) < 0 ? fmt(-this.balance(r)) : ''}</td>
      </tr>`).join('');
      const totRow = `<tr style="font-weight:700;background:#dbeafe">
        <td colspan="2">${t('General.Total')}</td>
        <td style="text-align:end">${fmt(this.totDebitBalance)}</td>
        <td style="text-align:end">${fmt(this.totCreditBalance)}</td>
      </tr>`;
      this.reportPrint.printReport(title, cols, rows + totRow, filtersHtml);

    } else if (this.reportMode === 'detail') {
      const cols = [
        { label: t('AccBelong.AccNo') },
        { label: t('AccBelong.AccName') },
        { label: t('AccBelong.OpeningBalance') },
        { label: t('AccBelong.DebitTrans') },
        { label: t('AccBelong.CreditTrans') },
        { label: t('AccBelong.NetMovement') },
        { label: t('AccBelong.Balance') },
      ];
      const rows = this.rows.map(r => `<tr>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : r.AccEName}</td>
        <td style="text-align:end">${fmt(r.BegB)}</td>
        <td style="text-align:end">${fmt(r.Dbtrans)}</td>
        <td style="text-align:end">${fmt(r.Crtrans)}</td>
        <td style="text-align:end">${fmt(this.netMovement(r))}</td>
        <td style="text-align:end">${fmt(this.balance(r))}</td>
      </tr>`).join('');
      const totRow = `<tr style="font-weight:700;background:#dbeafe">
        <td colspan="2">${t('General.Total')}</td>
        <td style="text-align:end">${fmt(this.totBegB)}</td>
        <td style="text-align:end">${fmt(this.totDbtrans)}</td>
        <td style="text-align:end">${fmt(this.totCrtrans)}</td>
        <td style="text-align:end">${fmt(this.totDbtrans - this.totCrtrans)}</td>
        <td style="text-align:end">${fmt(this.totBalance)}</td>
      </tr>`;
      this.reportPrint.printReport(title, cols, rows + totRow, filtersHtml);

    } else if (this.reportMode === 'analysis') {
      const cols = [
        { label: t('AccBelong.AccNo') },
        { label: t('AccBelong.AccName') },
        { label: t('AccBelong.OpeningBalance') },
        { label: t('AccBelong.DebitTrans') },
        { label: t('AccBelong.CreditTrans') },
        { label: t('AccBelong.Balance') },
        { label: t('AccBelong.InChecksUnsettled') },
        { label: t('AccBelong.OutChecksUnsettled') },
        { label: t('AccBelong.FinalBalance') },
      ];
      const rows = this.rows.map(r => `<tr>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : r.AccEName}</td>
        <td style="text-align:end">${fmt(r.BegB)}</td>
        <td style="text-align:end">${fmt(r.Dbtrans)}</td>
        <td style="text-align:end">${fmt(r.Crtrans)}</td>
        <td style="text-align:end">${fmt(this.balance(r))}</td>
        <td style="text-align:end">${fmt(r.InChecksUnsettled)}</td>
        <td style="text-align:end">${fmt(r.OutChecksUnsettled)}</td>
        <td style="text-align:end">${fmt(this.analysisBalance(r))}</td>
      </tr>`).join('');
      const totRow = `<tr style="font-weight:700;background:#dbeafe">
        <td colspan="2">${t('General.Total')}</td>
        <td style="text-align:end">${fmt(this.totBegB)}</td>
        <td style="text-align:end">${fmt(this.totDbtrans)}</td>
        <td style="text-align:end">${fmt(this.totCrtrans)}</td>
        <td style="text-align:end">${fmt(this.totBalance)}</td>
        <td style="text-align:end">${fmt(this.totInChq)}</td>
        <td style="text-align:end">${fmt(this.totOutChq)}</td>
        <td style="text-align:end">${fmt(this.totBalance - this.totInChq + this.totOutChq)}</td>
      </tr>`;
      this.reportPrint.printReport(title, cols, rows + totRow, filtersHtml);

    } else if (this.reportMode === 'monthly') {
      const monthCols = this.months.map(m => ({ label: m }));
      const cols = [
        { label: t('AccBelong.AccNo') },
        { label: t('AccBelong.AccName') },
        { label: t('AccBelong.OpeningBalance') },
        { label: t('AccBelong.PeriodTotal') },
        ...monthCols,
        { label: 'Total' },
      ];
      const rows = this.monthlyRows.map(r => `<tr>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : r.AccEName}</td>
        <td style="text-align:end">${fmt(r.BegB)}</td>
        <td style="text-align:end">${fmt(r.PeriodTotal)}</td>
        ${this.monthKeys.map(k => `<td style="text-align:end">${fmt(r[k] as number)}</td>`).join('')}
        <td style="text-align:end">${fmt(r.TotalBalance)}</td>
      </tr>`).join('');
      const totRow = `<tr style="font-weight:700;background:#dbeafe">
        <td colspan="2">${t('General.Total')}</td>
        <td style="text-align:end">${fmt(this.mTotBegB)}</td>
        <td style="text-align:end">${fmt(this.mTotPeriod)}</td>
        ${this.monthKeys.map(k => `<td style="text-align:end">${fmt(this.mColTotal(k))}</td>`).join('')}
        <td style="text-align:end">${fmt(this.mTotBalance)}</td>
      </tr>`;
      this.reportPrint.printReport(title, cols, rows + totRow, filtersHtml);
    }
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
