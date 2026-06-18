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
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  CostCenterAccountBalancesService,
  CostCenterAccountBalanceRowDto,
} from '../../../shared/services/cost-center-account-balances.service';

/** Cost-center group with its member rows and subtotals. */
interface CcGroup {
  ccntrNo: number;
  ccAname: string;
  ccEname: string;
  rows:    CostCenterAccountBalanceRowDto[];
  totOpening:    number;
  totAmount:     number;
  totTotal:      number;
  totEstimated:  number;
  totDifference: number;
}

@Component({
  selector: 'app-cost-center-account-balances-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './cost-center-account-balances-report.component.html',
  styleUrl: './cost-center-account-balances-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CostCenterAccountBalancesReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  // "All" sentinel (CcntrNo < 0) — a real, selectable option meaning all centers.
  readonly allOption: CostCenterDto = { CcntrNo: -1, CcAname: '', Ccename: '' };
  ccFrom: CostCenterDto | null = this.allOption;
  ccTo:   CostCenterDto | null = this.allOption;
  selectedAcc: ChartOfAccountDto | null = null;   // optional account filter
  showEstimated = false;                          // اظهار ارصدة تقديرية

  costCenters: CostCenterDto[] = [];
  /** Dropdown items = "All" row + the real cost centers.
   *  STABLE array reference (rebuilt only when costCenters loads) — a getter
   *  here would hand ng-select a new array each change-detection cycle and
   *  reset the selection. */
  ccOptions: CostCenterDto[] = [this.allOption];
  isAllCc(c: CostCenterDto | null): boolean { return !c || (c.CcntrNo ?? 0) < 0; }

  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  // ─── Results ───────────────────────────────────────────────
  groups: CcGroup[] = [];
  loading = false;
  fetched = false;
  /** Whether the currently-displayed results were generated in estimated mode. */
  estimatedView = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  get grandOpening():    number { return this.groups.reduce((s, g) => s + g.totOpening,    0); }
  get grandAmount():     number { return this.groups.reduce((s, g) => s + g.totAmount,     0); }
  get grandTotal():      number { return this.groups.reduce((s, g) => s + g.totTotal,      0); }
  get grandEstimated():  number { return this.groups.reduce((s, g) => s + g.totEstimated,  0); }
  get grandDifference(): number { return this.groups.reduce((s, g) => s + g.totDifference, 0); }

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
    private svc:         CostCenterAccountBalancesService,
    private ccSvc:       CostCenterService,
    private accountsSvc: ChartOfAccountsService,
    private reportPrint: ReportService,
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
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('CostCenterAccBalances.DateError'));
      return;
    }

    this.loading = true;
    this.fetched = false;
    this.groups = [];

    const estimated = this.showEstimated;
    this.svc.getReport({
      CcFrom:        this.isAllCc(this.ccFrom) ? 0 : (this.ccFrom!.CcntrNo ?? 0),
      CcTo:          this.isAllCc(this.ccTo)   ? 0 : (this.ccTo!.CcntrNo   ?? 0),
      AccNo:         this.selectedAcc?.no ?? 0,
      DateFrom:      this.dateFrom,
      DateTo:        this.dateTo,
      ShowEstimated: estimated,
    }).subscribe({
      next: data => {
        this.estimatedView = estimated;
        this.groups = this.groupRows(data ?? []);
        this.fetched = true;
        this.loading = false;
        if (this.groups.length === 0) {
          this.toastr.info(this.translate.instant('CostCenterAccBalances.NoData'));
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

  /** Cost centers within the selected range — mirrors the VB6 RsCost loop. */
  private centersInScope(): CostCenterDto[] {
    if (this.isAllCc(this.ccFrom)) return this.costCenters;          // "All" → all
    const from = this.ccFrom!.CcntrNo ?? 0;
    if (!this.isAllCc(this.ccTo)) {
      const to = this.ccTo!.CcntrNo ?? 0;
      return this.costCenters.filter(c => (c.CcntrNo ?? 0) >= from && (c.CcntrNo ?? 0) <= to);
    }
    return this.costCenters.filter(c => (c.CcntrNo ?? 0) === from);   // single
  }

  private groupRows(rows: CostCenterAccountBalanceRowDto[]): CcGroup[] {
    const map = new Map<number, CcGroup>();

    // Seed a group for EVERY cost center in range, so empty centers still
    // appear with a zero total row (matches the VB6 print). When a specific
    // account is selected, don't seed empties — only centers that actually
    // carry that account should appear.
    if (!this.selectedAcc) {
      for (const c of this.centersInScope()) {
        map.set(c.CcntrNo, {
          ccntrNo: c.CcntrNo,
          ccAname: c.CcAname ?? '',
          ccEname: c.Ccename ?? '',
          rows: [], totOpening: 0, totAmount: 0, totTotal: 0, totEstimated: 0, totDifference: 0,
        });
      }
    }

    for (const r of rows) {
      let g = map.get(r.CcntrNo);
      if (!g) {
        g = {
          ccntrNo: r.CcntrNo, ccAname: r.CcAname, ccEname: r.CcEname,
          rows: [], totOpening: 0, totAmount: 0, totTotal: 0, totEstimated: 0, totDifference: 0,
        };
        map.set(r.CcntrNo, g);
      }
      g.rows.push(r);
      g.totOpening    += r.Opening;
      g.totAmount     += r.Amount;
      g.totTotal      += r.Total;
      g.totEstimated  += r.Estimated;
      g.totDifference += r.Difference;
    }
    return [...map.values()].sort((a, b) => a.ccntrNo - b.ccntrNo);
  }

  print(): void {
    if (this.groups.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const est = this.estimatedView;
    // When estimated mode is on, the Total column is replaced by the
    // Estimated value + Difference columns (mirrors VB6 Check2).
    const cols = [
      { label: t('CostCenterAccBalances.AccNo') },
      { label: t('CostCenterAccBalances.AccName') },
      { label: t('CostCenterAccBalances.Opening') },
      { label: t('CostCenterAccBalances.Amount') },
      ...(est
        ? [{ label: t('CostCenterAccBalances.Estimated') }, { label: t('CostCenterAccBalances.Difference') }]
        : [{ label: t('CostCenterAccBalances.Total') }]),
    ];
    const span = est ? 6 : 5;
    const tailCells = (r: CostCenterAccountBalanceRowDto) => est
      ? `<td style="text-align:end">${fmt(r.Estimated)}</td><td style="text-align:end">${fmt(r.Difference)}</td>`
      : `<td style="text-align:end">${fmt(r.Total)}</td>`;

    let body = '';
    for (const g of this.groups) {
      body += `<tr style="font-weight:700;background:#cfe2ff">
        <td colspan="${span}">${g.ccntrNo} — ${this.isAr ? g.ccAname : (g.ccEname || g.ccAname)}</td>
      </tr>`;
      body += g.rows.map(r => `<tr>
        <td>${r.AccNo}</td>
        <td>${this.isAr ? r.AccName : (r.AccEName || r.AccName)}</td>
        <td style="text-align:end">${fmt(r.Opening)}</td>
        <td style="text-align:end">${fmt(r.Amount)}</td>
        ${tailCells(r)}
      </tr>`).join('');
      body += `<tr style="font-weight:700;background:#eef4ff">
        <td colspan="2">${t('CostCenterAccBalances.GroupTotal')}</td>
        <td style="text-align:end">${fmt(g.totOpening)}</td>
        <td style="text-align:end">${fmt(g.totAmount)}</td>
        ${est
          ? `<td style="text-align:end">${fmt(g.totEstimated)}</td><td style="text-align:end">${fmt(g.totDifference)}</td>`
          : `<td style="text-align:end">${fmt(g.totTotal)}</td>`}
      </tr>`;
    }
    body += `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="2">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.grandOpening)}</td>
      <td style="text-align:end">${fmt(this.grandAmount)}</td>
      ${est
        ? `<td style="text-align:end">${fmt(this.grandEstimated)}</td><td style="text-align:end">${fmt(this.grandDifference)}</td>`
        : `<td style="text-align:end">${fmt(this.grandTotal)}</td>`}
    </tr>`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('CostCenterAccBalances.CcFrom')}:</span><span class="filter-value">${this.isAllCc(this.ccFrom) ? t('CostCenterAccBalances.All') : this.ccFrom!.CcntrNo + ' — ' + this.ccLabel(this.ccFrom!)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('CostCenterAccBalances.CcTo')}:</span><span class="filter-value">${this.isAllCc(this.ccTo) ? t('CostCenterAccBalances.All') : this.ccTo!.CcntrNo + ' — ' + this.ccLabel(this.ccTo!)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>`;

    this.reportPrint.printReport(t('CostCenterAccBalances.Title'), cols, body, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
