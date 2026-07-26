import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule, FlatpickrDefaults } from 'angularx-flatpickr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService, ReportFormat } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import {
  AccDetailedStatementService,
  AccDetailedStmtFilterDto,
  AccDetailedStmtLineDto,
  AccDetailedStmtItemDto,
  AccDetailedStmtCheckDto,
} from '../../../shared/services/acc-detailed-statement.service';

interface AgingResult {
  b0_30:    number;
  b31_60:   number;
  b61_90:   number;
  b91_120:  number;
  bOver120: number;
}

interface AccGroup {
  accNo:             number;
  accName:           string;
  accEName:          string;
  begBal:            number;
  lines:             AccDetailedStmtLineDto[];
  totalDebit:        number;
  totalCredit:       number;
  finalBal:          number;
  checks:            AccDetailedStmtCheckDto[];
  aging:             AgingResult;
  collectedCheqAmt:  number;
  deferredCheqAmt:   number;
}

@Component({
  selector: 'app-acc-detailed-statement',
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
  templateUrl: './acc-detailed-statement.component.html',
  styleUrl:    './acc-detailed-statement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccDetailedStatementComponent implements OnInit {

  loading    = false;
  hasResults = false;

  // ── Filters ────────────────────────────────────────────────────────────
  dateFrom   = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo     = this.toDateStr(new Date());
  accNoFrom: number | null = null;
  accNoTo:   number | null = null;
  postStatus:  number | null = null;
  orderBy: 'Date' | 'DocNum' | 'DocType' = 'Date';
  curNo        = 1;

  // ── Checkboxes ────────────────────────────────────────────────────────
  showEquivAmt    = false;  // اظهار الشيكات – show transaction-currency column
  showItemDetails = false;  // تفصيلي حسب المواد
  printDetails    = false;  // طباعة التفاصيل

  // ── Lookups ────────────────────────────────────────────────────────────
  accounts:   ChartOfAccountDto[] = [];
  currencies: CurrencyDto[]       = [];

  postStatusOptions = [
    { value: null, label: 'JvReport.All'      },
    { value: 1,    label: 'JvReport.Posted'    },
    { value: 0,    label: 'JvReport.NotPosted' },
  ];

  orderByOptions = [
    { value: 'Date',    label: 'JournalVoucher.Date'            },
    { value: 'DocNum',  label: 'JvReport.OrderDocNum'           },
    { value: 'DocType', label: 'AccDetailedStatement.ByDocType' },
  ];

  // ── Results ────────────────────────────────────────────────────────────
  groups:        AccGroup[] = [];
  grandBegBal    = 0;
  grandDebit     = 0;
  grandCredit    = 0;
  grandFinalBal  = 0;

  get grandCollectedCheqAmt(): number {
    return this.groups.reduce((s, g) => s + g.collectedCheqAmt, 0);
  }
  get grandDeferredCheqAmt(): number {
    return this.groups.reduce((s, g) => s + g.deferredCheqAmt, 0);
  }
  get balanceInWords(): string {
    return this.numberToArabicWords(this.grandFinalBal);
  }

  readonly dateOptions = {
    dateFormat: 'Y-m-d',
    allowInput: true,
    altInput:   true,
    altFormat:  'd/m/Y',
    locale: { firstDayOfWeek: 6 },
  };

  constructor(
    private svc:         AccDetailedStatementService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
    private coaSvc:      ChartOfAccountsService,
    private currSvc:     CurrencyService,
    public  cs:          CompanySettingsService,
    private route:       ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.coaSvc.getAll().subscribe({ next: d => (this.accounts   = d), error: () => {} });
    this.currSvc.getAll().subscribe({ next: d => (this.currencies = d), error: () => {} });
    this.applyQueryParams();
  }

  /** Pre-fill filters from a deep-link (e.g. from the account ledger) and auto-run. */
  private applyQueryParams(): void {
    const qp = this.route.snapshot.queryParamMap;
    const accNo = qp.get('accNo');
    if (!accNo) return;

    const acc = Number(accNo);
    if (!Number.isNaN(acc)) {
      this.accNoFrom = acc;
      this.accNoTo   = acc;
    }
    const df = qp.get('dateFrom');
    const dt = qp.get('dateTo');
    if (df) this.dateFrom = df;
    if (dt) this.dateTo   = dt;

    if (this.accNoFrom) this.search();
  }

  get numFmt(): string {
    const d = this.cs.decimals ?? 2;
    return `1.${d}-${d}`;
  }

  get isAr(): boolean {
    return this.translate.currentLang === 'ar';
  }

  get selectedCurrency(): CurrencyDto | undefined {
    return this.currencies.find(c => c.cur_no === this.curNo);
  }

  get selectedCurLabel(): string {
    const c = this.selectedCurrency;
    if (!c) return '';
    return this.isAr ? c.cur : (c.ename || c.cur);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  /** Fiscal year for a statement line — used by the deep-link to its voucher. */
  vYear(dateStr: string): number {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    const t = term.toLowerCase();
    return (item.name?.toLowerCase().includes(t)  ?? false)
        || (item.Ename?.toLowerCase().includes(t) ?? false)
        || item.no.toString().includes(t);
  }

  currencySearchFn(term: string, item: CurrencyDto): boolean {
    const t = term.toLowerCase();
    return item.cur_no.toString().includes(t)
        || (item.cur?.toLowerCase().includes(t)   ?? false)
        || (item.ename?.toLowerCase().includes(t) ?? false);
  }

  search(): void {
    if (!this.accNoFrom) {
      this.toastr.warning(this.translate.instant('AccDetailedStatement.AccFromRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('AccBelong.DateError'));
      return;
    }

    this.loading    = true;
    this.groups     = [];
    this.hasResults = false;

    const filter: AccDetailedStmtFilterDto = {
      DateFrom:   this.dateFrom,
      DateTo:     this.dateTo,
      AccNoFrom:  this.accNoFrom,
      AccNoTo:    this.accNoTo ?? null,
      PostStatus: this.postStatus,
      OrderBy:    this.orderBy,
      CurNo:      this.curNo,
      ShowItems:  this.showItemDetails,
      ShowChecks: this.showEquivAmt || this.printDetails,
    };

    this.svc.getReport(filter).subscribe({
      next: result => {
        this.buildGroups(result.lines, result.checks ?? []);
        this.loading    = false;
        this.hasResults = true;
        if (result.lines.length === 0) {
          this.toastr.info(this.translate.instant('General.NoDataFound'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  /** Clear fetched results when any filter changes so stale data isn't shown. */
  onFilterChange(): void {
    this.hasResults    = false;
    this.groups        = [];
    this.grandBegBal   = 0;
    this.grandDebit    = 0;
    this.grandCredit   = 0;
    this.grandFinalBal = 0;
  }

  private buildGroups(rows: AccDetailedStmtLineDto[], checks: AccDetailedStmtCheckDto[]): void {
    const map = new Map<number, AccGroup>();

    for (const row of rows) {
      if (!map.has(row.AccNo)) {
        map.set(row.AccNo, {
          accNo:            row.AccNo,
          accName:          row.AccName,
          accEName:         row.AccEName,
          begBal:           row.BegBal,
          lines:            [],
          totalDebit:       0,
          totalCredit:      0,
          finalBal:         row.BegBal,
          checks:           [],
          aging:            { b0_30: 0, b31_60: 0, b61_90: 0, b91_120: 0, bOver120: 0 },
          collectedCheqAmt: 0,
          deferredCheqAmt:  0,
        });
      }
      const g = map.get(row.AccNo)!;
      if (row.HasTrans) {
        g.lines.push(row);
        g.totalDebit  += row.Debit;
        g.totalCredit += row.Credit;
        g.finalBal    += row.Debit - row.Credit;
      }
    }

    for (const chk of checks) {
      const g = map.get(chk.AccNo);
      if (g) g.checks.push(chk);
    }

    const MS_PER_DAY = 86_400_000;
    const dateToMs   = new Date(this.dateTo).getTime();

    for (const g of map.values()) {
      // ── FIFO aging ────────────────────────────────────────────────────
      type DebitEntry = { dateMs: number; remaining: number };
      const debits: DebitEntry[] = [];

      if (g.begBal > 0) {
        // pre-period debit balance → treat as oldest (>120 days)
        debits.push({ dateMs: new Date(this.dateFrom).getTime() - 366 * MS_PER_DAY, remaining: g.begBal });
      }

      const sorted = [...g.lines].sort((a, b) => a.Date.localeCompare(b.Date));
      for (const ln of sorted) {
        if (ln.Debit > 0) debits.push({ dateMs: new Date(ln.Date).getTime(), remaining: ln.Debit });
      }

      let creditPool = g.begBal < 0 ? -g.begBal : 0;
      for (const ln of g.lines) creditPool += ln.Credit;

      for (const d of debits) {
        if (creditPool < 0.001) break;
        const applied = Math.min(d.remaining, creditPool);
        d.remaining  -= applied;
        creditPool   -= applied;
      }

      const aging: AgingResult = { b0_30: 0, b31_60: 0, b61_90: 0, b91_120: 0, bOver120: 0 };
      for (const d of debits) {
        if (d.remaining < 0.001) continue;
        const days = Math.floor((dateToMs - d.dateMs) / MS_PER_DAY) + 1;
        if      (days <= 30)  aging.b0_30    += d.remaining;
        else if (days <= 60)  aging.b31_60   += d.remaining;
        else if (days <= 90)  aging.b61_90   += d.remaining;
        else if (days <= 120) aging.b91_120  += d.remaining;
        else                  aging.bOver120 += d.remaining;
      }
      g.aging = aging;

      // ── Cheque totals ──────────────────────────────────────────────────
      g.collectedCheqAmt = g.checks.filter(c => c.Status === 3).reduce((s, c) => s + c.Amt, 0);
      g.deferredCheqAmt  = g.checks.filter(c => c.Status !== 3).reduce((s, c) => s + c.Amt, 0);
    }

    this.groups        = Array.from(map.values());
    this.grandBegBal   = this.groups.reduce((s, g) => s + g.begBal,      0);
    this.grandDebit    = this.groups.reduce((s, g) => s + g.totalDebit,  0);
    this.grandCredit   = this.groups.reduce((s, g) => s + g.totalCredit, 0);
    this.grandFinalBal = this.groups.reduce((s, g) => s + g.finalBal,    0);
  }

  runningBalance(group: AccGroup, upToIndex: number): number {
    let bal = group.begBal;
    for (let i = 0; i <= upToIndex; i++) {
      bal += group.lines[i].Debit - group.lines[i].Credit;
    }
    return bal;
  }

  private numberToArabicWords(n: number): string {
    const dec = this.cs.decimals ?? 2;
    const absN = Math.abs(n);
    const intPart = Math.floor(absN);
    const decPart = Math.round((absN - intPart) * Math.pow(10, dec));
    const cur = this.selectedCurrency;
    const curName = cur ? (this.isAr ? cur.cur : (cur.ename || cur.cur)) : '';
    const intWords = this.intToArabicWords(intPart);
    if (decPart > 0) {
      return `${curName} و ${decPart} لا غير فقط ${intWords}`;
    }
    return `${curName} فقط ${intWords} لا غير`;
  }

  private intToArabicWords(n: number): string {
    if (n === 0) return 'صفر';
    const ones = [
      '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
      'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
      'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
    ];
    const tens     = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const convert = (num: number): string => {
      if (num === 0) return '';
      if (num < 20)  return ones[num];
      if (num < 100) {
        const t = tens[Math.floor(num / 10)];
        const o = num % 10;
        return o > 0 ? `${ones[o]} و ${t}` : t;
      }
      if (num < 1_000) {
        const h    = Math.floor(num / 100);
        const rest = num % 100;
        return rest > 0 ? `${hundreds[h]} و ${convert(rest)}` : hundreds[h];
      }
      if (num < 1_000_000) {
        const th   = Math.floor(num / 1000);
        const rest = num % 1000;
        let thWord: string;
        if (th === 1)      thWord = 'ألف';
        else if (th === 2) thWord = 'ألفان';
        else if (th <= 10) thWord = `${ones[th]} آلاف`;
        else               thWord = `${convert(th)} ألف`;
        return rest > 0 ? `${thWord} و ${convert(rest)}` : thWord;
      }
      if (num < 1_000_000_000) {
        const mil  = Math.floor(num / 1_000_000);
        const rest = num % 1_000_000;
        let milWord: string;
        if (mil === 1)      milWord = 'مليون';
        else if (mil === 2) milWord = 'مليونان';
        else if (mil <= 10) milWord = `${ones[mil]} ملايين`;
        else                milWord = `${convert(mil)} مليون`;
        return rest > 0 ? `${milWord} و ${convert(rest)}` : milWord;
      }
      const bil  = Math.floor(num / 1_000_000_000);
      const rest = num % 1_000_000_000;
      let bilWord: string;
      if (bil === 1)      bilWord = 'مليار';
      else if (bil === 2) bilWord = 'ملياران';
      else                bilWord = `${convert(bil)} مليار`;
      return rest > 0 ? `${bilWord} و ${convert(rest)}` : bilWord;
    };

    return convert(n);
  }

  clearFilters(): void {
    this.dateFrom        = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
    this.dateTo          = this.toDateStr(new Date());
    this.accNoFrom       = null;
    this.accNoTo         = null;
    this.postStatus      = null;
    this.orderBy         = 'Date';
    this.curNo           = 1;
    this.showEquivAmt    = false;
    this.showItemDetails = false;
    this.printDetails    = false;
    this.groups          = [];
    this.hasResults      = false;
  }

  print(format: ReportFormat = 'print'): void {
    if (!this.hasResults || this.groups.length === 0) return;

    const t      = (k: string) => this.translate.instant(k);
    const dec    = this.cs.decimals ?? 2;
    const fmt    = (n: number) => (n === 0 ? '' : n.toFixed(dec));
    const fmtBal = (n: number) =>
      n >= 0
        ? n.toFixed(dec) + (this.isAr ? ' م' : ' D')
        : (-n).toFixed(dec) + (this.isAr ? ' د' : ' C');

    const cols = [
      { label: t('AccDetailedStatement.DocNum')     },
      { label: t('AccDetailedStatement.SerialName') },
      { label: t('JournalVoucher.Date')              },
      { label: t('JournalVoucher.Description')       },
      { label: t('AccDetailedStatement.BegBal')      },
      { label: t('JournalVoucher.Debit')             },
      { label: t('JournalVoucher.Credit')            },
      { label: t('AccDetailedStatement.Balance')     },
    ];
    const span = cols.length; // always 8

    const rows = this.groups.map(g => {
      // ── Account header ────────────────────────────────────────────────
      const accHdr = `
        <tr style="background:#e8f0fe;font-weight:700">
          <td colspan="${span}">${g.accNo} — ${this.isAr ? g.accName : (g.accEName || g.accName)}</td>
        </tr>`;

      // ── Transaction rows + optional items sub-table per row ───────────
      let runBal  = g.begBal;
      let isFirst = true;
      const lineRows = g.lines.map(l => {
        runBal += l.Debit - l.Credit;
        const begBalCell = isFirst
          ? `<td style="text-align:end;font-weight:600">${fmtBal(g.begBal)}</td>`
          : `<td></td>`;
        isFirst = false;
        const mainRow = `<tr>
          <td>${l.DocNum || ''}</td>
          <td style="font-size:11px">${l.SerialName}</td>
          <td>${l.Date}</td>
          <td>${l.Des}</td>
          ${begBalCell}
          <td style="text-align:end">${fmt(l.Debit)}</td>
          <td style="text-align:end">${fmt(l.Credit)}</td>
          <td style="text-align:end;font-weight:600">${fmtBal(runBal)}</td>
        </tr>`;

        let itemSubRow = '';
        if (this.showItemDetails && l.Items && l.Items.length > 0) {
          const itemBodyRows = l.Items.map(i => `<tr>
            <td>${i.ItemCode}</td><td>${i.ItemName}</td>
            <td style="text-align:end">${i.Qty.toFixed(dec)}</td>
            <td style="text-align:end">${i.Bonus.toFixed(dec)}</td>
            <td style="text-align:end">${i.Price.toFixed(dec)}</td>
            <td style="text-align:end">${i.Disc.toFixed(dec)}</td>
            <td style="text-align:end">${i.Tax.toFixed(dec)}</td>
            <td style="text-align:end;font-weight:600">${i.Total.toFixed(dec)}</td>
          </tr>`).join('');
          itemSubRow = `<tr><td colspan="${span}" style="padding:0">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead><tr style="background:#e0e7ff;-webkit-print-color-adjust:exact;print-color-adjust:exact">
                <th>${t('AccDetailedStatement.ItemCode')}</th>
                <th>${t('AccDetailedStatement.ItemName')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.Qty')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.Bonus')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.Price')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.Disc')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.Tax')}</th>
                <th style="text-align:end">${t('AccDetailedStatement.ItemTotal')}</th>
              </tr></thead>
              <tbody>${itemBodyRows}</tbody>
            </table>
          </td></tr>`;
        }
        return mainRow + itemSubRow;
      }).join('');

      // ── Subtotal row ──────────────────────────────────────────────────
      const totRow = `
        <tr style="background:#f0f7ff;font-weight:600">
          <td colspan="${span - 4}" style="text-align:end">${t('JvReport.Subtotal')}</td>
          <td style="text-align:end">${fmtBal(g.begBal)}</td>
          <td style="text-align:end">${g.totalDebit.toFixed(dec)}</td>
          <td style="text-align:end">${g.totalCredit.toFixed(dec)}</td>
          <td style="text-align:end">${fmtBal(g.finalBal)}</td>
        </tr>`;

      // ── Cheques sub-table (اظهار الشيكات) ────────────────────────────
      let checksRow = '';
      if (this.showEquivAmt && g.checks && g.checks.length > 0) {
        const chkBodyRows = g.checks.map(c => `<tr>
          <td style="font-weight:600">${c.CheqNum}</td>
          <td>${c.CheqDate}</td><td>${c.BankName}</td>
          <td style="text-align:end;font-weight:600">${c.Amt.toFixed(dec)}</td>
          <td>${c.Draw}</td><td>${c.CollectDate}</td><td>${c.DocNum}</td>
        </tr>`).join('');
        checksRow = `<tr><td colspan="${span}" style="padding:0">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#fef9c3;-webkit-print-color-adjust:exact;print-color-adjust:exact">
              <th>${t('AccDetailedStatement.CheqNum')}</th>
              <th>${t('AccDetailedStatement.CheqDate')}</th>
              <th>${t('AccDetailedStatement.BankName')}</th>
              <th style="text-align:end">${t('AccDetailedStatement.CheqAmt')}</th>
              <th>${t('AccDetailedStatement.Draw')}</th>
              <th>${t('AccDetailedStatement.CollectDate')}</th>
              <th>${t('AccDetailedStatement.CollectDocNum')}</th>
            </tr></thead>
            <tbody>${chkBodyRows}</tbody>
          </table>
        </td></tr>`;
      }

      // ── Aging + cheques summary (طباعة التفاصيل) ─────────────────────
      let agingRow = '';
      if (this.printDetails) {
        const a = g.aging;
        agingRow = `<tr><td colspan="${span}" style="padding:0">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#dcfce7;-webkit-print-color-adjust:exact;print-color-adjust:exact">
              <th style="text-align:end">${t('AccDetailedStatement.Aging0_30')}</th>
              <th style="text-align:end">${t('AccDetailedStatement.Aging31_60')}</th>
              <th style="text-align:end">${t('AccDetailedStatement.Aging61_90')}</th>
              <th style="text-align:end">${t('AccDetailedStatement.Aging91_120')}</th>
              <th style="text-align:end">${t('AccDetailedStatement.AgingOver120')}</th>
            </tr></thead>
            <tbody><tr>
              <td style="text-align:end;font-weight:600">${a.b0_30    > 0 ? a.b0_30.toFixed(dec)    : ''}</td>
              <td style="text-align:end;font-weight:600">${a.b31_60   > 0 ? a.b31_60.toFixed(dec)   : ''}</td>
              <td style="text-align:end;font-weight:600">${a.b61_90   > 0 ? a.b61_90.toFixed(dec)   : ''}</td>
              <td style="text-align:end;font-weight:600">${a.b91_120  > 0 ? a.b91_120.toFixed(dec)  : ''}</td>
              <td style="text-align:end;font-weight:600">${a.bOver120 > 0 ? a.bOver120.toFixed(dec) : ''}</td>
            </tr></tbody>
          </table>
          <div style="padding:5px 10px;font-size:11px;display:flex;gap:24px;border-top:1px dashed #bbf7d0">
            <span>${t('AccDetailedStatement.CollectedCheques')}: <strong>${g.collectedCheqAmt.toFixed(dec)}</strong></span>
            <span>${t('AccDetailedStatement.DeferredCheques')}: <strong>${g.deferredCheqAmt.toFixed(dec)}</strong></span>
          </div>
        </td></tr>`;
      }

      return accHdr + lineRows + totRow + checksRow + agingRow;
    }).join('');

    const grandRow = `
      <tr style="background:#dbeafe;font-weight:700;font-size:13px">
        <td colspan="${span - 4}" style="text-align:end">${t('JvReport.GrandTotal')}</td>
        <td style="text-align:end">${fmtBal(this.grandBegBal)}</td>
        <td style="text-align:end">${this.grandDebit.toFixed(dec)}</td>
        <td style="text-align:end">${this.grandCredit.toFixed(dec)}</td>
        <td style="text-align:end">${fmtBal(this.grandFinalBal)}</td>
      </tr>`;

    const filtersHtml = this.buildFiltersHtml(t);
    const footerHtml  = this.buildFooterHtml(t, dec);
    this.reportPrint.output(format, t('AccDetailedStatement.Title'), cols, rows + grandRow, filtersHtml, footerHtml);
  }

  private buildFiltersHtml(t: (k: string) => string): string {
    const fi = (label: string, val: string | number) =>
      `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val}</span></div>`;

    const parts: string[] = [];
    parts.push(fi(t('AccDetailedStatement.Currency'), `${this.curNo} — ${this.selectedCurLabel}`));
    parts.push(fi(t('JvReport.DateFrom'), this.dateFrom));
    parts.push(fi(t('JvReport.DateTo'),   this.dateTo));

    if (this.accNoFrom) {
      const a = this.accounts.find(x => x.no === this.accNoFrom);
      parts.push(fi(t('AccDetailedStatement.AccFrom'),
        `${this.accNoFrom}${a ? ' — ' + (this.isAr ? a.name : (a.Ename || a.name)) : ''}`));
    }
    if (this.accNoTo) {
      const a = this.accounts.find(x => x.no === this.accNoTo);
      parts.push(fi(t('AccDetailedStatement.AccTo'),
        `${this.accNoTo}${a ? ' — ' + (this.isAr ? a.name : (a.Ename || a.name)) : ''}`));
    }

    const ps = this.postStatusOptions.find(o => o.value === this.postStatus);
    if (ps) parts.push(fi(t('JvReport.PostStatus'), t(ps.label)));

    return parts.join('');
  }

  private buildFooterHtml(t: (k: string) => string, dec: number): string {
    const collected = this.grandCollectedCheqAmt.toFixed(dec);
    const deferred  = this.grandDeferredCheqAmt.toFixed(dec);
    const balWords  = this.numberToArabicWords(this.grandFinalBal);

    return `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #94a3b8;margin-bottom:8px">
        <span>${t('AccDetailedStatement.DeferredCheques')}: <strong>${deferred}</strong></span>
        <span>${t('AccDetailedStatement.CollectedCheques')}: <strong>${collected}</strong></span>
      </div>
      <div style="display:flex;align-items:baseline;gap:16px;padding:8px 0;border-bottom:1px dashed #94a3b8;margin-bottom:8px">
        <strong style="white-space:nowrap;min-width:110px">${t('AccDetailedStatement.RequiredBalance')}</strong>
        <span style="font-style:italic">${balWords}</span>
      </div>
      <div style="text-align:center;font-style:italic;color:#64748b;padding:6px 0">
        ${t('AccDetailedStatement.StatementDisclaimer')}
      </div>`;
  }
}
