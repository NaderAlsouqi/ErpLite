import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import {
  IncomeStatementService,
  IncomeStatementFilterDto,
  IncomeStatementResultDto,
  IncomeStatementRowDto,
  StockGridEntryDto,
} from '../../../shared/services/income-statement.service';
import { AccfService } from '../../../shared/services/accf.service';

@Component({
  selector: 'app-income-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule],
  templateUrl: './income-statement.component.html',
  styleUrl: './income-statement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class IncomeStatementComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  level: number | null = 1;
  showZero        = false;
  excludeClosing  = false;

  stockAccNo: number | null = null;
  beginningStock = 0;

  /** بضاعة آخر المدة grid — mirrors the VB6 Grid1 + SaveGridValues flow. */
  stockGrid: StockGridEntryDto[] = [];
  gridLoading = false;
  gridSaving  = false;

  /** Sum of grid values — replaces the legacy `endingStock` scalar. */
  get endingStock(): number {
    return this.stockGrid.reduce((s, r) => s + (Number(r.Value) || 0), 0);
  }

  /** Map of accNo → name for quick lookup when user types an account number. */
  private accNames = new Map<number, { name: string; ename: string }>();

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  // ─── Results ───────────────────────────────────────────────
  result: IncomeStatementResultDto | null = null;
  loading = false;
  fetched = false;


  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private svc:         IncomeStatementService,
    private accfSvc:     AccfService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    // Cache account names for the grid's name auto-lookup.
    this.accfSvc.getAllNames().subscribe({
      next: list => {
        list.forEach(a => this.accNames.set(a.no, {
          name:  a.name  ?? '',
          ename: a.Ename ?? '',
        }));
        // Refresh any rows already in the grid.
        this.stockGrid.forEach(r => this.resolveRowName(r));
      },
    });
  }

  // ─── Stock grid (بضاعة آخر المدة) ──────────────────────────
  addStockRow(): void {
    this.stockGrid.push({ AccNo: 0, Value: 0, AccName: '' });
  }
  removeStockRow(i: number): void {
    this.stockGrid.splice(i, 1);
  }
  onStockAccChange(r: StockGridEntryDto): void {
    this.resolveRowName(r);
  }
  private resolveRowName(r: StockGridEntryDto): void {
    if (!r.AccNo) { r.AccName = ''; return; }
    const hit = this.accNames.get(Number(r.AccNo));
    r.AccName = hit ? (this.isAr ? hit.name : hit.ename) : '';
  }

  /** Load inventory leaves under @stockAccNo with their saved Profl values. */
  loadStockGrid(): void {
    if (!this.stockAccNo || this.stockAccNo <= 0) {
      this.toastr.warning(this.translate.instant('IncomeStatement.StockAccRequired'));
      return;
    }
    this.gridLoading = true;
    this.svc.getStockGrid(this.stockAccNo).subscribe({
      next: rows => {
        this.stockGrid = rows.map(r => ({ ...r, AccName: '' }));
        this.stockGrid.forEach(r => this.resolveRowName(r));
        this.gridLoading = false;
      },
      error: () => { this.gridLoading = false; },
    });
  }

  /** Persist each row's value to accf.Profl — mirrors VB6 SaveGridValues. */
  saveStockGrid(): void {
    const payload = this.stockGrid
      .filter(r => Number(r.AccNo) > 0)
      .map(r => ({ AccNo: Number(r.AccNo), Value: Number(r.Value) || 0 }));
    if (payload.length === 0) {
      this.toastr.warning(this.translate.instant('IncomeStatement.GridEmpty'));
      return;
    }
    this.gridSaving = true;
    this.svc.saveStockGrid(payload).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('IncomeStatement.GridSaved'));
        this.gridSaving = false;
      },
      error: () => { this.gridSaving = false; },
    });
  }

  generate(): void {
    if (!this.level || this.level <= 0) {
      this.toastr.warning(this.translate.instant('IncomeStatement.LevelRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('IncomeStatement.DateError'));
      return;
    }

    const filter: IncomeStatementFilterDto = {
      DateFrom:       this.dateFrom,
      DateTo:         this.dateTo,
      Level:          this.level,
      ExcludeClosing: this.excludeClosing,
      ShowZero:       this.showZero,
      StockAccNo:     this.stockAccNo,
      BeginningStock: this.beginningStock || 0,
      EndingStock:    this.endingStock    || 0,
    };

    this.loading = true;
    this.fetched = false;
    this.result  = null;

    // VB6 SSCommand1_Click: SaveGridValues runs before opening the report.
    // Persist the grid silently first, then fetch.
    const payload = this.stockGrid
      .filter(r => Number(r.AccNo) > 0)
      .map(r => ({ AccNo: Number(r.AccNo), Value: Number(r.Value) || 0 }));

    const after = () => this.svc.getReport(filter).subscribe({
      next: data => {
        this.result = data;
        // First load: if user didn't enter a beg stock value, surface the
        // SP-computed one so the field reflects what was actually used.
        if (this.beginningStock === 0 && data.BeginningStock !== 0) {
          this.beginningStock = data.BeginningStock;
        }
        this.fetched = true;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    if (payload.length > 0) {
      this.svc.saveStockGrid(payload).subscribe({
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

  /** Bold rows where level=1 or branch<>0 — matches VB6 print_mainobjects. */
  isHeaderRow(r: IncomeStatementRowDto): boolean {
    return r.Level === 1 || r.Branch !== 0;
  }

  /**
   * VB6 P_Blnc(amt, acc): for accounts whose number starts with 6, 7, or 8
   * (income / revenue / other-income), show Abs(amt). For all other roots
   * (expenses, COGS), show the signed value. This converts credit-balance
   * income amounts into positive presentation figures.
   */
  displayValue(r: IncomeStatementRowDto): number {
    const first = String(r.AccNo).charAt(0);
    return (first === '6' || first === '7' || first === '8')
      ? Math.abs(r.Value)
      : r.Value;
  }

  print(): void {
    if (!this.result) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const r   = this.result;

    const sectionRows = (rows: IncomeStatementRowDto[]) => rows.map(row => {
      const w = this.isHeaderRow(row) ? 'font-weight:700;' : '';
      return `<tr style="${w}">
        <td>${row.AccNo}</td>
        <td>${this.isAr ? row.AccName : row.AccEName}</td>
        <td style="text-align:end">${fmt(this.displayValue(row))}</td>
      </tr>`;
    }).join('');

    const cols = [
      { label: t('IncomeStatement.AccNo') },
      { label: t('IncomeStatement.AccName') },
      { label: t('IncomeStatement.Amount') },
    ];

    const html = `
      ${this.sectionHeader(t('IncomeStatement.Income'))}
      ${sectionRows([...r.SalesAccounts, ...r.RevenueAccounts])}
      ${this.totalRow(t('IncomeStatement.IncomeTotal'), fmt(r.IncomeTotal))}

      ${this.sectionHeader(t('IncomeStatement.CogsTitle'))}
      ${!r.StkMethod ? `
        ${this.lineRow(t('IncomeStatement.BeginningStock') + ' (+)', fmt(r.BeginningStock))}
        ${sectionRows(r.PurchaseAccounts)}
        ${this.lineRow(t('IncomeStatement.PurchasesTotal'),          fmt(r.PurchasesTotal))}
        ${this.lineRow(t('IncomeStatement.EndingStock') + ' (-)',    fmt(r.EndingStock))}
      ` : sectionRows(r.PurchaseAccounts)}
      ${this.totalRow(t('IncomeStatement.CogsTotal'), fmt(r.CogsTotal))}

      ${this.totalRow(t('IncomeStatement.GrossProfit'), fmt(r.GrossProfit))}

      ${this.sectionHeader(t('IncomeStatement.Expenses'))}
      ${sectionRows(r.ExpenseAccounts)}
      ${this.totalRow(t('IncomeStatement.ExpensesTotal'), fmt(r.ExpensesTotal))}

      ${this.totalRow(
        r.NetIncome >= 0 ? t('IncomeStatement.Profits') : t('IncomeStatement.Losses'),
        fmt(Math.abs(r.NetIncome)))}`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('General.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomeStatement.Level')}:</span><span class="filter-value">${this.level}</span></div>`;

    this.reportPrint.printReport(t('IncomeStatement.Title'), cols, html, filtersHtml);
  }

  private sectionHeader(title: string): string {
    return `<tr style="font-weight:700;background:#cfe2ff">
      <td colspan="3">${title}</td>
    </tr>`;
  }
  private lineRow(label: string, value: string): string {
    return `<tr>
      <td colspan="2">${label}</td>
      <td style="text-align:end">${value}</td>
    </tr>`;
  }
  private totalRow(label: string, value: string): string {
    return `<tr style="font-weight:700;background:#e7f1ff">
      <td colspan="2">${label}</td>
      <td style="text-align:end">${value}</td>
    </tr>`;
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
