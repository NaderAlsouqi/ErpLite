import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  IncomingChequeMovementService,
  ChequeSerialTypeDto,
} from '../../../shared/services/incoming-cheque-movement.service';
import {
  InwardChequesService,
  InwardChequeRowDto,
} from '../../../shared/services/inward-cheques.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-inward-cheques-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './inward-cheques-report.component.html',
  styleUrl: './inward-cheques-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class InwardChequesReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 acu06 form) ────────────────
  serialMode: 'all' | 'specific' = 'all';
  selectedSerial: ChequeSerialTypeDto | null = null;

  dateBasis: 'DUE' | 'RECEIPT' = 'DUE';
  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  chequeFrom = '';
  chequeTo   = '';
  amtFrom: number | null = null;
  amtTo:   number | null = null;

  status = -1;                                   // -1 = جميع الحالات
  chqType: 'BEG' | 'RECEIVED' | 'BOTH' = 'BOTH';

  bankAccMode: 'all' | 'specific' = 'all';
  selectedBankAcc: ChartOfAccountDto | null = null;
  custAccMode: 'all' | 'specific' = 'all';
  selectedCustAcc: ChartOfAccountDto | null = null;
  drawer = '';

  sortBy: 'DRAWER' | 'BANK' | 'DATE' | 'AMOUNT' = 'DRAWER';

  // Lookups
  serialTypes: ChequeSerialTypeDto[] = [];
  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  readonly statusOptions = [-1, 0, 1, 2, 3, 7, 8];

  // ─── Results ───────────────────────────────────────────────
  rows: InwardChequeRowDto[] = [];
  loading = false;
  fetched = false;
  /** Snapshot of the status filter the rows were generated with (drives columns). */
  viewAllStatus = true;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get totalLocal(): number { return this.rows.reduce((s, r) => s + r.LocalAmount, 0); }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         InwardChequesService,
    private serialSvc:   IncomingChequeMovementService,
    private accountsSvc: ChartOfAccountsService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.serialSvc.getSerialTypes().subscribe({
      next: data => { this.serialTypes = (data ?? []).filter(s => s.SerialTypeNo === 2); },
    });
    this.accountsSvc.getAll().subscribe({
      next: data => { this.accounts = (data ?? []).sort((a, b) => a.no - b.no); this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  /** Block non-digit keys (cheque-number fields). */
  onlyDigits(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
  }

  /** Block keys that aren't part of a positive number (amount fields). */
  onlyNumber(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) e.preventDefault();
  }

  /** Cheque-number field: keep digits only, drop values below 1. */
  sanitizeCheque(which: 'from' | 'to'): void {
    let v = ((which === 'from' ? this.chequeFrom : this.chequeTo) ?? '').replace(/\D/g, '');
    if (v !== '' && Number(v) < 1) v = '';
    if (which === 'from') this.chequeFrom = v; else this.chequeTo = v;
    this.onFilterChange();
  }

  /** Amount field: clear values below 1. */
  sanitizeAmt(which: 'from' | 'to'): void {
    const v = which === 'from' ? this.amtFrom : this.amtTo;
    if (v != null && v < 1) {
      if (which === 'from') this.amtFrom = null; else this.amtTo = null;
    }
    this.onFilterChange();
  }

  statusLabel(code: number): string {
    return this.translate.instant('InwardCheques.Status.' + code);
  }

  serialLabel(s: ChequeSerialTypeDto): string {
    const name   = this.isAr ? s.SerialName : (s.SerialEName || s.SerialName);
    const branch = this.isAr ? s.BranchName : (s.BranchEName || s.BranchName);
    return `${s.SerialNo} — ${name}${branch ? ' / ' + branch : ''}`;
  }

  generate(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.toastr.warning(this.translate.instant('InwardCheques.DateRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('InwardCheques.DateError'));
      return;
    }
    if (this.serialMode === 'specific' && !this.selectedSerial) {
      this.toastr.warning(this.translate.instant('InwardCheques.SerialRequired'));
      return;
    }
    if (this.bankAccMode === 'specific' && !this.selectedBankAcc) {
      this.toastr.warning(this.translate.instant('InwardCheques.BankAccRequired'));
      return;
    }

    const status = this.status;
    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport({
      DateBasis:  this.dateBasis,
      DateFrom:   this.dateFrom,
      DateTo:     this.dateTo,
      ChequeFrom: this.chequeFrom?.trim() || '',
      ChequeTo:   this.chequeTo?.trim() || '',
      AmtFrom:    this.amtFrom ?? 0,
      AmtTo:      this.amtTo ?? 0,
      Status:     status,
      ChqType:    this.chqType,
      BankAccNo:  this.bankAccMode === 'specific' ? (this.selectedBankAcc?.no ?? 0) : 0,
      CustAccNo:  this.custAccMode === 'specific' ? (this.selectedCustAcc?.no ?? 0) : 0,
      BranchNo:   this.serialMode === 'specific' ? (this.selectedSerial?.BranchNo ?? 0) : 0,
      Drawer:     this.drawer?.trim() || '',
      SortBy:     this.sortBy,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.viewAllStatus = status === -1;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('InwardCheques.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    const all = this.viewAllStatus;

    const cols = all
      ? [ { label: t('InwardCheques.ChequeNo') }, { label: t('InwardCheques.ChequeDate') },
          { label: t('InwardCheques.StatusCol') }, { label: t('InwardCheques.DocNo') },
          { label: t('InwardCheques.Amount') }, { label: t('InwardCheques.BankName') },
          { label: t('InwardCheques.Drawer') } ]
      : [ { label: t('InwardCheques.ChequeNo') }, { label: t('InwardCheques.ChequeDate') },
          { label: t('InwardCheques.DocNo') }, { label: t('InwardCheques.OrigAmount') },
          { label: t('InwardCheques.Currency') }, { label: t('InwardCheques.Rate') },
          { label: t('InwardCheques.Amount') }, { label: t('InwardCheques.BankName') },
          { label: t('InwardCheques.Drawer') } ];

    const dateOf = (r: InwardChequeRowDto) => this.dateBasis === 'RECEIPT' ? r.ReceiptDate : r.DueDate;
    const body = this.rows.map(r => all
      ? `<tr><td>${r.ChequeNum}</td><td>${dateOf(r)}</td><td>${this.statusLabel(r.Status)}</td><td>${r.DocNum}</td><td style="text-align:end">${fmt(r.LocalAmount)}</td><td>${this.isAr ? r.BankName : (r.BankEName || r.BankName)}</td><td>${r.Drawer}</td></tr>`
      : `<tr><td>${r.ChequeNum}</td><td>${dateOf(r)}</td><td>${r.DocNum}</td><td style="text-align:end">${fmt(r.Amount)}</td><td>${this.isAr ? r.CurName : (r.CurEName || r.CurName)}</td><td style="text-align:end">${r.Rate}</td><td style="text-align:end">${fmt(r.LocalAmount)}</td><td>${this.isAr ? r.BankName : (r.BankEName || r.BankName)}</td><td>${r.Drawer}</td></tr>`
    ).join('');
    const span = all ? 4 : 6;
    const totRow = `<tr style="font-weight:700;background:#dbeafe"><td colspan="${span}">${t('General.Total')}</td><td style="text-align:end">${fmt(this.totalLocal)}</td><td colspan="2"></td></tr>`;

    const statusTxt = this.status === -1 ? t('InwardCheques.AllStatuses') : this.statusLabel(this.status);
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('InwardCheques.Period')}:</span><span class="filter-value">${this.dateFrom} — ${this.dateTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('InwardCheques.StatusCol')}:</span><span class="filter-value">${statusTxt}</span></div>
      <div class="filter-item"><span class="filter-label">${t('InwardCheques.Count')}:</span><span class="filter-value">${this.rows.length}</span></div>`;

    this.reportPrint.printReport(t('InwardCheques.Title'), cols, body + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
