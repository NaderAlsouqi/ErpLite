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
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { RouterModule } from '@angular/router';

import {
  ChequesPaymentService,
  CheckPaymentVoucherDto,
  CheckPaymentListItemDto,
  SaveCheckPaymentRequest,
  SaveCheckPaymentDebitLine,
  SaveCheckPaymentCreditLine,
} from '../../../shared/services/cheques-payment.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { SignatureDto, SignatureService } from '../../../shared/services/signature.service';
import { ReportService } from '../../../shared/services/report.service';
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
  cheqNum: number | null;
  cheqDate: string;
  des: string;
  ccntrNo: number;
}

@Component({
  selector: 'app-cheques-payment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    HasPermissionDirective,
    RouterModule,
  ],
  providers: [NgbModalConfig, NgbModal, FlatpickrDefaults],
  templateUrl: './cheques-payment.component.html',
  styleUrl: './cheques-payment.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChequesPaymentComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;
  @ViewChild('printModal') printModal!: TemplateRef<any>;

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
  secPay = 0;
  userName = '';
  isPosted = false;

  // ─── Lines ──────────────────────────────────────────────────
  debitLines: DebitLine[] = [];
  creditLines: CreditLine[] = [];

  get totalDebit(): number  { return this.debitLines.reduce((s, l) => s + (l.amt || 0), 0); }
  get totalCredit(): number { return this.creditLines.reduce((s, l) => s + (l.amt || 0), 0); }
  get isBalanced(): boolean { return Math.abs(this.totalDebit - this.totalCredit) < 0.001; }
  get numFmt(): string { const d = this.cs.decimals; return `1.${d}-${d}`; }

  // ─── Lookups ────────────────────────────────────────────────
  accounts: ChartOfAccountDto[] = [];
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
  displayedColumns = ['DocNum', 'Date', 'PayFor', 'TotalCredit', 'Post', 'Actions'];
  dataSource = new MatTableDataSource<CheckPaymentListItemDto>([]);
  allListData: CheckPaymentListItemDto[] = [];
  totalItems = 0;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50];

  // ─── Tabs & State ────────────────────────────────────────────
  activeTab = 'form';   // 'form' | 'list'
  loading = false;
  saving = false;
  saveAttempted = false;
  duplicateOnSave = false;
  selectedPrintForm = 'normal';
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
    private cpService: ChequesPaymentService,
    private coaService: ChartOfAccountsService,
    private currencyService: CurrencyService,
    private costCenterService: CostCenterService,
    private signatureService: SignatureService,
    private reportService: ReportService,
    private cs: CompanySettingsService,
    private voucherSerialService: VoucherSerialService,
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
    this.signatureService.getAll().subscribe({ next: d => { this.stamps = d; if (d.length) this.sigNo = d[0].SigNo; }, error: () => {} });
    this.voucherSerialService.getAll(3).subscribe({
      next: d => {
        this.voucherSerials = d;
        if (!this.transNum && d.length) this.vType = d[0].VSerialNo;
      },
      error: () => {}
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
        // Always keep the currently displayed docNum in the list (may be unsaved)
        if (currentDocNum > 0 && !nums.includes(currentDocNum)) {
          nums.push(currentDocNum);
          nums.sort((a, b) => a - b);
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
    // Add new docNum to dropdown immediately so ng-select always finds it
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
    this.secPay = 0;
    this.isPosted = false;
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
      next: (v: CheckPaymentVoucherDto) => {
        const h = v.Header;
        this.transNum       = h.TransNum;
        this.docNum         = h.DocNum;
        this._loadedDocNum  = h.DocNum;
        this.date           = h.Date.substring(0, 10);
        this.curNo          = h.CurNo;
        this.rate           = h.Rate;
        this.payFor         = h.PayFor ?? '';
        this.reason         = h.Reason ?? '';
        this.sigNo          = h.SigNo;
        this.userName       = h.UserName ?? this.userName;
        this.isPosted       = h.Post;
        this.secPay         = h.SecPay ?? 0;
        this.brNo           = h.BrNo;
        this._loadedYear    = h.MyYear;
        this.myYear         = h.MyYear;

        this.debitLines = v.DebitLines.map(l => ({
          acc: l.Acc, accName: l.AccName ?? '', amt: l.Amt, des: l.Des ?? '', ccntrNo: l.CCntrNo
        }));
        this.creditLines = v.CreditLines.map(l => ({
          acc: l.Acc, accName: l.AccName ?? '', amt: l.Amt,
          cheqNum: l.CheqNum ? parseInt(l.CheqNum, 10) : null,
          cheqDate: l.CheqDate?.substring(0, 10) ?? '',
          des: l.Des ?? '', ccntrNo: l.CCntrNo
        }));

        if (!this.debitLines.length)  this.addDebitLine();
        if (!this.creditLines.length) this.addCreditLine();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.debitLines  = [];
        this.creditLines = [];
        this._loadedDocNum = 0;
        this._loadedYear = 0;
        this.addDebitLine();
        this.addCreditLine();
      },
    });
  }

  onDocNumChange(): void {
    if (this.docNum > 0 && this.docNum !== this._loadedDocNum) this.loadVoucher(this.docNum);
  }

  onDocNumSelected(value: number | string | null): void {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!num || isNaN(num)) return;
    this.docNum = num;
    if (!this.docNums.includes(num)) {
      this.docNums = [...this.docNums, num].sort((a, b) => a - b);
    }
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
      error: () => this.toastr.info(this.translate.instant('CheckPayment.FirstVoucher'), ''),
    });
  }

  goNext(): void {
    this.cpService.getAdjacentDocNum(this.docNum, this.myYear, this.vType, 'NEXT').subscribe({
      next: r => this.loadVoucher(r.DocNum),
      error: () => this.toastr.info(this.translate.instant('CheckPayment.LastVoucher'), ''),
    });
  }

  // ─── Lines management ────────────────────────────────────────
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
    this.creditLines.push({ acc: null, accName: '', amt: 0, cheqNum: null, cheqDate: this.today(), des: '', ccntrNo: 0 });
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

    const req: SaveCheckPaymentRequest = {
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
      DebitLines:  validDebit.map<SaveCheckPaymentDebitLine>(l => ({
        Acc: l.acc!, Amt: l.amt, Des: l.des, CCntrNo: l.ccntrNo
      })),
      CreditLines: validCredit.map<SaveCheckPaymentCreditLine>(l => ({
        Acc: l.acc!, Amt: l.amt, CheqNum: l.cheqNum ?? undefined, CheqDate: l.cheqDate, Des: l.des, CCntrNo: l.ccntrNo
      })),
    };

    this.saving = true;
    this.cpService.save(req).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('CheckPayment.SavedSuccessfully', { docNum: result.DocNum }),
          this.translate.instant('General.Success')
        );
        if (this.duplicateOnSave) {
          // Immediately save a second record with the same data under a new doc num
          this.cpService.getNextDocNum(this.myYear, this.vType).subscribe({
            next: res => {
              const dupReq: SaveCheckPaymentRequest = {
                ...req,
                TransNum: 0,
                DocNum:   res.NextDocNum,
                Date:     this.today(),
              };
              this.cpService.save(dupReq).subscribe({
                next: dupResult => {
                  this.saving = false;
                  this.toastr.success(
                    this.translate.instant('CheckPayment.SavedSuccessfully', { docNum: dupResult.DocNum }),
                    this.translate.instant('General.Success')
                  );
                  this.initNewVoucher();
                },
                error: () => { this.saving = false; this.initNewVoucher(); },
              });
            },
            error: () => { this.saving = false; this.initNewVoucher(); },
          });
        } else {
          this.saving = false;
          this.initNewVoucher();
        }
      },
      error: () => { this.saving = false; },
    });
  }

  private validateForm(): boolean {
    const validDebit  = this.debitLines.filter(l => l.acc !== null && l.amt > 0);
    const validCredit = this.creditLines.filter(l => l.acc !== null && l.amt > 0);

    if (validDebit.length === 0) {
      this.toastr.warning(
        this.translate.instant('CheckPayment.DebitLinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (validCredit.length === 0) {
      this.toastr.warning(
        this.translate.instant('CheckPayment.CreditLinesRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (validCredit.some(l => !l.cheqNum || l.cheqNum < 1)) {
      this.toastr.warning(
        this.translate.instant('CheckPayment.CheqNumRequired'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (!this.isBalanced) {
      this.toastr.error(
        this.translate.instant('CheckPayment.NotBalanced'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (this.isPosted) {
      this.toastr.warning(
        this.translate.instant('CheckPayment.PostedCannotEdit'),
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
          this.translate.instant('CheckPayment.DeletedSuccessfully'),
          this.translate.instant('General.Success')
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── List / tab ──────────────────────────────────────────────
  switchToList(): void {
    this.activeTab = 'list';
    this.loadList();
  }

  switchToForm(): void {
    this.activeTab = 'form';
  }

  loadList(): void {
    this.loading = true;
    this.cpService.getList(this.myYear, this.vType, this.pageIndex + 1, this.pageSize).subscribe({
      next: res => {
        this.allListData    = res.Items;
        this.totalItems     = res.TotalCount;
        this.dataSource.data = res.Items;
        this.loading = false;
      },
      error: () => {
        this.allListData    = [];
        this.dataSource.data = [];
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

  onSortChange(sort: Sort): void {
    const data = [...this.allListData];
    if (!sort.active || !sort.direction) {
      this.dataSource.data = data;
      return;
    }
    this.dataSource.data = data.sort((a, b) => {
      const asc = sort.direction === 'asc';
      switch (sort.active) {
        case 'DocNum':      return this.compare(a.DocNum,      b.DocNum,      asc);
        case 'Date':        return this.compare(new Date(a.Date).getTime(), new Date(b.Date).getTime(), asc);
        case 'TotalCredit': return this.compare(a.TotalCredit, b.TotalCredit, asc);
        default: return 0;
      }
    });
  }

  openVoucherFromList(item: CheckPaymentListItemDto): void {
    this.activeTab = 'form';
    this.loadVoucher(item.DocNum);
  }

  // ─── Print ───────────────────────────────────────────────────
  openPrintModal(): void {
    if (this.transNum === 0) return;
    this.modalService.open(this.printModal, { centered: true, size: 'sm', backdrop: 'static' });
  }

  executePrint(): void {
    switch (this.selectedPrintForm) {
      case 'normal':          this.printVoucher(); break;
      case 'cheque':          this.printCheque(); break;
      case 'cheque-portrait': this.printChequePortrait(); break;
      case 'cheque-standard': this.printChequeStandard(); break;
    }
  }

  printVoucher(): void {
    if (this.transNum === 0) return;
    this.reportService.getCompanyLogoBase64().subscribe(logoBase64 => {
      const win = window.open('', '_blank');
      if (!win) return;

      const now      = new Date();
      const dateStr  = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
      const timeStr  = now.toLocaleTimeString('ar-EG');
      const user     = this.authService.currentUserValue?.DeliveryName || '';
      const compAr   = this.cs.companyName;
      const compEn   = this.cs.companyEName;
      const address  = this.cs.address;
      const tel      = this.cs.tel;
      const taxNum   = this.cs.taxNum;
      const dec      = this.cs.decimals;
      const fmt      = (n: number) => n.toFixed(dec);
      const curName  = this.currencies.find(c => c.cur_no === this.curNo)?.cur || '';
      const serial   = this.selectedSerialName;

      const debitRows = this.debitLines.filter(l => l.acc).map(l => `
        <tr>
          <td>${l.acc}</td><td>${l.accName}</td>
          <td class="num">${fmt(l.amt)}</td>
          <td>${l.des || ''}</td>
          <td>${this.getCostCenterName(l.ccntrNo)}</td>
        </tr>`).join('');

      const creditRows = this.creditLines.filter(l => l.acc).map(l => `
        <tr>
          <td>${l.acc}</td><td>${l.accName}</td>
          <td class="num">${fmt(l.amt)}</td>
          <td>${l.cheqNum ?? ''}</td>
          <td>${l.cheqDate || ''}</td>
          <td>${l.acc}</td>
          <td>${this.payFor || ''}</td>
          <td>${this.getCostCenterName(l.ccntrNo)}</td>
        </tr>`).join('');

      const amtWords = this.numberToArabicWords(this.totalCredit, curName);

      win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<title>سند صرف شيكات</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Traditional Arabic', 'Arial', sans-serif; direction: rtl; padding: 20px; margin: 0; font-size: 12px; color: #000; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; direction: ltr; margin-bottom: 8px; }
  .top-left { text-align: left; font-weight: bold; }
  .top-left .co-name { font-size: 15px; }
  .top-left .co-info { font-size: 11px; font-weight: normal; margin-top: 2px; }
  .top-right { text-align: right; font-size: 11px; }
  .doc-title { text-align: center; font-size: 17px; font-weight: bold; text-decoration: underline; margin: 6px 0 4px; }
  .serial-row { text-align: center; font-weight: bold; margin-bottom: 8px; font-size: 13px; }
  .info-bar { display: grid; grid-template-columns: repeat(3,1fr); border: 1px solid #000; padding: 5px 8px; gap: 4px; margin-bottom: 6px; }
  .info-bar div { display: flex; gap: 4px; }
  .lbl { font-weight: bold; }
  .pay-bar { border: 1px solid #000; padding: 5px 8px; margin-bottom: 8px; }
  .sec-title { text-align: center; font-weight: bold; font-size: 13px; margin: 6px 0 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  th, td { border: 1px solid #000; padding: 3px 6px; }
  th { background: #e8e8e8; text-align: center; font-weight: bold; }
  td { text-align: right; }
  td.num { text-align: left; direction: ltr; }
  .words { border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 30px; }
  .sigs { display: grid; grid-template-columns: repeat(3,1fr); gap: 30px; margin-top: 50px; text-align: center; }
  .sig { border-top: 1px solid #000; padding-top: 5px; font-weight: bold; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="top">
    <div class="top-left">
      <div class="co-name">${compAr}</div>
      ${compEn ? `<div class="co-info">${compEn}</div>` : ''}
      ${address ? `<div class="co-info">${address}</div>` : ''}
      ${taxNum ? `<div class="co-info">الرقم الضريبي: ${taxNum}</div>` : ''}
      ${tel ? `<div class="co-info">التليفون: ${tel}</div>` : ''}
    </div>
    <div class="top-right">
      <div>صفحة 1 من 1</div>
      <div>${user}</div>
      <div>التاريخ ${dateStr}</div>
      <div>الوقت ${timeStr}</div>
    </div>
  </div>

  <div class="doc-title">سند صرف شيكات</div>
  <div class="serial-row">نوع التسلسل/الفرع : ${serial}</div>

  <div class="info-bar">
    <div><span class="lbl">رقم المستند :</span> ${this.docNum}</div>
    <div><span class="lbl">العملة :</span> ${curName}</div>
    <div><span class="lbl">تاريخ المستند:</span> ${this.date}</div>
  </div>

  <div class="pay-bar">
    <span class="lbl">المدفوع له :</span> ${this.payFor || ''}
    &nbsp;&nbsp;&nbsp;&nbsp;
    <span class="lbl">وذلك :</span> ${this.reason || ''}
  </div>

  <div class="sec-title">الحساب المدين</div>
  <table>
    <thead><tr>
      <th>رقم الحساب</th><th>اسم الحساب</th><th>المبلغ</th><th>البيان</th><th>مركز الكلفة</th>
    </tr></thead>
    <tbody>${debitRows}</tbody>
  </table>

  <div class="sec-title">الحساب الدائن</div>
  <table>
    <thead><tr>
      <th>رقم الحساب</th><th>اسم الحساب</th><th>المبلغ</th>
      <th>رقم الشيك</th><th>تاريخ الشيك</th><th>حساب البنك</th>
      <th>المستفيد</th><th>مركز الكلفة</th>
    </tr></thead>
    <tbody>${creditRows}</tbody>
  </table>

  <div class="words">فقط ${amtWords} لا غير</div>

  <div class="sigs">
    <div class="sig">المحاسب</div>
    <div class="sig">المصادقة</div>
    <div class="sig">المستلم</div>
  </div>

  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script>
</body></html>`);
      win.document.close();
    });
  }

  // ── نموذج شيكات ─────────────────────────────────────────────
  printCheque(): void {
    this.reportService.getCompanyLogoBase64().subscribe(logoBase64 => {
      const win = window.open('', '_blank');
      if (!win) return;
      const dec      = this.cs.decimals;
      const fmt      = (n: number) => n.toFixed(dec);
      const curName  = this.currencies.find(c => c.cur_no === this.curNo)?.cur || '';
      const compAr   = this.cs.companyName;
      const compEn   = this.cs.companyEName;
      const address  = this.cs.address;
      const taxNum   = this.cs.taxNum;
      const tel      = this.cs.tel;
      const serial   = this.selectedSerialName;
      const amtWords = this.numberToArabicWords(this.totalCredit, curName);

      const allRows = [
        ...this.creditLines.filter(l => l.acc).map(l => `
          <tr>
            <td>${l.cheqNum ?? ''}</td>
            <td>${l.cheqDate || ''}</td>
            <td>${l.acc}</td>
            <td>${l.accName}</td>
            <td class="num">${fmt(l.amt)}</td>
            <td>${this.getCostCenterName(l.ccntrNo)}</td>
            <td>${l.des || ''}</td>
          </tr>`),
        ...this.debitLines.filter(l => l.acc).map(l => `
          <tr>
            <td></td><td></td>
            <td>${l.acc}</td>
            <td>${l.accName}</td>
            <td class="num">${fmt(l.amt)}</td>
            <td>${this.getCostCenterName(l.ccntrNo)}</td>
            <td>${l.des || ''}</td>
          </tr>`),
      ].join('');

      win.document.write(`<!DOCTYPE html>
<html dir="rtl"><head><meta charset="UTF-8"><title>نموذج شيكات</title>
<style>
  body { font-family:'Traditional Arabic','Arial',sans-serif; direction:rtl; margin:0; padding:15px; font-size:12px; color:#000; }
  .top-bar { display:flex; justify-content:space-between; align-items:flex-start; direction:ltr; margin-bottom:12px; border-bottom:1px solid #ccc; padding-bottom:8px; }
  .top-company { text-align:left; }
  .top-company .co-name { font-size:15px; font-weight:bold; }
  .top-company .co-detail { font-size:11px; margin-top:2px; }
  .top-meta { display:flex; flex-direction:column; gap:3px; font-size:12px; text-align:right; }
  .fields { display:grid; grid-template-columns:max-content 1fr; gap:4px 10px; border:1px solid #000; padding:8px 12px; margin-bottom:12px; width:fit-content; margin-right:auto; }
  .lbl { font-weight:bold; white-space:nowrap; }
  .sec-title { text-align:center; font-weight:bold; font-size:13px; margin:6px 0 3px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th,td { border:1px solid #000; padding:3px 6px; }
  th { background:#e8e8e8; text-align:center; font-weight:bold; }
  td { text-align:right; }
  td.num { text-align:left; direction:ltr; }
  .words { border:1px solid #000; padding:5px 8px; text-align:center; font-weight:bold; font-size:13px; margin:10px 0; }
  .sigs { display:grid; grid-template-columns:repeat(3,1fr); gap:30px; margin-top:40px; text-align:center; }
  .sig { border-top:1px solid #000; padding-top:5px; font-weight:bold; }
  @media print { body{padding:8px;} }
</style></head><body>
<div class="top-bar">
  <div class="top-company">
    <div class="co-name">${compAr}</div>
    ${compEn  ? `<div class="co-detail">${compEn}</div>` : ''}
    ${address ? `<div class="co-detail">${address}</div>` : ''}
    ${taxNum  ? `<div class="co-detail">الرقم الضريبي: ${taxNum}</div>` : ''}
    ${tel     ? `<div class="co-detail">التليفون: ${tel}</div>` : ''}
  </div>
  <div class="top-meta">
    <span><strong>رقم المستند:</strong> ${this.docNum}</span>
    <span><strong>التاريخ:</strong> ${this.date}</span>
    <span><strong>نوع التسلسل:</strong> ${serial}</span>
  </div>
</div>
<div class="fields">
  <span class="lbl">المستفيد:</span>   <span>${this.payFor || ''}</span>
  <span class="lbl">الشركة:</span>     <span>${compAr}</span>
  <span class="lbl">المبلغ كتابة:</span><span>فقط ${amtWords} لا غير</span>
  <span class="lbl">وذلك:</span>       <span>${this.reason || ''}</span>
  <span class="lbl">العملة:</span>     <span>${curName}</span>
</div>
<div class="sec-title">بيان الحسابات</div>
<table>
  <thead><tr>
    <th>رقم الشيك</th><th>تاريخ الشيك</th><th>رقم الحساب</th>
    <th>اسم الحساب</th><th>المبلغ</th><th>مركز الكلفة</th><th>البيان</th>
  </tr></thead>
  <tbody>${allRows}</tbody>
</table>
<div class="words">فقط ${amtWords} لا غير</div>
<div class="sigs">
  <div class="sig">المحاسب</div>
  <div class="sig">المصادقة</div>
  <div class="sig">المستلم</div>
</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script>
</body></html>`);
      win.document.close();
    });
  }

  printChequeStandard(): void { this._printChequeOverlay(false); }
  printChequePortrait(): void { this._printChequeOverlay(true); }

  private _printChequeOverlay(portrait: boolean): void {
    const dec     = this.cs.decimals;
    const compAr  = this.cs.companyName;
    const validLines = this.creditLines.filter(l => l.acc && l.amt > 0);

    const pages = validLines.map(line => {
      const words  = this.numberToArabicWords(line.amt, '');
      const intStr = Math.floor(line.amt).toString();
      const decStr = (line.amt - Math.floor(line.amt)).toFixed(dec).substring(2);
      const cheqDate = line.cheqDate || this.date;

      return `<div class="page">
  <span class="f date">${cheqDate}</span>
  <span class="f bank">${compAr}</span>
  <span class="f ben">${this.payFor || ''}</span>
  <span class="f words">فقط ${words} لا غير</span>
  <span class="f amt-int">${intStr}</span>
  <span class="f amt-dec">${decStr}</span>
  <span class="f reason">${this.reason || ''}</span>
</div>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) return;

    const css = portrait ? `
      .date   { right:76%; top:16%; }
      .bank   { right:46%; top:16%; }
      .ben    { right:8%;  top:31%; }
      .words  { right:50%; top:43%; }
      .amt-int{ right:16%; top:45%; }
      .amt-dec{ right:6%;  top:45%; }
      .reason { right:50%; top:56%; }
    ` : `
      .date   { right:76%; top:20%; }
      .bank   { right:46%; top:20%; }
      .ben    { right:8%;  top:36%; }
      .words  { right:52%; top:48%; }
      .amt-int{ right:18%; top:51%; }
      .amt-dec{ right:7%;  top:51%; }
      .reason { right:52%; top:61%; }
    `;

    win.document.write(`<!DOCTYPE html>
<html dir="rtl"><head><meta charset="UTF-8"><title>نموذج شيكات قياسي</title>
<style>
  @page { size:${portrait ? 'A5 portrait' : 'A5 landscape'}; margin:0; }
  * { box-sizing:border-box; }
  body { margin:0; padding:0; font-family:'Traditional Arabic','Arial',sans-serif; direction:rtl; }
  .page { position:relative; width:100vw; height:100vh; page-break-after:always; }
  .f { position:absolute; font-size:13px; font-weight:bold; white-space:nowrap; color:#000; }
  ${css}
  @media print { .page { page-break-after:always; } }
</style></head><body>
${pages}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);}</script>
</body></html>`);
    win.document.close();
  }

  private getCostCenterName(ccntrNo: number): string {
    return this.costCenters.find(c => c.CcntrNo === ccntrNo)?.CcAname || '';
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
      if (n < 100) {
        const t = Math.floor(n / 10), o = n % 10;
        return o === 0 ? tens[t] : ones[o] + ' و' + tens[t];
      }
      if (n < 1000) {
        const h = Math.floor(n / 100), rest = n % 100;
        return rest === 0 ? hundreds[h] : hundreds[h] + ' و' + toWords(rest);
      }
      if (n < 1_000_000) {
        const th = Math.floor(n / 1000), rest = n % 1000;
        const prefix = th === 1 ? 'ألف' : th === 2 ? 'ألفان' : th <= 10 ? toWords(th) + ' آلاف' : toWords(th) + ' ألف';
        return rest === 0 ? prefix : prefix + ' و' + toWords(rest);
      }
      if (n < 1_000_000_000) {
        const m = Math.floor(n / 1_000_000), rest = n % 1_000_000;
        const prefix = m === 1 ? 'مليون' : m === 2 ? 'مليونان' : toWords(m) + ' ملايين';
        return rest === 0 ? prefix : prefix + ' و' + toWords(rest);
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

  private compare(a: any, b: any, asc: boolean): number {
    return (a < b ? -1 : 1) * (asc ? 1 : -1);
  }
}
