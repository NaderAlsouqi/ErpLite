import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import {
  OutwardChequesService,
  OutwardChequeRowDto,
} from '../../../shared/services/outward-cheques.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-outward-cheques-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective, PaginatorComponent, PaginatePipe],
  templateUrl: './outward-cheques-report.component.html',
  styleUrl: './outward-cheques-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class OutwardChequesReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 acu07 form) ────────────────
  serialMode: 'all' | 'specific' = 'all';
  selectedSerial: VoucherSerial | null = null;

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  status = -1;                                       // -1 = كلاهما
  chqKind: 'BEG' | 'PAYMENT' | 'BOTH' = 'BOTH';

  accMode: 'all' | 'bank' | 'cheque' = 'all';
  selectedAcc: ChartOfAccountDto | null = null;
  useCustAcc = false;
  selectedCustAcc: ChartOfAccountDto | null = null;

  chequeFrom = '';
  chequeTo   = '';
  amtFrom: number | null = null;
  amtTo:   number | null = null;

  sortBy: 'DATE' | 'CHEQUE' | 'AMOUNT' | 'BENEFICIARY' = 'DATE';

  // Lookups
  serials: VoucherSerial[] = [];
  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  readonly statusOptions = [-1, 1, 0, 3];

  // ─── Results ───────────────────────────────────────────────
  rows: OutwardChequeRowDto[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get totalLocal(): number { return this.rows.reduce((s, r) => s + r.LocalAmount, 0); }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         OutwardChequesService,
    private serialSvc:   VoucherSerialService,
    private accountsSvc: ChartOfAccountsService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.serialSvc.getAll(3).subscribe({                 // VTypeNo 3 = صرف شيكات
      next: data => { this.serials = data ?? []; },
    });
    this.accountsSvc.getAll().subscribe({
      next: data => { this.accounts = (data ?? []).sort((a, b) => a.no - b.no); this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }

  onlyDigits(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
  }
  onlyNumber(e: KeyboardEvent): void {
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) e.preventDefault();
  }
  sanitizeCheque(which: 'from' | 'to'): void {
    let v = ((which === 'from' ? this.chequeFrom : this.chequeTo) ?? '').replace(/\D/g, '');
    if (v !== '' && Number(v) < 1) v = '';
    if (which === 'from') this.chequeFrom = v; else this.chequeTo = v;
    this.onFilterChange();
  }
  sanitizeAmt(which: 'from' | 'to'): void {
    const v = which === 'from' ? this.amtFrom : this.amtTo;
    if (v != null && v < 1) { if (which === 'from') this.amtFrom = null; else this.amtTo = null; }
    this.onFilterChange();
  }

  statusLabel(code: number): string { return this.translate.instant('OutwardCheques.Status.' + code); }

  serialLabel(s: VoucherSerial): string {
    return `${s.VSerialNo} — ${this.isAr ? s.SName : (s.Sename || s.SName)}`;
  }

  generate(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.toastr.warning(this.translate.instant('OutwardCheques.DateRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('OutwardCheques.DateError'));
      return;
    }
    if (this.serialMode === 'specific' && !this.selectedSerial) {
      this.toastr.warning(this.translate.instant('OutwardCheques.SerialRequired'));
      return;
    }
    if (this.accMode !== 'all' && !this.selectedAcc) {
      this.toastr.warning(this.translate.instant('OutwardCheques.AccRequired'));
      return;
    }

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    const accNo = this.selectedAcc?.no ?? 0;
    this.svc.getReport({
      DateFrom:    this.dateFrom,
      DateTo:      this.dateTo,
      Status:      this.status,
      ChqKind:     this.chqKind,
      BankAccNo:   this.accMode === 'bank'   ? accNo : 0,
      ChequeAccNo: this.accMode === 'cheque' ? accNo : 0,
      CustAccNo:   this.useCustAcc ? (this.selectedCustAcc?.no ?? 0) : 0,
      ChequeFrom:  this.chequeFrom?.trim() || '',
      ChequeTo:    this.chequeTo?.trim() || '',
      AmtFrom:     this.amtFrom ?? 0,
      AmtTo:       this.amtTo ?? 0,
      SerialNo:    this.serialMode === 'specific' ? (this.selectedSerial?.VSerialNo ?? 0) : 0,
      SortBy:      this.sortBy,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.page = 1;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('OutwardCheques.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const cols = [
      { label: t('OutwardCheques.ChequeNo') },
      { label: t('OutwardCheques.ChequeDate') },
      { label: t('OutwardCheques.Amount') },
      { label: t('OutwardCheques.AccName') },
      { label: t('OutwardCheques.Beneficiary') },
      { label: t('OutwardCheques.DocNo') },
    ];

    const body = this.rows.map(r => `<tr>
      <td>${r.ChequeNum}</td>
      <td>${r.Date1}</td>
      <td style="text-align:end">${fmt(r.LocalAmount)}</td>
      <td>${this.isAr ? r.AccName : (r.AccEName || r.AccName)}</td>
      <td>${r.Beneficiary}</td>
      <td>${r.DocNum}</td>
    </tr>`).join('');
    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="2">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.totalLocal)}</td>
      <td colspan="3"></td></tr>`;

    const statusTxt = this.status === -1 ? t('OutwardCheques.AllStatuses') : this.statusLabel(this.status);
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('OutwardCheques.Period')}:</span><span class="filter-value">${this.dateFrom} — ${this.dateTo}</span></div>
      <div class="filter-item"><span class="filter-label">${t('OutwardCheques.StatusCol')}:</span><span class="filter-value">${statusTxt}</span></div>
      <div class="filter-item"><span class="filter-label">${t('OutwardCheques.Count')}:</span><span class="filter-value">${this.rows.length}</span></div>`;

    this.reportPrint.printReport(t('OutwardCheques.Title'), cols, body + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
