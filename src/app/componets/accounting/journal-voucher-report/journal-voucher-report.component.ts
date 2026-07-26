import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule, FlatpickrDefaults } from 'angularx-flatpickr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import {
  JournalVoucherReportService,
  JvReportLineDto,
  JvVoucherTypeDto,
  JvReportFilterDto,
} from '../../../shared/services/journal-voucher-report.service';

interface VoucherGroup {
  transNum:   number;
  docNum:     number;
  date:       string;
  serialName: string;
  lines:      JvReportLineDto[];
  totalDebit: number;
  totalCredit: number;
}

@Component({
  selector: 'app-journal-voucher-report',
  standalone: true,
  imports: [
    ReportExportComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    DecimalPipe,
  ],
  providers: [FlatpickrDefaults],
  templateUrl: './journal-voucher-report.component.html',
  styleUrl: './journal-voucher-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class JournalVoucherReportComponent implements OnInit {

  loading = false;

  // ─── Filters ───────────────────────────────────────────────────
  filterMode: 'Date' | 'DocNum' = 'Date';

  dateFrom  = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo    = this.toDateStr(new Date());
  docNumFrom: number | null = null;
  docNumTo:   number | null = null;

  // VType (نوع التسلسل) – radio: specific serial or all
  vTypeMode:     'all' | 'specific' = 'all';
  vTypeSpecific: number | null = null;

  // DocType (نوع السند) – radio: specific type or all
  docTypeMode:     'all' | 'specific' = 'all';
  docTypeSpecific: number | null = null;

  hideSmallMovements = false;

  postStatus: number | null = null;
  orderBy:    'DocNum' | 'Date' = 'DocNum';
  searchDes:  string = '';
  accNo:      number | null = null;
  amtFrom:    number | null = null;
  amtTo:      number | null = null;

  // ─── Lookups ───────────────────────────────────────────────────
  voucherTypes:   JvVoucherTypeDto[]  = [];
  voucherSerials: VoucherSerial[]     = [];
  accounts:       ChartOfAccountDto[] = [];

  postStatusOptions = [
    { value: null,  label: 'JvReport.All'       },
    { value: 1,     label: 'JvReport.Posted'     },
    { value: 0,     label: 'JvReport.NotPosted'  },
  ];

  orderByOptions = [
    { value: 'DocNum', label: 'JvReport.OrderDocNum' },
    { value: 'Date',   label: 'JvReport.OrderDate'   },
  ];

  // ─── Results ───────────────────────────────────────────────────
  groups: VoucherGroup[] = [];
  grandDebit  = 0;
  grandCredit = 0;
  hasResults  = false;

  readonly dateOptions = {
    dateFormat: 'Y-m-d',
    allowInput: true,
    altInput: true,
    altFormat: 'd/m/Y',
    locale: { firstDayOfWeek: 6 },
  };

  constructor(
    private reportSvc:   JournalVoucherReportService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
    private coaSvc:      ChartOfAccountsService,
    private serialSvc:   VoucherSerialService,
    public  cs:          CompanySettingsService,
  ) {}

  ngOnInit(): void {
    this.loadVoucherTypes();
    this.loadVoucherSerials(); // no filter until user picks a doc type
    this.loadAccounts();
  }

  get numFmt(): string {
    const d = this.cs.decimals ?? 2;
    return `1.${d}-${d}`;
  }

  get isAr(): boolean {
    return this.translate.currentLang === 'ar';
  }

  private toDateStr(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  /** Fiscal year for a voucher group — used by the deep-link to the voucher. */
  vYear(dateStr: string): number {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  private loadVoucherTypes(): void {
    this.reportSvc.getVoucherTypes().subscribe({
      next: data => (this.voucherTypes = data),
      error: () => {},
    });
  }

  private loadVoucherSerials(vTypeNo?: number): void {
    this.serialSvc.getAll(vTypeNo).subscribe({
      next: data => (this.voucherSerials = data),
      error: () => {},
    });
  }

  onDocTypeChange(selected: { VTypeNo: number } | null): void {
    this.docTypeMode     = selected ? 'specific' : 'all';
    this.vTypeMode       = 'all';
    this.vTypeSpecific   = null;
    const vTypeNo        = selected?.VTypeNo ?? undefined;
    this.loadVoucherSerials(vTypeNo);
  }

  private loadAccounts(): void {
    this.coaSvc.getAll().subscribe({
      next: data => (this.accounts = data),
      error: () => {},
    });
  }

  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    const t = term.toLowerCase();
    return (item.name?.toLowerCase().includes(t) ?? false)
        || (item.Ename?.toLowerCase().includes(t) ?? false)
        || item.no.toString().includes(t);
  }

  search(): void {
    this.loading = true;
    this.groups  = [];
    this.hasResults = false;

    const filter: JvReportFilterDto = {
      FilterMode:  this.filterMode,
      DateFrom:    this.filterMode === 'Date'   ? this.dateFrom   : null,
      DateTo:      this.filterMode === 'Date'   ? this.dateTo     : null,
      DocNumFrom:  this.filterMode === 'DocNum' ? this.docNumFrom : null,
      DocNumTo:    this.filterMode === 'DocNum' ? this.docNumTo   : null,
      VType:       this.vTypeMode   === 'specific' ? this.vTypeSpecific   : null,
      DocType:     this.docTypeMode === 'specific' ? this.docTypeSpecific : null,
      PostStatus:  this.postStatus,
      OrderBy:     this.orderBy,
      SearchDes:   this.searchDes.trim() || null,
      AccNo:       this.accNo,
      AmtFrom:     this.amtFrom,
      AmtTo:       this.amtTo,
    };

    this.reportSvc.getReport(filter).subscribe({
      next: rows => {
        this.buildGroups(rows);
        this.loading = false;
        this.hasResults = true;
        if (rows.length === 0) {
          this.toastr.info(this.translate.instant('General.NoDataFound'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  /** Clear stale results whenever a filter value changes. */
  onFilterChange(): void {
    this.hasResults  = false;
    this.groups      = [];
    this.grandDebit  = 0;
    this.grandCredit = 0;
  }

  private buildGroups(rows: JvReportLineDto[]): void {
    const map = new Map<number, VoucherGroup>();

    // Hide lines where both Debit and Credit are effectively zero
    if (this.hideSmallMovements) {
      rows = rows.filter(r => r.Debit !== 0 || r.Credit !== 0);
    }

    for (const row of rows) {
      if (!map.has(row.TransNum)) {
        map.set(row.TransNum, {
          transNum:    row.TransNum,
          docNum:      row.DocNum,
          date:        row.Date,
          serialName:  row.SerialName,
          lines:       [],
          totalDebit:  0,
          totalCredit: 0,
        });
      }
      const g = map.get(row.TransNum)!;
      g.lines.push(row);
      g.totalDebit  += row.Debit;
      g.totalCredit += row.Credit;
    }

    this.groups = Array.from(map.values());
    this.grandDebit  = this.groups.reduce((s, g) => s + g.totalDebit,  0);
    this.grandCredit = this.groups.reduce((s, g) => s + g.totalCredit, 0);
  }

  clearFilters(): void {
    this.filterMode  = 'Date';
    this.dateFrom    = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
    this.dateTo      = this.toDateStr(new Date());
    this.docNumFrom      = null;
    this.docNumTo        = null;
    this.vTypeMode       = 'all';
    this.vTypeSpecific   = null;
    this.docTypeMode     = 'all';
    this.docTypeSpecific = null;
    this.hideSmallMovements = false;
    this.loadVoucherSerials();
    this.postStatus      = null;
    this.orderBy     = 'DocNum';
    this.searchDes   = '';
    this.accNo       = null;
    this.amtFrom     = null;
    this.amtTo       = null;
    this.groups      = [];
    this.hasResults  = false;
  }

  print(): void {
    if (!this.hasResults || this.groups.length === 0) return;

    const t = (k: string) => this.translate.instant(k);
    const dec = this.cs.decimals ?? 2;
    const fmt = (n: number) => n.toFixed(dec);

    const cols = [
      { label: t('JournalVoucher.DocNum')     },
      { label: t('JournalVoucher.Date')        },
      { label: t('JvReport.SerialName')        },
      { label: t('JournalVoucher.Account')     },
      { label: t('JournalVoucher.AccName')     },
      { label: t('JournalVoucher.Description') },
      { label: t('JournalVoucher.Debit')       },
      { label: t('JournalVoucher.Credit')      },
    ];

    const rows = this.groups.map(g => {
      const lineRows = g.lines.map((l, i) => `
        <tr>
          ${i === 0 ? `<td rowspan="${g.lines.length}" style="vertical-align:middle;font-weight:600">${g.docNum}</td>
                       <td rowspan="${g.lines.length}" style="vertical-align:middle">${g.date}</td>
                       <td rowspan="${g.lines.length}" style="vertical-align:middle;font-size:11px">${g.serialName}</td>` : ''}
          <td>${l.AccNo || ''}</td>
          <td>${l.AccName}</td>
          <td>${l.Des}</td>
          <td style="text-align:end">${l.Debit  > 0 ? fmt(l.Debit)  : ''}</td>
          <td style="text-align:end">${l.Credit > 0 ? fmt(l.Credit) : ''}</td>
        </tr>`).join('');

      const subtotalRow = `
        <tr style="background:#f0f7ff;font-weight:600">
          <td colspan="6" style="text-align:end">${t('JvReport.Subtotal')}</td>
          <td style="text-align:end">${fmt(g.totalDebit)}</td>
          <td style="text-align:end">${fmt(g.totalCredit)}</td>
        </tr>`;

      return lineRows + subtotalRow;
    }).join('');

    const totalRow = `
      <tr style="background:#dbeafe;font-weight:700;font-size:13px">
        <td colspan="6" style="text-align:end">${t('JvReport.GrandTotal')}</td>
        <td style="text-align:end">${fmt(this.grandDebit)}</td>
        <td style="text-align:end">${fmt(this.grandCredit)}</td>
      </tr>`;

    const filtersHtml = this.buildFiltersHtml(t);

    this.reportPrint.printReport(t('JvReport.Title'), cols, rows + totalRow, filtersHtml);
  }

  private buildFiltersHtml(t: (k: string) => string): string {
    const parts: string[] = [];

    if (this.filterMode === 'Date') {
      if (this.dateFrom) parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>`);
      if (this.dateTo)   parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>`);
    } else {
      if (this.docNumFrom != null) parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.DocNumFrom')}:</span><span class="filter-value">${this.docNumFrom}</span></div>`);
      if (this.docNumTo   != null) parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.DocNumTo')}:</span><span class="filter-value">${this.docNumTo}</span></div>`);
    }

    if (this.vTypeMode === 'specific' && this.vTypeSpecific != null)
      parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.VType')}:</span><span class="filter-value">${this.vTypeSpecific}</span></div>`);

    if (this.docTypeMode === 'specific' && this.docTypeSpecific != null) {
      const dtLabel = this.voucherTypes.find(v => v.VTypeNo === this.docTypeSpecific);
      if (dtLabel) parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.DocType')}:</span><span class="filter-value">${this.isAr ? dtLabel.TName : dtLabel.TEName}</span></div>`);
    }

    if (this.hideSmallMovements)
      parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.HideSmall')}:</span><span class="filter-value">✓</span></div>`);

    const ps = this.postStatusOptions.find(o => o.value === this.postStatus);
    if (ps) parts.push(`<div class="filter-item"><span class="filter-label">${t('JvReport.PostStatus')}:</span><span class="filter-value">${t(ps.label)}</span></div>`);

    if (this.searchDes) parts.push(`<div class="filter-item"><span class="filter-label">${t('JournalVoucher.Description')}:</span><span class="filter-value">${this.searchDes}</span></div>`);
    if (this.accNo)     parts.push(`<div class="filter-item"><span class="filter-label">${t('JournalVoucher.Account')}:</span><span class="filter-value">${this.accNo}</span></div>`);

    return parts.join('');
  }
}
