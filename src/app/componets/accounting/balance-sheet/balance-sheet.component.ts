import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import {
  BalanceSheetService,
  BalanceSheetFilterDto,
  BalanceSheetResultDto,
  BalanceSheetRowDto,
} from '../../../shared/services/balance-sheet.service';
import {
  IncomeStatementService,
  StockGridEntryDto,
} from '../../../shared/services/income-statement.service';
import { AccfService } from '../../../shared/services/accf.service';

@Component({
  selector: 'app-balance-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule],
  templateUrl: './balance-sheet.component.html',
  styleUrl: './balance-sheet.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BalanceSheetComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  level: number | null = 1;
  excludeClosing = false;

  stockAccNo: number | null = null;
  begDate  = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  asOfDate = this.toDateStr(new Date());

  // ─── Stock grid (بضاعة آخر المدة) — shared accf.Profl storage ──
  stockGrid: StockGridEntryDto[] = [];
  gridLoading = false;
  gridSaving  = false;

  get endingStock(): number {
    return this.stockGrid.reduce((s, r) => s + (Number(r.Value) || 0), 0);
  }
  private accNames = new Map<number, { name: string; ename: string }>();

  // ─── Results ───────────────────────────────────────────────
  result: BalanceSheetResultDto | null = null;
  loading = false;
  fetched = false;


  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private svc:        BalanceSheetService,
    private incomeSvc:  IncomeStatementService,
    private accfSvc:    AccfService,
    private reportPrint: ReportService,
    private translate:  TranslateService,
    private toastr:     ToastrService,
  ) {}

  ngOnInit(): void {
    this.accfSvc.getAllNames().subscribe({
      next: list => {
        list.forEach(a => this.accNames.set(a.no, {
          name:  a.name  ?? '',
          ename: a.Ename ?? '',
        }));
        this.stockGrid.forEach(r => this.resolveRowName(r));
      },
    });
  }

  // ─── Stock grid actions ────────────────────────────────────
  addStockRow(): void {
    this.stockGrid.push({ AccNo: 0, Value: 0, AccName: '' });
  }
  removeStockRow(i: number): void { this.stockGrid.splice(i, 1); }
  onStockAccChange(r: StockGridEntryDto): void { this.resolveRowName(r); }

  private resolveRowName(r: StockGridEntryDto): void {
    if (!r.AccNo) { r.AccName = ''; return; }
    const hit = this.accNames.get(Number(r.AccNo));
    r.AccName = hit ? (this.isAr ? hit.name : hit.ename) : '';
  }

  loadStockGrid(): void {
    if (!this.stockAccNo || this.stockAccNo <= 0) {
      this.toastr.warning(this.translate.instant('BalanceSheet.StockAccRequired'));
      return;
    }
    this.gridLoading = true;
    this.incomeSvc.getStockGrid(this.stockAccNo).subscribe({
      next: rows => {
        this.stockGrid = rows.map(r => ({ ...r, AccName: '' }));
        this.stockGrid.forEach(r => this.resolveRowName(r));
        this.gridLoading = false;
      },
      error: () => { this.gridLoading = false; },
    });
  }

  saveStockGrid(): void {
    const payload = this.stockGrid
      .filter(r => Number(r.AccNo) > 0)
      .map(r => ({ AccNo: Number(r.AccNo), Value: Number(r.Value) || 0 }));
    if (payload.length === 0) {
      this.toastr.warning(this.translate.instant('BalanceSheet.GridEmpty'));
      return;
    }
    this.gridSaving = true;
    this.incomeSvc.saveStockGrid(payload).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('BalanceSheet.GridSaved'));
        this.gridSaving = false;
      },
      error: () => { this.gridSaving = false; },
    });
  }

  // ─── Generate ──────────────────────────────────────────────
  generate(): void {
    if (!this.level || this.level <= 0) {
      this.toastr.warning(this.translate.instant('BalanceSheet.LevelRequired'));
      return;
    }
    if (this.begDate > this.asOfDate) {
      this.toastr.warning(this.translate.instant('BalanceSheet.DateError'));
      return;
    }

    const filter: BalanceSheetFilterDto = {
      BegDate:        this.begDate,
      AsOfDate:       this.asOfDate,
      Level:          this.level,
      ExcludeClosing: this.excludeClosing,
      StockAccNo:     this.stockAccNo,
      EndingStock:    this.endingStock,
    };

    this.loading = true;
    this.fetched = false;
    this.result  = null;

    // VB6 flow: SaveGridValues runs silently before the report opens.
    const payload = this.stockGrid
      .filter(r => Number(r.AccNo) > 0)
      .map(r => ({ AccNo: Number(r.AccNo), Value: Number(r.Value) || 0 }));

    const after = () => this.svc.getReport(filter).subscribe({
      next: data => {
        this.result = data;
        this.fetched = true;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    if (payload.length > 0) {
      this.incomeSvc.saveStockGrid(payload).subscribe({
        next: () => after(),
        error: () => { this.loading = false; },
      });
    } else {
      after();
    }
  }

  /** Clear stale results when any filter changes, until the user regenerates. */
  onFilterChange(): void {
    this.fetched = false;
    this.result  = null;
  }

  isHeaderRow(r: BalanceSheetRowDto): boolean {
    return r.Level === 1 || r.Branch !== 0;
  }

  // ─── Print ─────────────────────────────────────────────────
  print(): void {
    if (!this.result) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const r   = this.result;

    const sectionRows = (rows: BalanceSheetRowDto[]) => rows.map(row => {
      const w = this.isHeaderRow(row) ? 'font-weight:700;' : '';
      return `<tr style="${w}">
        <td>${row.AccNo}</td>
        <td>${this.isAr ? row.AccName : row.AccEName}</td>
        <td style="text-align:end">${row.DebitValue  > 0 ? fmt(row.DebitValue)  : ''}</td>
        <td style="text-align:end">${row.CreditValue > 0 ? fmt(row.CreditValue) : ''}</td>
      </tr>`;
    }).join('');

    const cols = [
      { label: t('BalanceSheet.AccNo') },
      { label: t('BalanceSheet.AccName') },
      { label: t('BalanceSheet.Debit') },
      { label: t('BalanceSheet.Credit') },
    ];

    const html = `
      ${this.sectionHeader(t('BalanceSheet.Assets'))}
      ${sectionRows(r.Assets)}
      ${!r.StkMethod ? this.lineRow(t('BalanceSheet.EndingStockValue'), fmt(r.EndingStock)) : ''}
      ${this.totalRow(t('BalanceSheet.AssetsTotal'), fmt(r.AssetsTotal))}

      ${this.sectionHeader(t('BalanceSheet.Liabilities'))}
      ${sectionRows(r.Liabilities)}

      ${this.sectionHeader(t('BalanceSheet.Equity'))}
      ${sectionRows(r.Equity)}
      ${this.lineRow(t('BalanceSheet.NetIncome'), fmt(r.NetIncome))}
      ${this.totalRow(t('BalanceSheet.TotalEquity'), fmt(r.TotalEquity))}
      ${this.totalRow(t('BalanceSheet.GrandTotal'), fmt(r.GrandTotal))}`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('BalanceSheet.BegDate')}:</span><span class="filter-value">${this.begDate}</span></div>
      <div class="filter-item"><span class="filter-label">${t('BalanceSheet.AsOfDate')}:</span><span class="filter-value">${this.asOfDate}</span></div>
      <div class="filter-item"><span class="filter-label">${t('BalanceSheet.Level')}:</span><span class="filter-value">${this.level}</span></div>`;

    this.reportPrint.printReport(t('BalanceSheet.Title'), cols, html, filtersHtml);
  }

  private sectionHeader(title: string): string {
    return `<tr style="font-weight:700;background:#cfe2ff"><td colspan="4">${title}</td></tr>`;
  }
  private lineRow(label: string, value: string): string {
    return `<tr><td colspan="3">${label}</td><td style="text-align:end">${value}</td></tr>`;
  }
  private totalRow(label: string, value: string): string {
    return `<tr style="font-weight:700;background:#e7f1ff"><td colspan="3">${label}</td><td style="text-align:end">${value}</td></tr>`;
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
