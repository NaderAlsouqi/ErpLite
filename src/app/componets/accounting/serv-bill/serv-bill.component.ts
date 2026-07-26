import {
  Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { ApproveVoucherComponent } from '../../../shared/components/approve-voucher/approve-voucher.component';
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
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import {
  ServBillService,
  ServBillListItemDto,
  ServBillLineDto,
  SaveServBillRequest,
  SaveServBillLine,
  ServBillGLEntryDto,
} from '../../../shared/services/serv-bill.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { SalesmanService, SalesmanDto } from '../../../shared/services/salesman.service';
import { ClusefService, ClusefDto } from '../../../shared/services/clusef.service';
import { TaxService, TaxDto } from '../../../shared/services/tax.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';

export interface BillLine {
  des:     string;
  qty:     number;
  price:   number;
  accNo:   number | null;
  accName: string;
}

@Component({
  selector: 'app-serv-bill',
  standalone: true,
  imports: [
    ReportExportComponent,
    ApproveVoucherComponent,
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
  templateUrl: './serv-bill.component.html',
  styleUrl: './serv-bill.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ServBillComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  // ─── Header ──────────────────────────────────────────────────
  billNo = 0;
  _loadedBillNo = 0;
  myYear = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType = 1;
  brNo = 1;
  docType = 1;
  date = this.today();
  cusNo: number | null = null;
  cusName = '';
  curNo = 1;
  rate = 1;
  dis = 0;
  taxGroupNo: number | null = null; // الضريبة — parent tax code, stored in billf1_serv.TaxNo
  taxNo: string | null = null; // نوع الضريبة — clusef.no string (may have leading zeros e.g. '011')
  taxPerc = 0;
  taxAcc = 0;
  userName = '';

  // ─── Extended header fields ───────────────────────────────────
  cashPay = 1;
  cashAcc: number | null = null;
  salNo = 0;
  headerDes = '';
  ccntrNo: number | null = null;
  poNumber = '';
  contactP = '';
  delvTerm = '';
  bankName = '';
  bankAcc = '';
  accountName = '';
  ibanNumber = '';
  swiftNo = '';

  // ─── Lines ───────────────────────────────────────────────────
  lines: BillLine[] = [];

  // ─── Totals ──────────────────────────────────────────────────
  get subTotal(): number { return this.lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0); }
  get disAmt(): number   { return this.subTotal * (this.dis || 0) / 100; }
  get taxAmt(): number   { return (this.subTotal - this.disAmt) * (this.taxPerc || 0) / 100; }
  get dTotal(): number   { return this.subTotal - this.disAmt + this.taxAmt; }
  get numFmt(): string   { const d = this.cs.decimals; return `1.${d}-${d}`; }

  lineTotal(l: BillLine): number { return (l.qty || 0) * (l.price || 0); }

  // ─── Lookups ─────────────────────────────────────────────────
  accounts: ChartOfAccountDto[] = [];
  leafAccounts: ChartOfAccountDto[] = [];
  currencies: CurrencyDto[] = [];
  taxes: TaxDto[] = [];
  clusefItems: ClusefDto[] = [];
  voucherSerials: VoucherSerial[] = [];
  costCenters: CostCenterDto[] = [];
  salesmen: SalesmanDto[] = [];

  // ─── Navigation ──────────────────────────────────────────────
  navMin = 0;
  navMax = 0;

  // ─── List ────────────────────────────────────────────────────
  dataSource = new MatTableDataSource<ServBillListItemDto>([]);
  allListData: ServBillListItemDto[] = [];

  // ─── Row expand ──────────────────────────────────────────────
  expandedRowKey: string | null = null;
  rowLinesCache  = new Map<string, ServBillLineDto[]>();
  expandLoadingKey: string | null = null;

  private rowKey(row: ServBillListItemDto): string {
    return `${row.BillNo}|${row.VType}|${row.MyYear}`;
  }
  toggleRowExpand(row: ServBillListItemDto): void {
    const key = this.rowKey(row);
    if (this.expandedRowKey === key) { this.expandedRowKey = null; return; }
    this.expandedRowKey = key;
    if (!this.rowLinesCache.has(key)) {
      this.expandLoadingKey = key;
      this.sbService.getVoucher(row.BillNo, row.MyYear, row.VType).subscribe({
        next: v => {
          this.rowLinesCache.set(key, v.Lines);
          if (this.expandLoadingKey === key) this.expandLoadingKey = null;
        },
        error: () => { if (this.expandLoadingKey === key) this.expandLoadingKey = null; },
      });
    }
  }
  isRowExpanded(row: ServBillListItemDto): boolean { return this.expandedRowKey === this.rowKey(row); }
  isRowLoading(row: ServBillListItemDto): boolean  { return this.expandLoadingKey === this.rowKey(row); }
  getExpandedLines(row: ServBillListItemDto): ServBillLineDto[] {
    return this.rowLinesCache.get(this.rowKey(row)) ?? [];
  }

  // ─── GL entry (القيد) popup ──────────────────────────────────
  glEntryOpen = false;
  glEntryLoading = false;
  glEntry: ServBillGLEntryDto | null = null;
  glEntryBill: ServBillListItemDto | null = null;

  get glTotalDebit():  number { return (this.glEntry?.Lines ?? []).reduce((s, l) => s + (l.Debit  || 0), 0); }
  get glTotalCredit(): number { return (this.glEntry?.Lines ?? []).reduce((s, l) => s + (l.Credit || 0), 0); }

  openGLEntry(row: ServBillListItemDto): void {
    this.glEntryBill = row;
    this.glEntry = null;
    this.glEntryOpen = true;
    this.glEntryLoading = true;
    this.sbService.getGLEntry(row.BillNo, row.MyYear, row.VType).subscribe({
      next: e => { this.glEntry = e; this.glEntryLoading = false; },
      error: () => { this.glEntry = { Header: null, Lines: [] }; this.glEntryLoading = false; },
    });
  }
  closeGLEntry(): void { this.glEntryOpen = false; this.glEntry = null; this.glEntryBill = null; }

  /** عرض المستند — open the bill's GL voucher in the journal page using its ACTUAL
   *  keys (doctype varies per bill / serial config, so we can't hardcode it). */
  openDocument(row: ServBillListItemDto): void {
    this.sbService.getGLEntry(row.BillNo, row.MyYear, row.VType).subscribe({
      next: e => {
        const h = e?.Header;
        if (!h || !h.TransNum) {
          this.toastr.info(this.translate.instant('JournalVoucher.VoucherNotFound'));
          return;
        }
        this.router.navigate(['/accounting/vouchers/journal'], {
          queryParams: { docNum: h.DocNum, year: row.MyYear, vType: h.VType, docType: h.DocType },
        });
      },
      error: () => this.toastr.error(this.translate.instant('General.Error')),
    });
  }

  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  // ─── State ───────────────────────────────────────────────────
  activeTab      = 'form';
  loading        = false;
  saving         = false;
  duplicating    = false;
  saveAttempted  = false;
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
    private sbService: ServBillService,
    private coaService: ChartOfAccountsService,
    private costCenterService: CostCenterService,
    private currencyService: CurrencyService,
    private taxService: TaxService,
    private salesmanService: SalesmanService,
    private clusefService: ClusefService,
    private voucherSerialService: VoucherSerialService,
    public  cs: CompanySettingsService,
    public reportService: ReportService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  private _pendingVType: number | null = null;
  private _pendingBillNo: number | null = null;

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) this.userName = user.DeliveryName ?? '';
    // Capture workflow deep-link; applied after the serials load (async) so the
    // serial-load default doesn't clobber ?vType=. Init runs after serials load.
    const qp = this.route.snapshot.queryParamMap;
    if (qp.has('year')) this.myYear = Number(qp.get('year')) || this.myYear;
    this._pendingVType  = qp.has('vType') ? (Number(qp.get('vType')) || null) : null;
    const bn = Number(qp.get('docNum'));
    this._pendingBillNo = (qp.has('docNum') && bn > 0) ? bn : null;
    this.loadLookups();
  }

  // ─── Lookups ─────────────────────────────────────────────────
  loadLookups(): void {
    this.coaService.getAll().subscribe({
      next: d => {
        this.accounts = d;
        const parentNos = new Set(d.map(a => a.belong).filter((b): b is number => b != null));
        this.leafAccounts = d.filter(a => !parentNos.has(a.no));
      },
      error: () => {},
    });
    this.currencyService.getAll().subscribe({
      next: d => {
        this.currencies = d;
        if (d.length > 0) { this.curNo = d[0].cur_no; this.rate = d[0].lrate ?? 1; }
      },
      error: () => {},
    });
    this.taxService.getAll().subscribe({
      next: d => { this.taxes = d; },
      error: () => {},
    });
    this.voucherSerialService.getAll().subscribe({
      next: d => {
        this.voucherSerials = d.filter(s => s.VtypeNo === 45);
        let chosen = this.voucherSerials[0];
        if (this._pendingVType != null) { const m = this.voucherSerials.find(s => s.VSerialNo === this._pendingVType); if (m) chosen = m; }
        if (chosen) {
          this.vType   = chosen.VSerialNo;
          this.brNo    = chosen.BR_No;
          this.docType = chosen.VtypeNo;
        }
        // serials ready → open the deep-linked bill, else start a new one
        if (this._pendingBillNo != null) { this.billNo = this._pendingBillNo; this.loadVoucher(this._pendingBillNo); }
        else this.initNewVoucher();
        this._pendingVType = null; this._pendingBillNo = null;
      },
      error: () => { this.initNewVoucher(); },
    });
    this.costCenterService.getAll().subscribe({
      next: d => { this.costCenters = d; },
      error: () => {},
    });
    this.salesmanService.getAll().subscribe({
      next: d => { this.salesmen = d; },
      error: () => {},
    });
    this.clusefService.getAll().subscribe({
      next: d => { this.clusefItems = d; },
      error: () => {},
    });
  }

  // ─── New voucher ─────────────────────────────────────────────
  initNewVoucher(): void {
    this.loading = true;
    this.sbService.getNextBillNo(this.myYear, this.vType).subscribe({
      next: res => {
        this._loadedYear = this.myYear;
        this.resetForm(res.NextBillNo);
        this.loadNavigation();
        this.loading = false;
      },
      error: () => { this.resetForm(1); this.loading = false; },
    });
  }

  resetForm(billNo: number): void {
    this.saveAttempted = false;
    this.billNo        = billNo;
    this._loadedBillNo = billNo;
    this.date          = this.today();
    this.cusNo         = null;
    this.cusName       = '';
    this.curNo         = this.currencies.length > 0 ? this.currencies[0].cur_no : 1;
    this.rate          = this.currencies.length > 0 ? (this.currencies[0].lrate ?? 1) : 1;
    this.dis           = 0;
    this.taxGroupNo    = null;
    this.taxNo         = null;
    this.taxPerc       = 0;
    this.taxAcc        = 0;
    this.cashPay       = 1;
    this.cashAcc       = null;
    this.salNo         = 0;
    this.headerDes     = '';
    this.ccntrNo       = null;
    this.poNumber      = '';
    this.contactP      = '';
    this.delvTerm      = '';
    this.bankName      = '';
    this.bankAcc       = '';
    this.accountName   = '';
    this.ibanNumber    = '';
    this.swiftNo       = '';
    this.lines         = [];
    this._loadedYear   = this.myYear;
    this.addLine();
  }

  loadNavigation(): void {
    this.sbService.getNavigation(this.myYear, this.vType).subscribe({
      next: nav => { this.navMin = nav.MinBillNo; this.navMax = nav.MaxBillNo; },
      error: () => {},
    });
  }

  // ─── Load voucher ────────────────────────────────────────────
  loadVoucher(billNo: number): void {
    this.loading = true;
    this.sbService.getVoucher(billNo, this.myYear, this.vType).subscribe({
      next: v => {
        const h = v.Header;
        this.billNo        = h.BillNo;
        this._loadedBillNo = h.BillNo;
        this.date          = h.Date.substring(0, 10);
        this.myYear        = h.MyYear;
        this._loadedYear   = h.MyYear;
        this.vType         = h.VType;
        this.brNo          = h.BrNo;
        this.cusNo         = h.CusNo;
        this.cusName       = h.CusName;
        this.curNo         = h.CurNo;
        this.rate          = h.Rate;
        this.dis           = h.Dis;
        this.taxGroupNo    = h.TaxNo || null;
        this.taxNo         = h.TaxTypeNo || null;
        this.taxPerc       = h.TaxPerc;
        this.userName      = h.UserName;
        this.cashPay       = h.CashPay ?? 1;
        this.cashAcc       = h.CashAcc || null;
        this.salNo         = h.SalNo ?? 0;
        this.headerDes     = h.Des ?? '';
        this.ccntrNo       = h.CcntrNo ? Number(h.CcntrNo) : null;
        this.poNumber      = h.PoNumber ?? '';
        this.contactP      = h.ContactP ?? '';
        this.delvTerm      = h.DelvTerm ?? '';
        this.bankName      = h.BankName ?? '';
        this.bankAcc       = h.BankAcc ?? '';
        this.accountName   = h.AccountName ?? '';
        this.ibanNumber    = h.IbanNumber ?? '';
        this.swiftNo       = h.SwiftNo ?? '';

        const matchingTax = this.taxes.find(t => t.TaxNo === (h.TaxNo || 0));
        this.taxPerc = matchingTax?.TaxPerc ?? h.TaxPerc ?? 0;
        this.taxAcc  = matchingTax?.TaxAcc  ?? 0;

        this.lines = v.Lines.map(l => ({
          des:     l.Des,
          qty:     l.Qty,
          price:   l.Price,
          accNo:   l.AccNo || null,
          accName: l.AccName,
        }));
        if (!this.lines.length) this.addLine();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.lines = [];
        this._loadedBillNo = 0;
        this._loadedYear   = 0;
        this.addLine();
      },
    });
  }

  onBillNoChange(): void {
    const max = this.navMax + 1;
    if (!this.billNo || this.billNo < 1 || this.billNo > max) { this.billNo = max; return; }
    if (this.billNo !== this._loadedBillNo) this.loadVoucher(this.billNo);
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
    if (serial) { this.brNo = serial.BR_No; this.docType = serial.VtypeNo; }
    if (this.activeTab === 'list') { this.loadList(); return; }
    this.initNewVoucher();
  }

  onCurrencySelected(): void {
    const c = this.currencies.find(x => x.cur_no === this.curNo) ?? null;
    if (c) this.rate = c.lrate ?? 1;
  }

  onCustomerSelected(acc: ChartOfAccountDto | null): void {
    if (acc) {
      this.cusNo   = acc.no;
      this.cusName = acc.name ?? this.accounts.find(a => a.no === acc.no)?.name ?? '';
    } else {
      this.cusNo   = null;
      this.cusName = '';
    }
  }

  onClusefSelected(): void {
    // taxNo is already updated by ngModel; no derived fields for clusef items
  }

  onTaxGroupSelected(): void {
    const tax = this.taxes.find(t => t.TaxNo === this.taxGroupNo) ?? null;
    if (tax) {
      this.taxPerc = tax.TaxPerc ?? 0;
      this.taxAcc  = tax.TaxAcc  ?? 0;
    } else {
      this.taxGroupNo = null;
      this.taxPerc    = 0;
      this.taxAcc     = 0;
    }
  }

  onAccountSelected(i: number, acc: ChartOfAccountDto | null): void {
    if (acc) { this.lines[i].accNo = acc.no; this.lines[i].accName = acc.name ?? ''; }
    else     { this.lines[i].accNo = null; this.lines[i].accName = ''; }
  }

  // ─── Navigation ──────────────────────────────────────────────
  goFirst(): void { if (this.navMin) this.loadVoucher(this.navMin); }
  goLast():  void { if (this.navMax) this.loadVoucher(this.navMax); }

  goPrev(): void {
    this.sbService.getAdjacentBillNo(this.billNo, this.myYear, this.vType, 'PREV').subscribe({
      next: r => this.loadVoucher(r.BillNo),
      error: () => this.toastr.info(this.translate.instant('ServBill.FirstVoucher'), ''),
    });
  }

  goNext(): void {
    this.sbService.getAdjacentBillNo(this.billNo, this.myYear, this.vType, 'NEXT').subscribe({
      next: r => this.loadVoucher(r.BillNo),
      error: () => this.toastr.info(this.translate.instant('ServBill.LastVoucher'), ''),
    });
  }

  // ─── Line management ─────────────────────────────────────────
  addLine(): void {
    this.lines.push({ des: '', qty: 1, price: 0, accNo: null, accName: '' });
  }

  removeLine(i: number): void {
    if (this.lines.length > 1) this.lines.splice(i, 1);
  }

  // ─── Save ────────────────────────────────────────────────────
  save(): void {
    this.saveAttempted = true;
    if (!this.validateForm()) return;

    const validLines = this.lines.filter(l => l.des.trim() && l.qty > 0 && l.price >= 0 && l.accNo);

    const req: SaveServBillRequest = {
      BillNo:      this.billNo,
      VType:       this.vType,
      DocType:     this.docType,
      MyYear:      this.myYear,
      Date:        this.date,
      CusNo:       this.cusNo!,
      CusName:     this.cusName,
      CurNo:       this.curNo,
      Rate:        this.rate,
      Dis:         this.dis,
      TaxNo:       this.taxGroupNo ?? 0,
      TaxTypeNo:   this.taxNo ?? '',
      TaxPerc:     this.taxPerc,
      TaxAmt:      this.taxAmt,
      Total:       this.subTotal,
      DTotal:      this.dTotal,
      BrNo:        this.brNo,
      CusAcc:      this.cusNo!,
      TaxAcc:      this.taxAcc,
      UserName:    this.userName,
      CashPay:     this.cashPay,
      CashAcc:     this.cashAcc ?? 0,
      InvType:     0,
      SalNo:       this.salNo,
      Des:         this.headerDes,
      CcntrNo:     this.ccntrNo != null ? String(this.ccntrNo) : '',
      PoNumber:    this.poNumber,
      ContactP:    this.contactP,
      DelvTerm:    this.delvTerm,
      BankName:    this.bankName,
      BankAcc:     this.bankAcc,
      AccountName: this.accountName,
      IbanNumber:  this.ibanNumber,
      SwiftNo:     this.swiftNo,
      Lines:   validLines.map<SaveServBillLine>(l => ({
        Des:   l.des,
        Qty:   l.qty,
        Price: l.price,
        AccNo: l.accNo!,
      })),
    };

    this.saving = true;
    this.sbService.save(req).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('ServBill.SavedSuccessfully', { billNo: result.BillNo }),
          this.translate.instant('General.Success'),
        );
        this.saving = false;
        this.initNewVoucher();
      },
      error: () => { this.saving = false; },
    });
  }

  // ─── Duplicate ───────────────────────────────────────────────
  duplicate(): void {
    this.duplicating = true;
    this.sbService.getNextBillNo(this.myYear, this.vType).subscribe({
      next: res => {
        this.billNo        = res.NextBillNo;
        this._loadedBillNo = 0;
        this.saveAttempted = false;
        this.duplicating   = false;
        this.toastr.info(
          this.translate.instant('ServBill.DuplicatedMsg', { billNo: res.NextBillNo }),
          this.translate.instant('General.Info'),
        );
      },
      error: () => { this.duplicating = false; },
    });
  }

  private validateForm(): boolean {
    if (!this.cusNo) {
      this.toastr.warning(
        this.translate.instant('ServBill.CusNoRequired'),
        this.translate.instant('General.ValidationError'),
      );
      return false;
    }
    const validLines = this.lines.filter(l => l.des.trim() && l.qty > 0 && l.accNo);
    if (validLines.length === 0) {
      this.toastr.warning(
        this.translate.instant('ServBill.LinesRequired'),
        this.translate.instant('General.ValidationError'),
      );
      return false;
    }
    return true;
  }

  // ─── Delete ──────────────────────────────────────────────────
  confirmDelete(): void {
    if (!this.billNo) return;
    this.modalRef = this.modalService.open(this.deleteConfirmModal, {
      centered: true, size: 'sm', backdrop: 'static',
    });
  }

  executeDelete(): void {
    this.modalRef?.close();
    this.loading = true;
    this.sbService.delete(this.billNo, this.myYear, this.vType).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('ServBill.DeletedSuccessfully'),
          this.translate.instant('General.Success'),
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── List ────────────────────────────────────────────────────
  switchToList(): void { this.activeTab = 'list'; this.loadList(); }
  switchToForm(): void { this.activeTab = 'form'; }

  loadList(): void {
    this.loading = true;
    this.expandedRowKey = null;
    this.rowLinesCache.clear();
    this.sbService.getList(this.myYear, this.vType, this.pageIndex + 1, this.pageSize).subscribe({
      next: res => {
        this.allListData   = res.Items;
        this.totalItems    = res.TotalCount;
        this.dataSource.data = res.Items;
        this.loading = false;
      },
      error: () => {
        this.allListData   = [];
        this.dataSource.data = [];
        this.totalItems    = 0;
        this.loading = false;
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
        case 'BillNo':  return this.compare(a.BillNo, b.BillNo, asc);
        case 'Date':    return this.compare(new Date(a.Date).getTime(), new Date(b.Date).getTime(), asc);
        case 'DTotal':  return this.compare(a.DTotal, b.DTotal, asc);
        default: return 0;
      }
    });
  }

  openFromList(item: ServBillListItemDto): void {
    this.activeTab = 'form';
    this.myYear    = item.MyYear;
    this.vType     = item.VType;
    this.loadVoucher(item.BillNo);
  }

  // ─── Print ───────────────────────────────────────────────────
  printVoucher(): void {
    if (!this.billNo) return;
    const dec = this.cs.decimals;
    const fmt = (n: number) => n.toFixed(dec);

    const title = this.translate.instant('ServBill.Title');
    const cols = [
      { label: this.translate.instant('ServBill.Des') },
      { label: this.translate.instant('ServBill.Qty') },
      { label: this.translate.instant('ServBill.Price') },
      { label: this.translate.instant('ServBill.LineTotal') },
      { label: this.translate.instant('ServBill.AccNo') },
    ];

    const fi = (label: string, value: string) =>
      `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${value}</span></div>`;
    const filtersHtml = [
      fi(this.translate.instant('ServBill.BillNo'),  String(this.billNo)),
      fi(this.translate.instant('ServBill.Year'),    String(this.myYear)),
      fi(this.translate.instant('ServBill.Date'),    this.date),
      fi(this.translate.instant('ServBill.CusNo'),   `${this.cusNo ?? ''} — ${this.cusName}`),
    ].join('');

    const rows = this.lines
      .filter(l => l.des.trim() && l.qty > 0)
      .map(l => `<tr>
        <td>${l.des}</td>
        <td style="text-align:center">${fmt(l.qty)}</td>
        <td style="text-align:center">${fmt(l.price)}</td>
        <td style="text-align:center">${fmt(this.lineTotal(l))}</td>
        <td style="text-align:center">${l.accNo ?? '—'} ${l.accName ? '— ' + l.accName : ''}</td>
      </tr>`).join('') +
      `<tr><td colspan="3" style="font-weight:700;text-align:start">${this.translate.instant('ServBill.DTotal')}</td>
       <td style="font-weight:700;text-align:center">${fmt(this.dTotal)}</td><td></td></tr>`;

    this.reportService.printReport(title, cols, rows, filtersHtml);
  }

  // ─── Lookup helpers ──────────────────────────────────────────
  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.name?.toLowerCase().includes(term) ?? false) || item.no.toString().includes(term);
  }

  taxSearchFn(term: string, item: TaxDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.TaxNameA?.toLowerCase().includes(term) ?? false) || item.TaxNo.toString().includes(term);
  }

  clusefSearchFn(term: string, item: ClusefDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.ArabicName?.toLowerCase().includes(term) ?? false)
        || (item.EnglishName?.toLowerCase().includes(term) ?? false)
        || (item.Id?.toString().includes(term) ?? false);
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
