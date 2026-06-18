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
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  ChequeDepositService,
  ChequeDepositListItemDto,
  ChequeDepositLineDto,
  SaveChequeDepositRequest,
  SaveChequeDepositLine,
  AvailableChequeDto,
} from '../../../shared/services/cheque-deposit.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ReportService } from '../../../shared/services/report.service';

export interface DepositLine {
  cheqNum: string;
  amt: number;
  draw: string;
  vhrNo: string;
  date1: string;
  custAcc: number | null;
  custAccName: string;
  bankNum: number | null;
  bankName: string;
}

// DepositType = inchecks.DocType values (from VB6 doctype list)
const DT_OBTAINED    = 7;   // ايداع - محصل على البنك
const DT_OUTSTANDING = 6;   // ايداع - برسم التحصيل
const DT_CASH        = 8;   // ايداع - نقدي

@Component({
  selector: 'app-cheque-deposit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    MatPaginatorModule,
    HasPermissionDirective,
    RouterModule,
  ],
  providers: [NgbModalConfig, NgbModal, FlatpickrDefaults],
  templateUrl: './cheque-deposit.component.html',
  styleUrl: './cheque-deposit.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChequeDepositComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  readonly DT_OBTAINED    = DT_OBTAINED;
  readonly DT_OUTSTANDING = DT_OUTSTANDING;
  readonly DT_CASH        = DT_CASH;

  // ─── Header ─────────────────────────────────────────────────
  docNum = 0;
  private _loadedDocNum = 0;
  myYear = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType = 1;
  brNo = 0;
  date = this.today();
  depositType = DT_OBTAINED;
  debitAcc: number | null = null;
  debitAccName = '';
  creditAcc: number | null = null;
  creditAccName = '';
  curNo = 1;
  rate = 1;
  cashAmt = 0;  // used only for cash deposit
  userName = '';

  // ─── Lines ──────────────────────────────────────────────────
  lines: DepositLine[] = [];
  lineHasDuplicate: boolean[] = [];

  get totalAmt(): number {
    if (this.depositType === DT_CASH) return this.cashAmt;
    return this.lines.reduce((s, l) => s + (l.amt || 0), 0);
  }
  get numFmt(): string { const d = this.cs.decimals; return `1.${d}-${d}`; }
  get hasAnyDuplicate(): boolean { return this.lineHasDuplicate.some(v => v); }
  get isCash(): boolean { return this.depositType === DT_CASH; }
  get filteredVoucherSerials(): VoucherSerial[] {
    return this.voucherSerials.filter(s => s.VtypeNo === this.depositType);
  }

  updateDuplicates(): void {
    const keys = this.lines.map(l =>
      (l.cheqNum && l.bankNum != null) ? `${l.cheqNum}|${l.bankNum}` : null
    );
    this.lineHasDuplicate = keys.map((k, i) =>
      k !== null && keys.some((k2, j) => j !== i && k2 === k)
    );
  }

  // ─── Lookups ────────────────────────────────────────────────
  leafAccounts: ChartOfAccountDto[] = [];
  currencies: CurrencyDto[] = [];
  voucherSerials: VoucherSerial[] = [];
  docNums: number[] = [];

  // ─── Available cheques for dropdown ─────────────────────────
  availableCheques: AvailableChequeDto[] = [];

  // ─── Navigation ─────────────────────────────────────────────
  navMin = 0;
  navMax = 0;

  // ─── List ───────────────────────────────────────────────────
  displayedColumns = ['DocNum', 'Date', 'DepositType', 'LineCount', 'Total', 'Actions'];
  dataSource = new MatTableDataSource<ChequeDepositListItemDto>([]);
  allListData: ChequeDepositListItemDto[] = [];
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  // ─── Row expand ─────────────────────────────────────────────
  expandedRowKey: string | null = null;
  rowLinesCache = new Map<string, ChequeDepositLineDto[]>();
  expandLoadingKey: string | null = null;

  private rowKey(row: ChequeDepositListItemDto): string {
    return `${row.DocNum}|${row.VType}|${row.MyYear}|${row.DepositType}`;
  }
  toggleRowExpand(row: ChequeDepositListItemDto): void {
    const key = this.rowKey(row);
    if (this.expandedRowKey === key) { this.expandedRowKey = null; return; }
    this.expandedRowKey = key;
    if (!this.rowLinesCache.has(key)) {
      this.expandLoadingKey = key;
      this.depositService.getVoucher(row.DocNum, row.MyYear, row.VType, row.DepositType).subscribe({
        next: v => {
          this.rowLinesCache.set(key, v.Lines);
          if (this.expandLoadingKey === key) this.expandLoadingKey = null;
        },
        error: () => { if (this.expandLoadingKey === key) this.expandLoadingKey = null; },
      });
    }
  }
  isRowExpanded(row: ChequeDepositListItemDto): boolean { return this.expandedRowKey === this.rowKey(row); }
  isRowLoading(row: ChequeDepositListItemDto): boolean { return this.expandLoadingKey === this.rowKey(row); }
  getExpandedLines(row: ChequeDepositListItemDto): ChequeDepositLineDto[] {
    return this.rowLinesCache.get(this.rowKey(row)) ?? [];
  }

  depositTypeOptions = [
    { value: DT_OBTAINED,    labelKey: 'ChequeDeposit.DtObtained'    },
    { value: DT_OUTSTANDING, labelKey: 'ChequeDeposit.DtOutstanding'  },
    { value: DT_CASH,        labelKey: 'ChequeDeposit.DtCash'         },
  ];

  listDepositTypeOptions = [
    { value: 0,              labelKey: 'General.All'                  },
    ...this.depositTypeOptions,
  ];
  listDepositType = 0;

  // ─── Tabs & State ────────────────────────────────────────────
  activeTab = 'form';
  loading = false;
  saving = false;
  saveAttempted = false;
  modalRef!: NgbModalRef;

  dateOptions: object = this.buildDateOptions(this.myYear);

  private buildDateOptions(year: number): object {
    return {
      dateFormat: 'Y-m-d',
      allowInput: true,
      altInput: true,
      altFormat: 'd/m/Y',
      locale: { firstDayOfWeek: 6 },
      minDate: `${year}-01-01`,
      maxDate: `${year}-12-31`,
    };
  }

  constructor(
    private translate: TranslateService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private authService: AuthService,
    private depositService: ChequeDepositService,
    private coaService: ChartOfAccountsService,
    private currencyService: CurrencyService,
    private voucherSerialService: VoucherSerialService,
    public cs: CompanySettingsService,
    private reportService: ReportService,
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
        const parentNos = new Set(d.map(a => a.belong).filter((b): b is number => b != null));
        this.leafAccounts = d.filter(a => !parentNos.has(a.no));
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
    forkJoin([
      this.voucherSerialService.getAll(6),
      this.voucherSerialService.getAll(7),
      this.voucherSerialService.getAll(8),
    ]).subscribe({
      next: ([d6, d7, d8]) => {
        this.voucherSerials = [...d6, ...d7, ...d8];
        const first = this.filteredVoucherSerials[0];
        if (first) { this.vType = first.VSerialNo; this.brNo = first.BR_No; }
      },
      error: () => {}
    });
    this.depositService.getAvailableCheques().subscribe({
      next: d => { this.availableCheques = d; },
      error: () => {}
    });
  }

  get selectedSerialName(): string {
    return this.voucherSerials.find(s => s.VSerialNo === this.vType)?.SName ?? '';
  }

  loadDocNums(): void {
    this.depositService.getList(this.myYear, this.vType, this.depositType, 1, 9999).subscribe({
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
    this.depositService.getNextDocNum(this.myYear, this.vType, this.depositType).subscribe({
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
    this.docNum         = docNum;
    this._loadedDocNum  = docNum;
    this.date           = this.dateForYear(this.myYear);
    this.debitAcc       = null;
    this.debitAccName   = '';
    this.creditAcc      = null;
    this.creditAccName  = '';
    this.cashAmt        = 0;
    this.lines          = [];
    this._loadedYear = this.myYear;
    if (!this.isCash) this.addLine();
  }

  loadNavigation(): void {
    this.depositService.getNavigation(this.myYear, this.vType, this.depositType).subscribe({
      next: nav => { this.navMin = nav.MinDocNum; this.navMax = nav.MaxDocNum; },
      error: () => {},
    });
    this.loadDocNums();
  }

  // ─── Load voucher ───────────────────────────────────────────
  loadVoucher(docNum: number): void {
    this.loading = true;
    this.depositService.getVoucher(docNum, this.myYear, this.vType, this.depositType).subscribe({
      next: v => {
        const h = v.Header;
        this.docNum             = h.DocNum;
        this._loadedDocNum      = h.DocNum;
        this.date               = h.Date.substring(0, 10);
        this.depositType = h.DepositType;
        this.debitAcc           = h.DebitAcc;
        this.debitAccName       = h.DebitAccName ?? '';
        this.creditAcc          = h.CreditAcc;
        this.creditAccName      = h.CreditAccName ?? '';
        this.curNo              = h.CurNo;
        this.rate               = h.Rate;
        this.cashAmt            = h.VouchAmt;
        this.brNo               = h.BrNo;
        this._loadedYear        = h.MyYear;
        this.myYear             = h.MyYear;
        this.dateOptions        = this.buildDateOptions(h.MyYear);
        this.vType              = h.VType;

        this.lines = v.Lines.map(l => ({
          cheqNum:     l.CheqNum    ?? '',
          amt:         l.Amt,
          draw:        l.Draw       ?? '',
          vhrNo:       l.VhrNo      ?? '',
          date1:       l.Date1?.substring(0, 10) ?? '',
          custAcc:     l.CustAcc,
          custAccName: l.CustAccName ?? '',
          bankNum:     l.BankNum,
          bankName:    l.BankName   ?? '',
        }));
        if (!this.isCash && !this.lines.length) this.addLine();

        // Ensure loaded cheques appear in the dropdown even if already deposited
        const knownNums = new Set(this.availableCheques.map(c => c.CheqNum));
        for (const l of this.lines) {
          if (l.cheqNum && !knownNums.has(l.cheqNum)) {
            this.availableCheques = [...this.availableCheques, {
              CheqNum: l.cheqNum, Amt: l.amt, Draw: l.draw, VhrNo: l.vhrNo,
              Date1: l.date1, CustAcc: l.custAcc, CustAccName: l.custAccName,
              BankNum: l.bankNum, BankName: l.bankName,
            } as AvailableChequeDto];
            knownNums.add(l.cheqNum);
          }
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.lines = [];
        this._loadedDocNum = 0;
        this._loadedYear = 0;
        if (!this.isCash) this.addLine();
      },
    });
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
      this.dateOptions = this.buildDateOptions(this.myYear);
      if (this.activeTab === 'form') this.initNewVoucher();
      else this.loadList();
    }
  }

  onVTypeChange(): void {
    const serial = this.voucherSerials.find(s => s.VSerialNo === this.vType);
    if (serial) this.brNo = serial.BR_No;
    this.initNewVoucher();
  }

  onDepositTypeChange(): void {
    const filtered = this.filteredVoucherSerials;
    if (filtered.length) { this.vType = filtered[0].VSerialNo; this.brNo = filtered[0].BR_No; }
    this.lines = [];
    this.lineHasDuplicate = [];
    this.initNewVoucher();
  }

  onCurrencySelected(c: CurrencyDto | null): void {
    if (c) this.rate = c.lrate ?? 1;
  }

  onDebitAccSelected(acc: ChartOfAccountDto | null): void {
    this.debitAcc     = acc?.no ?? null;
    this.debitAccName = acc?.name ?? '';
  }

  onCreditAccSelected(acc: ChartOfAccountDto | null): void {
    this.creditAcc     = acc?.no ?? null;
    this.creditAccName = acc?.name ?? '';
  }

  // ─── Navigation ─────────────────────────────────────────────
  goFirst(): void { if (this.navMin) this.loadVoucher(this.navMin); }
  goLast():  void { if (this.navMax) this.loadVoucher(this.navMax); }

  goPrev(): void {
    this.depositService.getAdjacentDocNum(this.docNum, this.myYear, this.vType, this.depositType, 'PREV').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('ChequeDeposit.FirstVoucher'), ''),
    });
  }

  goNext(): void {
    this.depositService.getAdjacentDocNum(this.docNum, this.myYear, this.vType, this.depositType, 'NEXT').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('ChequeDeposit.LastVoucher'), ''),
    });
  }

  // ─── Line management ────────────────────────────────────────
  addLine(): void {
    this.lines.push({
      cheqNum: '', amt: 0, draw: '', vhrNo: '',
      date1: this.today(), custAcc: null, custAccName: '', bankNum: null, bankName: '',
    });
    this.updateDuplicates();
  }

  removeLine(i: number): void {
    if (this.lines.length > 1) { this.lines.splice(i, 1); this.updateDuplicates(); }
  }

  // ─── Cheque dropdown selection ───────────────────────────────
  onChequeSelected(i: number, cheqNum: string | null): void {
    if (!cheqNum) { this.clearLine(i); return; }
    const cheq = this.availableCheques.find(c => c.CheqNum === cheqNum);
    if (cheq) this.fillLineFromCheque(i, cheq);
  }

  fillLineFromCheque(i: number, cheq: AvailableChequeDto): void {
    const line       = this.lines[i];
    line.cheqNum     = cheq.CheqNum    ?? '';
    line.amt         = cheq.Amt;
    line.draw        = cheq.Draw       ?? '';
    line.vhrNo       = cheq.VhrNo      ?? '';
    line.date1       = cheq.Date1?.substring(0, 10) ?? '';
    line.custAcc     = cheq.CustAcc;
    line.custAccName = cheq.CustAccName ?? '';
    line.bankNum     = cheq.BankNum;
    line.bankName    = cheq.BankName   ?? '';
    this.updateDuplicates();
  }

  clearLine(i: number): void {
    this.lines[i] = {
      cheqNum: '', amt: 0, draw: '', vhrNo: '',
      date1: '', custAcc: null, custAccName: '', bankNum: null, bankName: '',
    };
    this.updateDuplicates();
  }

  // ─── Save ────────────────────────────────────────────────────
  save(): void {
    this.saveAttempted = true;
    if (!this.validateForm()) return;

    const req: SaveChequeDepositRequest = {
      DocNum:      this.docNum,
      VType:       this.vType,
      MyYear:      this.myYear,
      BrNo:        this.brNo,
      Date:        this.date,
      DepositType: this.depositType,
      DebitAcc:    this.debitAcc!,
      CreditAcc:   this.creditAcc!,
      CurNo:       this.curNo,
      Rate:        this.rate,
      VouchAmt:    this.isCash ? this.cashAmt : this.totalAmt,
      UserName:    this.userName,
      Lines:       this.isCash ? [] : this.lines
        .filter(l => l.cheqNum && l.amt > 0)
        .map<SaveChequeDepositLine>(l => ({
          CheqNum: l.cheqNum,
          Amt:     l.amt,
          Draw:    l.draw,
          BankNum: l.bankNum ?? 0,
          Date1:   l.date1,
          CustAcc: l.custAcc ?? 0,
          VhrNo:   l.vhrNo,
        })),
    };

    this.saving = true;
    this.depositService.save(req).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('ChequeDeposit.SavedSuccessfully', { docNum: result.DocNum }),
          this.translate.instant('General.Success')
        );
        this.saving = false;
        this.initNewVoucher();
      },
      error: () => { this.saving = false; },
    });
  }

  private validateForm(): boolean {
    if (this.rate < 0) {
      this.toastr.warning(
        this.translate.instant('ChequeDeposit.RateNegative'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (this.date) {
      const y = parseInt(this.date.substring(0, 4), 10);
      if (y !== this.myYear) {
        this.toastr.warning(
          this.translate.instant('ChequeDeposit.DateOutOfYear', { year: this.myYear }),
          this.translate.instant('General.ValidationError')
        );
        return false;
      }
    }
    if (!this.debitAcc) {
      this.toastr.warning(
        this.translate.instant('ChequeDeposit.DebitAccRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (!this.creditAcc) {
      this.toastr.warning(
        this.translate.instant('ChequeDeposit.CreditAccRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (this.isCash) {
      if (!(this.cashAmt > 0)) {
        this.toastr.warning(
          this.translate.instant('ChequeDeposit.AmtRequired'),
          this.translate.instant('General.ValidationError')
        );
        return false;
      }
      return true;
    }
    const validLines = this.lines.filter(l => l.cheqNum && l.amt > 0);
    if (validLines.length === 0) {
      this.toastr.warning(
        this.translate.instant('ChequeDeposit.LinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    const keys = validLines.map(l => `${l.cheqNum}|${l.bankNum ?? ''}`);
    if (keys.find((k, i) => keys.indexOf(k) !== i)) {
      this.toastr.warning(
        this.translate.instant('ChequeDeposit.DuplicateCheq'),
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
    this.depositService.delete(this.docNum, this.myYear, this.vType, this.depositType).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('ChequeDeposit.DeletedSuccessfully'),
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
    this.depositService.getList(
      this.myYear, this.vType, this.listDepositType, this.pageIndex + 1, this.pageSize
    ).subscribe({
      next: res => {
        this.allListData      = res.Items;
        this.totalItems       = res.TotalCount;
        this.dataSource.data  = res.Items;
        this.loading          = false;
      },
      error: () => {
        this.allListData = []; this.dataSource.data = []; this.totalItems = 0; this.loading = false;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
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

  openVoucherFromList(item: ChequeDepositListItemDto): void {
    this.activeTab   = 'form';
    this.myYear      = item.MyYear;
    this.vType       = item.VType;
    this.depositType = item.DepositType;
    this.loadVoucher(item.DocNum);
  }

  // ─── Print ───────────────────────────────────────────────────
  printVoucher(): void {
    if (!this.docNum) return;
    const dec = this.cs.decimals;
    const fmt = (n: number) => n.toFixed(dec);
    const title = this.translate.instant('ChequeDeposit.Title');

    const fi = (label: string, value: string) =>
      `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${value}</span></div>`;

    const filtersHtml = [
      fi(this.translate.instant('ChequeDeposit.DocNum'),     String(this.docNum)),
      fi(this.translate.instant('ChequeDeposit.Year'),       String(this.myYear)),
      fi(this.translate.instant('ChequeDeposit.Date'),       this.date),
      fi(this.translate.instant('ChequeDeposit.DepositType'),this.getDtLabel(this.depositType)),
      fi(this.translate.instant('ChequeDeposit.DebitAcc'),   `${this.debitAcc || ''} — ${this.debitAccName}`),
      fi(this.translate.instant('ChequeDeposit.CreditAcc'),  `${this.creditAcc || ''} — ${this.creditAccName}`),
    ].join('');

    if (this.isCash) {
      const cols = [{ label: this.translate.instant('ChequeDeposit.Amount') }];
      const rows = `<tr><td style="text-align:center;font-weight:700">${fmt(this.cashAmt)}</td></tr>`;
      this.reportService.printReport(title, cols, rows, filtersHtml);
      return;
    }

    const cols = [
      { label: this.translate.instant('ChequeDeposit.CheqNum') },
      { label: this.translate.instant('ChequeDeposit.Amt') },
      { label: this.translate.instant('ChequeDeposit.Draw') },
      { label: this.translate.instant('ChequeDeposit.VhrNo') },
      { label: this.translate.instant('ChequeDeposit.Date1') },
      { label: this.translate.instant('ChequeDeposit.BankNum') },
      { label: this.translate.instant('ChequeDeposit.Bank') },
    ];

    const dataRows = this.lines.filter(l => l.cheqNum && l.amt > 0).map(l =>
      `<tr>
        <td style="text-align:center">${l.cheqNum}</td>
        <td style="text-align:center">${fmt(l.amt)}</td>
        <td style="text-align:center">${l.draw || '—'}</td>
        <td style="text-align:center">${l.vhrNo || '—'}</td>
        <td style="text-align:center">${l.date1 || '—'}</td>
        <td style="text-align:center">${l.bankNum ?? '—'}</td>
        <td style="text-align:center">${l.bankName || '—'}</td>
      </tr>`).join('');

    const rows = dataRows +
      `<tr>
        <td colspan="1" style="text-align:center;font-weight:700">${this.translate.instant('General.Total')}</td>
        <td style="text-align:center;font-weight:700">${fmt(this.totalAmt)}</td>
        <td colspan="5"></td>
      </tr>`;

    this.reportService.printReport(title, cols, rows, filtersHtml);
  }

  // ─── Lookup helpers ─────────────────────────────────────────
  chequeSearchFn(term: string, item: AvailableChequeDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.CheqNum?.toLowerCase().includes(term) ?? false)
        || (item.Draw?.toLowerCase().includes(term) ?? false);
  }

  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.name?.toLowerCase().includes(term) ?? false) || item.no.toString().includes(term);
  }

  getDtLabel(dt: number): string {
    return this.translate.instant(
      this.depositTypeOptions.find(o => o.value === dt)?.labelKey ?? ''
    );
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onDateChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.date = this.today();
  }

  private dateForYear(year: number): string {
    const today = new Date();
    if (today.getFullYear() === year) return this.today();
    return `${year}-01-01`;
  }

  private compare(a: any, b: any, asc: boolean): number {
    return (a < b ? -1 : 1) * (asc ? 1 : -1);
  }
}
