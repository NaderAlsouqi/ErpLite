import {
  Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { ApproveVoucherComponent } from '../../../shared/components/approve-voucher/approve-voucher.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AuthService } from '../../../shared/services/auth.service';
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FlatpickrModule, FlatpickrDefaults } from 'angularx-flatpickr';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { RouterModule } from '@angular/router';

import {
  CashPaymentService,
  CashPaymentListItemDto,
  CashPaymentVoucherDto,
  SaveCashPaymentRequest,
  SaveCashPaymentDebitLine,
  SaveCashPaymentCreditLine,
} from '../../../shared/services/cash-payment.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { SignatureDto, SignatureService } from '../../../shared/services/signature.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';

export interface DebitLine {
  acc: number | null;
  accName: string;
  amt: number;
  des: string;
  ccntrNo: number;
}

export interface CreditLine {
  acc: number | null;
  accName: string;
  amt: number;
  des: string;
  ccntrNo: number;
}

@Component({
  selector: 'app-cash-payment',
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
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CashPaymentComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  // ─── Header ─────────────────────────────────────────────────
  transNum = 0;
  docNum = 0;
  private _loadedDocNum = 0;
  myYear = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType = 1;
  brNo = 0;
  date = this.today();
  curNo = 1;
  rate = 1;
  payFor = '';
  reason = '';
  sigNo = 1;
  userName = '';
  isPosted = false;
  secPay = 0;

  // ─── Lines ──────────────────────────────────────────────────
  debitLines: DebitLine[] = [];
  creditLines: CreditLine[] = [];

  get totalDebit(): number  { return this.debitLines.reduce((s, l) => s + (l.amt || 0), 0); }
  get totalCredit(): number { return this.creditLines.reduce((s, l) => s + (l.amt || 0), 0); }
  get isBalanced(): boolean { return Math.abs(this.totalDebit - this.totalCredit) < 0.001; }
  get numFmt(): string { const d = this.cs.decimals; return `1.${d}-${d}`; }

  // ─── Lookups ────────────────────────────────────────────────
  leafAccounts: ChartOfAccountDto[] = [];
  currencies: CurrencyDto[] = [];
  costCenters: CostCenterDto[] = [];
  stamps: SignatureDto[] = [];
  voucherSerials: VoucherSerial[] = [];
  docNums: number[] = [];

  // ─── Navigation ─────────────────────────────────────────────
  navMin = 0;
  navMax = 0;

  // ─── List ───────────────────────────────────────────────────
  dataSource = new MatTableDataSource<CashPaymentListItemDto>([]);
  allListData: CashPaymentListItemDto[] = [];
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  // ─── Tabs & State ────────────────────────────────────────────
  activeTab = 'form';
  loading = false;
  saving = false;
  saveAttempted = false;
  modalRef!: NgbModalRef;
  pendingDeleteTransNum = 0;

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
    private cpService: CashPaymentService,
    private coaService: ChartOfAccountsService,
    private currencyService: CurrencyService,
    private costCenterService: CostCenterService,
    private signatureService: SignatureService,
    public reportService: ReportService,
    public cs: CompanySettingsService,
    private voucherSerialService: VoucherSerialService,
    private route: ActivatedRoute,
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  private _pendingVType: number | null = null;
  private _pendingDocNum: number | null = null;

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) this.userName = user.DeliveryName ?? '';
    // Capture workflow deep-link; applied once the serials load (async) so the
    // serial-load default doesn't clobber ?vType=. Init runs after serials load.
    const qp = this.route.snapshot.queryParamMap;
    if (qp.has('year')) this.myYear = Number(qp.get('year')) || this.myYear;
    this._pendingVType  = qp.has('vType') ? (Number(qp.get('vType')) || null) : null;
    const dn = Number(qp.get('docNum'));
    this._pendingDocNum = (qp.has('docNum') && dn > 0) ? dn : null;
    this.loadLookups();
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
        if (d.length > 0 && this.transNum === 0) {
          this.curNo = d[0].cur_no;
          this.rate = d[0].lrate ?? 1;
        }
      },
      error: () => {}
    });
    this.costCenterService.getAll().subscribe({ next: d => this.costCenters = d, error: () => {} });
    this.signatureService.getAll().subscribe({
      next: d => { this.stamps = d; if (d.length) this.sigNo = d[0].SigNo; },
      error: () => {}
    });
    this.voucherSerialService.getAll(4).subscribe({
      next: d => {
        this.voucherSerials = d;
        if (!this.transNum && d.length) {
          let chosen = d[0];
          if (this._pendingVType != null) { const m = d.find(s => s.VSerialNo === this._pendingVType); if (m) chosen = m; }
          this.vType = chosen.VSerialNo; this.brNo = chosen.BR_No;
        }
        // serials ready → open the deep-linked voucher, else start a new one
        if (this._pendingDocNum != null) { this.docNum = this._pendingDocNum; this.loadVoucher(this._pendingDocNum); }
        else this.initNewVoucher();
        this._pendingVType = null; this._pendingDocNum = null;
      },
      error: () => { this.initNewVoucher(); }
    });
  }

  get selectedSerialName(): string {
    return this.voucherSerials.find(s => s.VSerialNo === this.vType)?.SName ?? '';
  }

  loadDocNums(): void {
    const currentDocNum = this.docNum;
    this.cpService.getList(this.myYear, this.vType, 1, 9999).subscribe({
      next: res => {
        const nums = [...new Set((res.Items || []).map(i => i.DocNum))].sort((a, b) => a - b);
        if (currentDocNum > 0 && !nums.includes(currentDocNum)) {
          nums.push(currentDocNum); nums.sort((a, b) => a - b);
        }
        this.docNums = nums;
      },
      error: () => { this.docNums = []; }
    });
  }

  // ─── New voucher ─────────────────────────────────────────────
  initNewVoucher(): void {
    this.loading = true;
    this.cpService.getNextDocNum(this.myYear, this.vType).subscribe({
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
    this.transNum = 0;
    this.docNum = docNum;
    this._loadedDocNum = docNum;
    this.date = this.today();
    this.payFor = '';
    this.reason = '';
    this.sigNo = this.stamps.length ? this.stamps[0].SigNo : 1;
    this.isPosted = false;
    this.secPay = 0;
    this.debitLines = [];
    this.creditLines = [];
    this._loadedYear = this.myYear;
    this.addDebitLine();
    this.addCreditLine();
  }

  loadNavigation(): void {
    this.cpService.getNavigation(this.myYear, this.vType).subscribe({
      next: nav => { this.navMin = nav.MinDocNum; this.navMax = nav.MaxDocNum; },
      error: () => {},
    });
    this.loadDocNums();
  }

  // ─── Load voucher ────────────────────────────────────────────
  loadVoucher(docNum: number): void {
    this.loading = true;
    this.cpService.getVoucher(docNum, this.myYear, this.vType).subscribe({
      next: v => {
        const h = v.Header;
        this.transNum      = h.TransNum;
        this.docNum        = h.DocNum;
        this._loadedDocNum = h.DocNum;
        this.date          = h.Date.substring(0, 10);
        this.curNo         = h.CurNo;
        this.rate          = h.Rate;
        this.payFor        = h.PayFor ?? '';
        this.reason        = h.Reason ?? '';
        this.sigNo         = h.SigNo;
        this.userName      = h.UserName ?? this.userName;
        this.isPosted      = h.Post;
        this.brNo          = h.BrNo;
        this.secPay        = h.SecPay ?? 0;
        this._loadedYear   = h.MyYear;
        this.myYear        = h.MyYear;

        this.debitLines = v.DebitLines.map(l => ({
          acc: l.Acc, accName: l.AccName ?? '', amt: l.Amt, des: l.Des ?? '', ccntrNo: l.CCntrNo
        }));
        this.creditLines = v.CreditLines.map(l => ({
          acc: l.Acc, accName: l.AccName ?? '', amt: l.Amt, des: l.Des ?? '', ccntrNo: l.CCntrNo
        }));

        if (!this.debitLines.length)  this.addDebitLine();
        if (!this.creditLines.length) this.addCreditLine();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.debitLines = []; this.creditLines = [];
        this._loadedDocNum = 0; this._loadedYear = 0;
        this.addDebitLine(); this.addCreditLine();
      },
    });
  }

  onDocNumSelected(value: number | string | null): void {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!num || isNaN(num)) return;
    this.docNum = num;
    if (!this.docNums.includes(num)) this.docNums = [...this.docNums, num].sort((a, b) => a - b);
    if (num !== this._loadedDocNum) this.loadVoucher(num);
  }

  onYearChange(): void {
    this.myYear = Math.min(Math.max(this.myYear, 1900), this.currentYear);
    if (this.myYear >= 1000 && this.myYear <= 9999 && this.myYear !== this._loadedYear) {
      if (this.activeTab === 'form') this.loadVoucher(this.docNum);
      else this.loadList();
    }
  }

  onVTypeChange(): void {
    const serial = this.voucherSerials.find(s => s.VSerialNo === this.vType);
    if (serial) this.brNo = serial.BR_No;
    if (this.vType > 0) this.initNewVoucher();
  }

  onCurrencySelected(c: CurrencyDto | null): void {
    if (c) this.rate = c.lrate ?? 1;
  }

  // ─── Navigation ─────────────────────────────────────────────
  goFirst(): void { if (this.navMin) this.loadVoucher(this.navMin); }
  goLast():  void { if (this.navMax) this.loadVoucher(this.navMax); }

  goPrev(): void {
    this.cpService.getAdjacentDocNum(this.docNum, this.myYear, this.vType, 'PREV').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('CashPayment.FirstVoucher'), ''),
    });
  }

  goNext(): void {
    this.cpService.getAdjacentDocNum(this.docNum, this.myYear, this.vType, 'NEXT').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('CashPayment.LastVoucher'), ''),
    });
  }

  // ─── Line management ─────────────────────────────────────────
  addDebitLine(): void {
    this.debitLines.push({ acc: null, accName: '', amt: 0, des: '', ccntrNo: 0 });
  }
  removeDebitLine(i: number): void {
    if (this.debitLines.length > 1) this.debitLines.splice(i, 1);
  }
  onDebitAccountSelected(i: number, acc: ChartOfAccountDto | null): void {
    if (acc) { this.debitLines[i].acc = acc.no; this.debitLines[i].accName = acc.name ?? ''; }
  }

  addCreditLine(): void {
    this.creditLines.push({ acc: null, accName: '', amt: 0, des: '', ccntrNo: 0 });
  }
  removeCreditLine(i: number): void {
    if (this.creditLines.length > 1) this.creditLines.splice(i, 1);
  }
  onCreditAccountSelected(i: number, acc: ChartOfAccountDto | null): void {
    if (acc) { this.creditLines[i].acc = acc.no; this.creditLines[i].accName = acc.name ?? ''; }
  }

  // ─── Save ────────────────────────────────────────────────────
  save(): void {
    this.saveAttempted = true;
    if (!this.validateForm()) return;

    const validDebit  = this.debitLines.filter(l => l.acc !== null && l.amt > 0);
    const validCredit = this.creditLines.filter(l => l.acc !== null && l.amt > 0);

    const req: SaveCashPaymentRequest = {
      TransNum:    this.transNum,
      DocNum:      this.docNum,
      MyYear:      this.myYear,
      VType:       this.vType,
      BrNo:        this.brNo,
      Date:        this.date,
      CurNo:       this.curNo,
      Rate:        this.rate,
      UserName:    this.userName,
      PayFor:      this.payFor,
      Reason:      this.reason,
      SigNo:       this.sigNo,
      SecPay:      this.secPay,
      DebitLines:  validDebit.map<SaveCashPaymentDebitLine>(l => ({
        Acc: l.acc!, Amt: l.amt, Des: l.des, CCntrNo: l.ccntrNo
      })),
      CreditLines: validCredit.map<SaveCashPaymentCreditLine>(l => ({
        Acc: l.acc!, Amt: l.amt, Des: l.des, CCntrNo: l.ccntrNo
      })),
    };

    this.saving = true;
    this.cpService.save(req).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('CashPayment.SavedSuccessfully', { docNum: result.DocNum }),
          this.translate.instant('General.Success')
        );
        this.saving = false;
        this.initNewVoucher();
      },
      error: () => { this.saving = false; },
    });
  }

  private validateForm(): boolean {
    const validDebit  = this.debitLines.filter(l => l.acc !== null && l.amt > 0);
    const validCredit = this.creditLines.filter(l => l.acc !== null && l.amt > 0);

    if (validDebit.length === 0) {
      this.toastr.warning(
        this.translate.instant('CashPayment.DebitLinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (validCredit.length === 0) {
      this.toastr.warning(
        this.translate.instant('CashPayment.CreditLinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (!this.isBalanced) {
      this.toastr.error(
        this.translate.instant('CashPayment.NotBalanced'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (this.isPosted) {
      this.toastr.warning(
        this.translate.instant('CashPayment.PostedCannotEdit'),
        this.translate.instant('General.Warning')
      );
      return false;
    }
    return true;
  }

  // ─── Delete ──────────────────────────────────────────────────
  confirmDelete(): void {
    if (this.transNum === 0) return;
    this.pendingDeleteTransNum = this.transNum;
    this.modalRef = this.modalService.open(this.deleteConfirmModal, {
      centered: true, size: 'sm', backdrop: 'static',
    });
  }

  executeDelete(): void {
    this.modalRef?.close();
    this.loading = true;
    this.cpService.delete(this.pendingDeleteTransNum).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('CashPayment.DeletedSuccessfully'),
          this.translate.instant('General.Success')
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── List / tab ──────────────────────────────────────────────
  switchToList(): void { this.activeTab = 'list'; this.loadList(); }
  switchToForm(): void { this.activeTab = 'form'; }

  loadList(): void {
    this.loading = true;
    this.cpService.getList(this.myYear, this.vType, this.pageIndex + 1, this.pageSize).subscribe({
      next: res => {
        this.allListData      = res.Items;
        this.totalItems       = res.TotalCount;
        this.dataSource.data  = res.Items;
        this.loading = false;
      },
      error: () => {
        this.allListData      = [];
        this.dataSource.data  = [];
        this.totalItems = 0;
        this.loading = false;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.loadList();
  }

  openVoucherFromList(item: CashPaymentListItemDto): void {
    this.activeTab = 'form';
    this.myYear = item.MyYear;
    this.vType  = item.VType;
    this.loadVoucher(item.DocNum);
  }

  // ─── View voucher (عرض السند) popup ──────────────────────────
  voucherViewOpen = false;
  voucherViewLoading = false;
  voucherView: CashPaymentVoucherDto | null = null;
  voucherViewItem: CashPaymentListItemDto | null = null;

  get vvTotalDebit():  number { return (this.voucherView?.DebitLines  ?? []).reduce((s, l) => s + (l.Amt || 0), 0); }
  get vvTotalCredit(): number { return (this.voucherView?.CreditLines ?? []).reduce((s, l) => s + (l.Amt || 0), 0); }

  openVoucherView(item: CashPaymentListItemDto): void {
    this.voucherViewItem = item;
    this.voucherView = null;
    this.voucherViewOpen = true;
    this.voucherViewLoading = true;
    this.cpService.getVoucher(item.DocNum, item.MyYear, item.VType).subscribe({
      next: v => { this.voucherView = v; this.voucherViewLoading = false; },
      error: () => { this.voucherView = { Header: null as any, DebitLines: [], CreditLines: [] }; this.voucherViewLoading = false; },
    });
  }
  closeVoucherView(): void { this.voucherViewOpen = false; this.voucherView = null; this.voucherViewItem = null; }

  ccName(ccntrNo: number): string { return this.getCostCenterName(ccntrNo); }

  // ─── Print ───────────────────────────────────────────────────
  printVoucher(): void {
    if (this.transNum === 0) return;

    const dec     = this.cs.decimals;
    const fmt     = (n: number) => n.toFixed(dec);
    const curName  = this.currencies.find(c => c.cur_no === this.curNo)?.cur || '';
    const amtWords = this.numberToArabicWords(this.totalCredit, curName);

    const title = `${this.translate.instant('CashPayment.Title')} — ${this.translate.instant('CashPayment.DocNum')}: ${this.docNum} | ${this.translate.instant('CashPayment.Date')}: ${this.date}${this.payFor ? ' | ' + this.translate.instant('CashPayment.PayFor') + ': ' + this.payFor : ''}`;

    const cols = [
      { label: this.translate.instant('CashPayment.Acc') },
      { label: this.translate.instant('CashPayment.AccName') },
      { label: this.translate.instant('CashPayment.Amount') },
      { label: this.translate.instant('CashPayment.Statement') },
      { label: this.translate.instant('CashPayment.CostCenter') },
    ];

    const sectionRow = (label: string, bg: string) =>
      `<tr><td colspan="5" style="background:${bg};font-weight:700;text-align:center;padding:5px 8px;">${label}</td></tr>`;

    const debitRows = this.debitLines.filter(l => l.acc).map(l =>
      `<tr>
        <td style="text-align:center">${l.acc}</td>
        <td style="text-align:center">${l.accName}</td>
        <td style="text-align:center">${fmt(l.amt)}</td>
        <td style="text-align:center">${l.des || '—'}</td>
        <td style="text-align:center">${this.getCostCenterName(l.ccntrNo) || '—'}</td>
      </tr>`).join('');

    const creditRows = this.creditLines.filter(l => l.acc).map(l =>
      `<tr>
        <td style="text-align:center">${l.acc}</td>
        <td style="text-align:center">${l.accName}</td>
        <td style="text-align:center">${fmt(l.amt)}</td>
        <td style="text-align:center">${l.des || '—'}</td>
        <td style="text-align:center">${this.getCostCenterName(l.ccntrNo) || '—'}</td>
      </tr>`).join('');

    const rows = [
      sectionRow(this.translate.instant('CashPayment.DebitAccounts'), '#eff6ff'),
      debitRows,
      sectionRow(this.translate.instant('CashPayment.CreditAccounts'), '#fef2f2'),
      creditRows,
      `<tr><td colspan="5" style="text-align:center;font-weight:700;padding:6px 8px;border-top:2px solid #cbd5e1;">
        ${this.translate.instant('CashPayment.Total')}: ${fmt(this.totalCredit)} | فقط ${amtWords} لا غير
       </td></tr>`,
      `<tr>
        <td colspan="2" style="text-align:center;font-weight:700;padding:20px 8px;border-top:1px solid #e2e8f0;">المحاسب</td>
        <td style="text-align:center;font-weight:700;padding:20px 8px;border-top:1px solid #e2e8f0;">المصادقة</td>
        <td colspan="2" style="text-align:center;font-weight:700;padding:20px 8px;border-top:1px solid #e2e8f0;">المستلم</td>
      </tr>`,
    ].join('');

    this.reportService.printReport(title, cols, rows);
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private getCostCenterName(ccntrNo: number): string {
    return this.costCenters.find(c => c.CcntrNo === ccntrNo)?.CcAname || '';
  }

  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.name?.toLowerCase().includes(term) ?? false) || item.no.toString().includes(term);
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  onDateChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.date = this.today();
  }

  private numberToArabicWords(amount: number, currency: string): string {
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
                  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
                  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

    const toWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20)  return ones[n];
      if (n < 100) { const t = Math.floor(n/10), o = n%10; return o === 0 ? tens[t] : ones[o]+' و'+tens[t]; }
      if (n < 1000) { const h = Math.floor(n/100), r = n%100; return r === 0 ? hundreds[h] : hundreds[h]+' و'+toWords(r); }
      if (n < 1_000_000) {
        const th = Math.floor(n/1000), r = n%1000;
        const pfx = th===1?'ألف':th===2?'ألفان':th<=10?toWords(th)+' آلاف':toWords(th)+' ألف';
        return r === 0 ? pfx : pfx+' و'+toWords(r);
      }
      if (n < 1_000_000_000) {
        const m = Math.floor(n/1_000_000), r = n%1_000_000;
        const pfx = m===1?'مليون':m===2?'مليونان':toWords(m)+' ملايين';
        return r === 0 ? pfx : pfx+' و'+toWords(r);
      }
      return n.toString();
    };

    const dec = this.cs.decimals;
    const intPart = Math.floor(amount);
    const fracPart = Math.round((amount - intPart) * Math.pow(10, dec));
    let result = intPart === 0 ? 'صفر' : toWords(intPart);
    result += ' ' + currency;
    if (fracPart > 0) result += ' و' + toWords(fracPart) + ' فلس';
    return result;
  }
}
