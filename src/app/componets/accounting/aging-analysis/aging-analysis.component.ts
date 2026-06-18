import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccfService, AccfDto } from '../../../shared/services/accf.service';
import { SalesmanService, SalesmanDto } from '../../../shared/services/salesman.service';
import { ReportService } from '../../../shared/services/report.service';
import {
  AgingAnalysisService,
  AgingAnalysisFilterDto,
  AgingAnalysisRowDto,
  AreaDto,
} from '../../../shared/services/aging-analysis.service';

@Component({
  selector: 'app-aging-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule],
  templateUrl: './aging-analysis.component.html',
  styleUrl: './aging-analysis.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AgingAnalysisComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  selectedAcc: AccfDto | null = null;
  branchedAccounts: AccfDto[] = [];
  lookupLoading = false;

  selectedSalesman: SalesmanDto | null = null;
  salesmen: SalesmanDto[] = [];

  selectedArea: AreaDto | null = null;
  areas: AreaDto[] = [];

  asOfDate = this.toDateStr(new Date());
  sortBy: 1 | 2 | 3 | 4 | 5 = 1;

  // ─── Results ───────────────────────────────────────────────
  rows: AgingAnalysisRowDto[] = [];
  loading = false;
  fetched = false;


  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  // ─── Totals ────────────────────────────────────────────────
  get totBalance():   number { return this.rows.reduce((s, r) => s + r.Balance, 0); }
  get tot1_30():      number { return this.rows.reduce((s, r) => s + r.Bucket1_30, 0); }
  get tot31_60():     number { return this.rows.reduce((s, r) => s + r.Bucket31_60, 0); }
  get tot61_90():     number { return this.rows.reduce((s, r) => s + r.Bucket61_90, 0); }
  get tot91_120():    number { return this.rows.reduce((s, r) => s + r.Bucket91_120, 0); }
  get totOver120():   number { return this.rows.reduce((s, r) => s + r.BucketOver120, 0); }
  get totCheques():   number { return this.rows.reduce((s, r) => s + r.UncollectedCheques, 0); }

  accountSearchFn = (term: string, item: AccfDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  salesmanSearchFn = (term: string, item: SalesmanDto): boolean => {
    const t = term.toLowerCase();
    return String(item.Man).includes(t)
      || (item.Name   ?? '').toLowerCase().includes(t)
      || (item.MEName ?? '').toLowerCase().includes(t);
  };

  areaSearchFn = (term: string, item: AreaDto): boolean => {
    const t = term.toLowerCase();
    return String(item.Id).includes(t)
      || (item.Name  ?? '').toLowerCase().includes(t)
      || (item.EName ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         AgingAnalysisService,
    private accfSvc:     AccfService,
    private salesmanSvc: SalesmanService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accfSvc.getBranched().subscribe({
      next: data => { this.branchedAccounts = data; this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
    this.salesmanSvc.getAll().subscribe({
      next: data => { this.salesmen = data ?? []; },
    });
    this.svc.getAreas().subscribe({
      next: data => { this.areas = data ?? []; },
    });
  }

  generate(): void {
    if (!this.selectedAcc) {
      this.toastr.warning(this.translate.instant('AgingAnalysis.AccRequired'));
      return;
    }

    const filter: AgingAnalysisFilterDto = {
      AsOfDate:  this.asOfDate,
      BelongAcc: this.selectedAcc.no,
      SalesMan:  this.selectedSalesman?.Man ?? 0,
      AreaNo:    this.selectedArea?.Id ?? 0,
      SortBy:    this.sortBy,
    };

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport(filter).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.fetched = true;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const accLabel = this.isAr ? this.selectedAcc?.name : this.selectedAcc?.Ename;
    const title = `${t('AgingAnalysis.Title')} – ${accLabel ?? ''} (${this.asOfDate})`;
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('AgingAnalysis.AccountNo')}:</span><span class="filter-value">${this.selectedAcc?.no}</span></div>
      <div class="filter-item"><span class="filter-label">${t('AgingAnalysis.AsOfDate')}:</span><span class="filter-value">${this.asOfDate}</span></div>
      ${this.selectedSalesman ? `<div class="filter-item"><span class="filter-label">${t('AgingAnalysis.Salesman')}:</span><span class="filter-value">${this.selectedSalesman.Man} — ${this.isAr ? this.selectedSalesman.Name : this.selectedSalesman.MEName}</span></div>` : ''}
      ${this.selectedArea ? `<div class="filter-item"><span class="filter-label">${t('AgingAnalysis.Area')}:</span><span class="filter-value">${this.selectedArea.Id} — ${this.isAr ? this.selectedArea.Name : this.selectedArea.EName}</span></div>` : ''}`;

    const cols = [
      { label: t('AgingAnalysis.AccNo') },
      { label: t('AgingAnalysis.AccName') },
      { label: t('AgingAnalysis.SalesmanShort') },
      { label: t('AgingAnalysis.Tel') },
      { label: t('AgingAnalysis.Balance') },
      { label: t('AgingAnalysis.Bucket1_30') },
      { label: t('AgingAnalysis.Bucket31_60') },
      { label: t('AgingAnalysis.Bucket61_90') },
      { label: t('AgingAnalysis.Bucket91_120') },
      { label: t('AgingAnalysis.BucketOver120') },
      { label: t('AgingAnalysis.UncollectedCheques') },
    ];

    const rowsHtml = this.rows.map(r => `<tr>
      <td>${r.AccNo}</td>
      <td>${this.isAr ? r.AccName : r.AccEName}</td>
      <td>${this.isAr ? r.SalesManName : r.SalesManEName}</td>
      <td>${r.Tel ?? ''}</td>
      <td style="text-align:end">${fmt(r.Balance)}</td>
      <td style="text-align:end">${fmt(r.Bucket1_30)}</td>
      <td style="text-align:end">${fmt(r.Bucket31_60)}</td>
      <td style="text-align:end">${fmt(r.Bucket61_90)}</td>
      <td style="text-align:end">${fmt(r.Bucket91_120)}</td>
      <td style="text-align:end">${fmt(r.BucketOver120)}</td>
      <td style="text-align:end">${fmt(r.UncollectedCheques)}</td>
    </tr>`).join('');

    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="4">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.totBalance)}</td>
      <td style="text-align:end">${fmt(this.tot1_30)}</td>
      <td style="text-align:end">${fmt(this.tot31_60)}</td>
      <td style="text-align:end">${fmt(this.tot61_90)}</td>
      <td style="text-align:end">${fmt(this.tot91_120)}</td>
      <td style="text-align:end">${fmt(this.totOver120)}</td>
      <td style="text-align:end">${fmt(this.totCheques)}</td>
    </tr>`;

    this.reportPrint.printReport(title, cols, rowsHtml + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
