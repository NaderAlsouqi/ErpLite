import {
  Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AuthService } from '../../../shared/services/auth.service';
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FlatpickrModule, FlatpickrDefaults } from 'angularx-flatpickr';
import { MatTableDataSource } from '@angular/material/table';
import { Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

import {
  IncomingCheq1Service,
  IncomingCheq1ListItemDto,
  IncomingCheq1LineDto,
  SaveIncomingCheq1Request,
  SaveIncomingCheq1Line,
} from '../../../shared/services/incoming-cheq1.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { BankService, BankDto } from '../../../shared/services/bank.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';

export interface CheqLine {
  cheqNum: string;
  date1: string;
  bankNum: number | null;
  bankName: string;
  amt: number;
  custAcc: number | null;
  custAccName: string;
  draw: string;
}

@Component({
  selector: 'app-incoming-cheq1',
  standalone: true,
  imports: [
    ReportExportComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    MatPaginatorModule,
    HasPermissionDirective,
  ],
  providers: [NgbModalConfig, NgbModal, FlatpickrDefaults],
  templateUrl: './incoming-cheq1.component.html',
  styleUrl: './incoming-cheq1.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class IncomingCheq1Component implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  // ─── Header ─────────────────────────────────────────────────
  docNum = 0;
  private _loadedDocNum = 0;
  myYear = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType = 1;
  brNo = 0;
  date = this.today();
  accNo: number | null = null;
  accName = '';
  curNo = 1;
  rate = 1;
  sts = 0;
  userName = '';

  // ─── Lines ──────────────────────────────────────────────────
  lines: CheqLine[] = [];
  lineHasDuplicate: boolean[] = [];

  get totalAmt(): number { return this.lines.reduce((s, l) => s + (l.amt || 0), 0); }
  get numFmt(): string { const d = this.cs.decimals; return `1.${d}-${d}`; }
  get hasAnyDuplicate(): boolean { return this.lineHasDuplicate.some(v => v); }

  updateDuplicates(): void {
    const keys = this.lines.map(l =>
      (l.cheqNum && l.bankNum) ? `${String(l.cheqNum)}|${l.bankNum}` : null
    );
    this.lineHasDuplicate = keys.map((k, i) =>
      k !== null && keys.some((k2, j) => j !== i && k2 === k)
    );
  }

  // ─── Lookups ────────────────────────────────────────────────
  accounts: ChartOfAccountDto[] = [];
  leafAccounts: ChartOfAccountDto[] = [];
  currencies: CurrencyDto[] = [];
  banks: BankDto[] = [];
  voucherSerials: VoucherSerial[] = [];
  docNums: number[] = [];

  // ─── Navigation ─────────────────────────────────────────────
  navMin = 0;
  navMax = 0;

  // ─── Status options ──────────────────────────────────────────
  statusOptions = [
    { value: 0, labelKey: 'IncomingCheq1.StsInBox' },
    { value: 1, labelKey: 'IncomingCheq1.StsCollection' },
    { value: 3, labelKey: 'IncomingCheq1.StsReturned' },
  ];

  // ─── List ───────────────────────────────────────────────────
  displayedColumns = ['DocNum', 'Date', 'Sts', 'LineCount', 'Total', 'Actions'];
  dataSource = new MatTableDataSource<IncomingCheq1ListItemDto>([]);
  allListData: IncomingCheq1ListItemDto[] = [];
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  // ─── Row expand ─────────────────────────────────────────────
  expandedRowKey: string | null = null;
  rowLinesCache = new Map<string, IncomingCheq1LineDto[]>();
  expandLoadingKey: string | null = null;

  private rowKey(row: IncomingCheq1ListItemDto): string {
    return `${row.DocNum}|${row.VType}|${row.MyYear}`;
  }
  toggleRowExpand(row: IncomingCheq1ListItemDto): void {
    const key = this.rowKey(row);
    if (this.expandedRowKey === key) { this.expandedRowKey = null; return; }
    this.expandedRowKey = key;
    if (!this.rowLinesCache.has(key)) {
      this.expandLoadingKey = key;
      this.cheq1Service.getVoucher(row.DocNum, row.MyYear, row.VType).subscribe({
        next: v => {
          this.rowLinesCache.set(key, v.Lines);
          if (this.expandLoadingKey === key) this.expandLoadingKey = null;
        },
        error: () => { if (this.expandLoadingKey === key) this.expandLoadingKey = null; },
      });
    }
  }
  isRowExpanded(row: IncomingCheq1ListItemDto): boolean { return this.expandedRowKey === this.rowKey(row); }
  isRowLoading(row: IncomingCheq1ListItemDto): boolean { return this.expandLoadingKey === this.rowKey(row); }
  getExpandedLines(row: IncomingCheq1ListItemDto): IncomingCheq1LineDto[] {
    return this.rowLinesCache.get(this.rowKey(row)) ?? [];
  }

  // ─── Tabs & State ────────────────────────────────────────────
  activeTab = 'form';
  loading = false;
  saving = false;
  saveAttempted = false;
  modalRef!: NgbModalRef;

  dateOptions = {
    dateFormat: 'Y-m-d',
    allowInput: true,
    altInput: true,
    altFormat: 'd/m/Y',
    locale: { firstDayOfWeek: 6 },
  };

  constructor(
    private translate: TranslateService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private authService: AuthService,
    private cheq1Service: IncomingCheq1Service,
    private coaService: ChartOfAccountsService,
    private currencyService: CurrencyService,
    private bankService: BankService,
    private voucherSerialService: VoucherSerialService,
    public cs: CompanySettingsService,
    public reportService: ReportService,
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) this.userName = user.DeliveryName ?? '';
    this.loadLookups();
    this.initNewVoucher();
  }

  // ─── Lookups ────────────────────────────────────────────────
  loadLookups(): void {
    this.coaService.getAll().subscribe({
      next: d => {
        this.accounts = d;
        const parentNos = new Set(d.map(a => a.belong).filter((b): b is number => b != null));
        this.leafAccounts = d.filter(a => !parentNos.has(a.no));
        // auto-select first account if the form was already reset before accounts arrived
        if (this.accNo === null && this.leafAccounts.length > 0) {
          this.accNo = this.leafAccounts[0].no;
          this.accName = this.leafAccounts[0].name ?? '';
        }
      },
      error: () => {}
    });
    this.currencyService.getAll().subscribe({
      next: d => {
        this.currencies = d;
        if (d.length > 0) { this.curNo = d[0].cur_no; this.rate = d[0].lrate ?? 1; }
      },
      error: () => {}
    });
    this.bankService.getAll().subscribe({ next: d => this.banks = d, error: () => {} });
    this.voucherSerialService.getAll(5).subscribe({
      next: d => {
        this.voucherSerials = d;
        if (d.length) { this.vType = d[0].VSerialNo; this.brNo = d[0].BR_No; }
      },
      error: () => {}
    });
  }

  get selectedSerialName(): string {
    return this.voucherSerials.find(s => s.VSerialNo === this.vType)?.SName ?? '';
  }

  get stsLabel(): string {
    return this.statusOptions.find(o => o.value === this.sts)?.labelKey ?? '';
  }

  loadDocNums(): void {
    this.cheq1Service.getList(this.myYear, this.vType, 1, 9999).subscribe({
      next: res => {
        const nums = [...new Set((res.Items || []).map(i => i.DocNum))].sort((a, b) => a - b);
        if (this.docNum > 0 && !nums.includes(this.docNum)) {
          nums.push(this.docNum); nums.sort((a, b) => a - b);
        }
        this.docNums = nums;
      },
      error: () => { this.docNums = []; }
    });
  }

  // ─── New voucher ────────────────────────────────────────────
  initNewVoucher(): void {
    this.loading = true;
    this.cheq1Service.getNextDocNum(this.myYear, this.vType).subscribe({
      next: res => {
        this._loadedYear = this.myYear;
        this.resetForm(res.NextDocNum);
        this.loadNavigation();
        this.loading = false;
      },
      error: () => { this.resetForm(1); this.loading = false; },
    });
  }

  resetForm(docNum: number): void {
    this.saveAttempted = false;
    if (!this.docNums.includes(docNum)) {
      this.docNums = [...this.docNums, docNum].sort((a, b) => a - b);
    }
    this.docNum = docNum;
    this._loadedDocNum = docNum;
    this.date = this.today();
    // auto-select first account (accounts may already be loaded on subsequent resets)
    this.accNo   = this.leafAccounts.length > 0 ? this.leafAccounts[0].no : null;
    this.accName = this.leafAccounts.length > 0 ? (this.leafAccounts[0].name ?? '') : '';
    this.sts = 0;
    this.lines = [];
    this._loadedYear = this.myYear;
    this.addLine();
  }

  loadNavigation(): void {
    this.cheq1Service.getNavigation(this.myYear, this.vType).subscribe({
      next: nav => { this.navMin = nav.MinDocNum; this.navMax = nav.MaxDocNum; },
      error: () => {},
    });
    this.loadDocNums();
  }

  // ─── Load voucher ───────────────────────────────────────────
  loadVoucher(docNum: number): void {
    this.loading = true;
    this.cheq1Service.getVoucher(docNum, this.myYear, this.vType).subscribe({
      next: v => {
        const h = v.Header;
        this.docNum        = h.DocNum;
        this._loadedDocNum = h.DocNum;
        this.date          = h.Date.substring(0, 10);
        this.accNo         = h.AccNo;
        this.accName       = h.AccName ?? '';
        this.curNo         = h.CurNo;
        this.rate          = h.Rate;
        this.sts           = h.Sts;
        this.brNo          = h.BrNo;
        this._loadedYear   = h.MyYear;
        this.myYear        = h.MyYear;
        this.vType         = h.VType;

        this.lines = v.Lines.map(l => ({
          cheqNum:     l.CheqNum ?? '',
          date1:       l.Date1?.substring(0, 10) ?? '',
          bankNum:     l.BankNum,
          bankName:    l.BankName ?? '',
          amt:         l.Amt,
          custAcc:     l.CustAcc,
          custAccName: l.CustAccName ?? '',
          draw:        l.Draw ?? '',
        }));
        if (!this.lines.length) this.addLine();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.lines = [];
        this._loadedDocNum = 0;
        this._loadedYear = 0;
        this.addLine();
      },
    });
  }

  onDocNumSelected(value: number | null): void {
    if (!value) return;
    this.docNum = value;
    if (!this.docNums.includes(value)) this.docNums = [...this.docNums, value].sort((a, b) => a - b);
    if (value !== this._loadedDocNum) this.loadVoucher(value);
  }

  onDocNumChange(): void {
    const max = this.navMax + 1;
    if (!this.docNum || this.docNum < 1 || this.docNum > max) {
      this.docNum = max; return;
    }
    if (this.docNum !== this._loadedDocNum) this.loadVoucher(this.docNum);
  }

  onYearChange(): void {
    this.myYear = Math.min(Math.max(this.myYear, 1900), this.currentYear);
    if (this.myYear >= 1000 && this.myYear <= 9999 && this.myYear !== this._loadedYear) {
      if (this.activeTab === 'form') this.initNewVoucher();
      else this.loadList();
    }
  }

  onVTypeChange(): void {
    const serial = this.voucherSerials.find(s => s.VSerialNo === this.vType);
    if (serial) this.brNo = serial.BR_No;
    this.initNewVoucher();
  }

  onCurrencySelected(c: CurrencyDto | null): void {
    if (c) this.rate = c.lrate ?? 1;
  }

  onMainAccountSelected(acc: ChartOfAccountDto | null): void {
    if (acc) { this.accNo = acc.no; this.accName = acc.name ?? ''; }
    else { this.accNo = null; this.accName = ''; }
  }

  // ─── Navigation ─────────────────────────────────────────────
  goFirst(): void { if (this.navMin) this.loadVoucher(this.navMin); }
  goLast():  void { if (this.navMax) this.loadVoucher(this.navMax); }

  goPrev(): void {
    this.cheq1Service.getAdjacentDocNum(this.docNum, this.myYear, this.vType, 'PREV').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('IncomingCheq1.FirstVoucher'), ''),
    });
  }

  goNext(): void {
    this.cheq1Service.getAdjacentDocNum(this.docNum, this.myYear, this.vType, 'NEXT').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('IncomingCheq1.LastVoucher'), ''),
    });
  }

  // ─── Line management ────────────────────────────────────────
  addLine(): void {
    this.lines.push({ cheqNum: '', date1: this.today(), bankNum: null, bankName: '', amt: 0, custAcc: null, custAccName: '', draw: '' });
    this.updateDuplicates();
  }

  removeLine(i: number): void {
    if (this.lines.length > 1) { this.lines.splice(i, 1); this.updateDuplicates(); }
  }

  onBankSelected(i: number, bank: BankDto | null): void {
    if (bank) { this.lines[i].bankNum = bank.bank_num; this.lines[i].bankName = bank.Bank; }
    this.updateDuplicates();
  }

  onCustAccSelected(i: number, acc: ChartOfAccountDto | null): void {
    if (acc) {
      this.lines[i].custAcc     = acc.no;
      this.lines[i].custAccName = acc.name ?? '';
      this.lines[i].draw        = acc.name ?? '';
    }
  }

  // ─── Save ────────────────────────────────────────────────────
  save(): void {
    this.saveAttempted = true;
    if (!this.validateForm()) return;

    const validLines = this.lines.filter(l => l.cheqNum && l.amt > 0);

    const req: SaveIncomingCheq1Request = {
      DocNum:   this.docNum,
      VType:    this.vType,
      MyYear:   this.myYear,
      BrNo:     this.brNo,
      Date:     this.date,
      AccNo:    this.accNo!,
      CurNo:    this.curNo,
      Rate:     this.rate,
      Sts:      this.sts,
      UserName: this.userName,
      Lines:    validLines.map<SaveIncomingCheq1Line>(l => ({
        CheqNum: l.cheqNum ? String(l.cheqNum) : undefined,
        Date1:   l.date1,
        BankNum: l.bankNum ?? 0,
        Amt:     l.amt,
        CustAcc: l.custAcc ?? 0,
        Draw:    l.draw,
      })),
    };

    this.saving = true;
    this.cheq1Service.save(req).subscribe({
      next: result => {
        this.cheq1Service.updateStatuses(result.DocNum, this.vType, this.myYear).subscribe();
        this.toastr.success(
          this.translate.instant('IncomingCheq1.SavedSuccessfully', { docNum: result.DocNum }),
          this.translate.instant('General.Success')
        );
        this.saving = false;
        this.initNewVoucher();
      },
      error: () => { this.saving = false; },
    });
  }

  private validateForm(): boolean {
    const validLines = this.lines.filter(l => l.cheqNum && l.amt > 0);

    if (!this.accNo) {
      this.toastr.warning(
        this.translate.instant('IncomingCheq1.AccNoRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (validLines.length === 0) {
      this.toastr.warning(
        this.translate.instant('IncomingCheq1.LinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }

    const keys = validLines.map(l => `${String(l.cheqNum)}|${l.bankNum ?? ''}`);
    const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);
    if (duplicate) {
      this.toastr.warning(
        this.translate.instant('IncomingCheq1.DuplicateCheq'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }

    return true;
  }

  // ─── Delete ─────────────────────────────────────────────────
  confirmDelete(): void {
    if (this.docNum === 0) return;
    this.modalRef = this.modalService.open(this.deleteConfirmModal, {
      centered: true, size: 'sm', backdrop: 'static',
    });
  }

  executeDelete(): void {
    this.modalRef?.close();
    this.loading = true;
    this.cheq1Service.delete(this.docNum, this.myYear, this.vType).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('IncomingCheq1.DeletedSuccessfully'),
          this.translate.instant('General.Success')
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── List / tab ─────────────────────────────────────────────
  switchToList(): void { this.activeTab = 'list'; this.loadList(); }
  switchToForm(): void { this.activeTab = 'form'; }

  loadList(): void {
    this.loading = true;
    this.expandedRowKey = null;
    this.rowLinesCache.clear();
    this.cheq1Service.getList(this.myYear, this.vType, this.pageIndex + 1, this.pageSize).subscribe({
      next: res => {
        this.allListData = res.Items;
        this.totalItems = res.TotalCount;
        this.dataSource.data = res.Items;
        this.loading = false;
      },
      error: () => {
        this.allListData = [];
        this.dataSource.data = [];
        this.totalItems = 0;
        this.loading = false;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadList();
  }

  onSortChange(sort: Sort): void {
    const data = [...this.allListData];
    if (!sort.active || !sort.direction) { this.dataSource.data = data; return; }
    this.dataSource.data = data.sort((a, b) => {
      const asc = sort.direction === 'asc';
      switch (sort.active) {
        case 'DocNum': return this.compare(a.DocNum, b.DocNum, asc);
        case 'Date':   return this.compare(new Date(a.Date).getTime(), new Date(b.Date).getTime(), asc);
        case 'Total':  return this.compare(a.Total, b.Total, asc);
        default: return 0;
      }
    });
  }

  openVoucherFromList(item: IncomingCheq1ListItemDto): void {
    this.activeTab = 'form';
    this.myYear = item.MyYear;
    this.vType = item.VType;
    this.loadVoucher(item.DocNum);
  }

  // ─── Print ───────────────────────────────────────────────────
  printVoucher(): void {
    if (!this.docNum) return;

    const dec = this.cs.decimals;
    const fmt = (n: number) => n.toFixed(dec);

    const title = this.translate.instant('IncomingCheq1.Title');

    const cols = [
      { label: this.translate.instant('IncomingCheq1.CheqNum') },
      { label: this.translate.instant('IncomingCheq1.Date1') },
      { label: this.translate.instant('IncomingCheq1.Bank') },
      { label: this.translate.instant('IncomingCheq1.Amt') },
      { label: this.translate.instant('IncomingCheq1.CustAcc') },
      { label: this.translate.instant('IncomingCheq1.Draw') },
    ];

    const fi = (label: string, value: string) =>
      `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${value}</span></div>`;

    const filtersHtml = [
      fi(this.translate.instant('IncomingCheq1.DocNum'),  String(this.docNum)),
      fi(this.translate.instant('IncomingCheq1.Year'),    String(this.myYear)),
      fi(this.translate.instant('IncomingCheq1.Date'),    this.date),
      fi(this.translate.instant('IncomingCheq1.AccNo'),   `${this.accNo || ''} — ${this.accName}`),
      fi(this.translate.instant('IncomingCheq1.Status'),  this.translate.instant(this.stsLabel)),
      fi(this.translate.instant('IncomingCheq1.BrNo'),    String(this.brNo)),
    ].join('');

    const dataRows = this.lines.filter(l => l.cheqNum && l.amt > 0).map(l =>
      `<tr>
        <td style="text-align:center">${l.cheqNum}</td>
        <td style="text-align:center">${l.date1 || '—'}</td>
        <td style="text-align:center">${l.bankName || '—'}</td>
        <td style="text-align:center">${fmt(l.amt)}</td>
        <td style="text-align:center">${l.custAcc ?? '—'}</td>
        <td style="text-align:center">${l.draw || '—'}</td>
      </tr>`).join('');

    const rows = dataRows +
      `<tr>
        <td colspan="3" style="text-align:center;font-weight:700;">${this.translate.instant('General.Total')}</td>
        <td style="text-align:center;font-weight:700;">${fmt(this.totalAmt)}</td>
        <td colspan="2"></td>
      </tr>`;

    this.reportService.printReport(title, cols, rows, filtersHtml);
  }

  // ─── Lookup helpers ─────────────────────────────────────────
  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.name?.toLowerCase().includes(term) ?? false) || item.no.toString().includes(term);
  }

  bankSearchFn(term: string, item: BankDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return item.Bank.toLowerCase().includes(term) || item.bank_num.toString().includes(term);
  }

  getStsLabel(sts: number): string {
    return this.translate.instant(this.statusOptions.find(o => o.value === sts)?.labelKey ?? '');
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onDateChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.date = this.today();
  }

  private compare(a: any, b: any, asc: boolean): number {
    return (a < b ? -1 : 1) * (asc ? 1 : -1);
  }
}
