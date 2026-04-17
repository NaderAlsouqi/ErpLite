import {
  Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
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

import {
  JournalVouchersService,
  JournalVoucherDto,
  JournalVoucherListItemDto,
  JournalVoucherAttachmentDto,
  SaveJournalVoucherRequest,
  SaveJournalVoucherLineRequest,
} from '../../../shared/services/journal-vouchers.service';

import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { ReportService } from '../../../shared/services/report.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';

// ─── Local line model ───────────────────────────────────────
export interface VoucherLine {
  acc: number | null;
  accName: string;
  debit: number;
  credit: number;
  des: string;
  ccntrNo: number;
}

@Component({
  selector: 'app-journal-vouchers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
  ],
  providers: [
    NgbModalConfig,
    NgbModal,
    FlatpickrDefaults,
  ],
  templateUrl: './journal-vouchers.component.html',
  styleUrl: './journal-vouchers.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class JournalVouchersComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;
  @ViewChild('attDeleteConfirmModal') attDeleteConfirmModal!: TemplateRef<any>;

  // ─── Config ─────────────────────────────────────────────
  readonly DEFAULT_V_TYPE = 1;
  readonly DEFAULT_DOC_TYPE = 1;

  // ─── Header form ────────────────────────────────────────
  transNum = 0;        // 0 = new voucher
  docNum = 0;
  private _loadedDocNum = 0;  // prevents blur from re-querying the new-form doc number
  myYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType = this.DEFAULT_V_TYPE;
  docType = this.DEFAULT_DOC_TYPE;
  brNo = 0;
  date = this.formatDate(new Date());
  curNo = 1;
  rate = 1;
  pay = 1;
  userName = '';
  pdfPath = '';
  isPosted = false;

  // ─── Lines ──────────────────────────────────────────────
  lines: VoucherLine[] = [];

  // ─── Attachments ────────────────────────────────────────
  attachments: JournalVoucherAttachmentDto[] = [];

  // ─── Totals ─────────────────────────────────────────────
  get totalDebit(): number { return this.lines.reduce((s, l) => s + (l.debit || 0), 0); }
  get totalCredit(): number { return this.lines.reduce((s, l) => s + (l.credit || 0), 0); }
  get isBalanced(): boolean { return Math.abs(this.totalDebit - this.totalCredit) < 0.001; }

  // ─── Lookups ────────────────────────────────────────────
  accounts: ChartOfAccountDto[] = [];
  currencies: CurrencyDto[] = [];
  costCenters: CostCenterDto[] = [];

  // ─── Navigation (PascalCase to match API) ───────────────
  navMinDocNum = 0;
  navMaxDocNum = 0;

  // ─── Vouchers list ───────────────────────────────────────
  displayedColumns = ['DocNum', 'Date', 'TotalDebit', 'TotalCredit', 'UserName', 'Post', 'Actions'];
  dataSource = new MatTableDataSource<JournalVoucherListItemDto>([]);
  allListData: JournalVoucherListItemDto[] = [];
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  // ─── State ──────────────────────────────────────────────
  loading = false;
  activeTab = 'form';   // 'form' | 'list'
  modalRef!: NgbModalRef;
  pendingDeleteTransNum = 0;
  pendingDeleteAttachment: JournalVoucherAttachmentDto | null = null;

  // ─── Flatpickr ──────────────────────────────────────────
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
    private jvService: JournalVouchersService,
    private coaService: ChartOfAccountsService,
    private currencyService: CurrencyService,
    private reportService: ReportService,
    private costCenterService: CostCenterService,
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.userName = user.DeliveryName ?? '';
    }
    this.loadAccounts();
    this.loadCurrencies();
    this.loadCostCenters();
    this._loadedYear = this.myYear;
    this.initNewVoucher();
  }

  // ─── Lookups ────────────────────────────────────────────
  loadAccounts(): void {
    this.coaService.getAll().subscribe({
      next: data => (this.accounts = data),
      error: () => { },
    });
  }

  loadCurrencies(): void {
    this.currencyService.getAll().subscribe({
      next: (data) => { 
        this.currencies = data; 
        if (data.length > 0 && this.transNum === 0) {
          this.curNo = data[0].cur_no;
          this.rate = data[0].lrate ?? 1;
        }
      },
      error: () => { }
    });
  }

  loadCostCenters(): void {
    this.costCenterService.getAll().subscribe({
      next: (data) => {
        this.costCenters = data;
      },
      error: () => { }
    });
  }

  // ─── Voucher Initialization ──────────────────────────────
  initNewVoucher(): void {
    this.loading = true;
    this.jvService.getNextDocNum(this.myYear, this.vType, this.docType).subscribe({
      next: res => {
        this._loadedYear = this.myYear;
        this.resetForm(res.NextDocNum);
        this.loadNavigation();
        this.loading = false;
      },
      error: () => {
        this._loadedYear = 0; // Reset state on error to allow retry
        this.resetForm(1);
        this.loading = false;
      },
    });
  }

  resetForm(docNum: number): void {
    this.transNum = 0;
    this.docNum = docNum;
    this._loadedDocNum = docNum;
    this.date = this.formatDate(new Date());
    this.isPosted = false;
    this.pdfPath = '';
    this.lines = [];
    this._loadedYear = this.myYear;
    this.attachments = [];
    this.addLine();
  }

  loadNavigation(): void {
    this.jvService.getNavigation(this.myYear, this.vType, this.docType).subscribe({
      next: nav => {
        this.navMinDocNum = nav.MinDocNum;
        this.navMaxDocNum = nav.MaxDocNum;
      },
      error: () => { },
    });
  }

  // ─── Load voucher by docNum ──────────────────────────────
  loadVoucher(docNum: number): void {
    this.loading = true;
    this.jvService.getVoucher(docNum, this.myYear, this.vType, this.docType).subscribe({
      next: (voucher: JournalVoucherDto) => {
        const h = voucher.Header;
        this.transNum = h.TransNum;
        this.docNum = h.DocNum;
        this._loadedDocNum = h.DocNum;
        this.date = h.Date.substring(0, 10);
        this.curNo = h.CurNo;
        this.rate = h.Rate;
        this.pay = h.Pay;
        this.userName = h.UserName ?? '';
        this.pdfPath = h.PDFPath ?? '';
        this.isPosted = h.Post;
        this.brNo = h.BrNo;
        this._loadedYear = h.MyYear;
        this.myYear = h.MyYear;

        this.attachments = voucher.Attachments || [];

        this.lines = voucher.Lines.map((l): VoucherLine => ({
          acc: l.Acc,
          accName: l.AccName ?? '',
          debit: l.Debit,
          credit: l.Credit,
          des: l.Des ?? '',
          ccntrNo: l.CCntrNo,
        }));

        if (this.lines.length === 0) this.addLine();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.lines = [];
        this.attachments = [];
        this._loadedDocNum = 0;
        this._loadedYear = 0;
        this.addLine();
        this.toastr.error(
          this.translate.instant('JournalVoucher.VoucherNotFound'),
          this.translate.instant('General.Error')
        );
      },
    });
  }

  onDocNumChange(): void {
    // Only load when the user typed a *different* number than the current one.
    // Prevents a 404 when blur fires on the pre-filled "next doc num" of a new form.
    if (this.docNum > 0 && this.docNum !== this._loadedDocNum) {
      this.loadVoucher(this.docNum);
    }
  }

  onYearChange(): void {
    if (this.myYear >= 1000 && this.myYear <= 9999 && this.myYear !== this._loadedYear) {
      if (this.activeTab === 'form') {
        this.loadVoucher(this.docNum);
      } else {
        this.loadList();
      }
    }
  }

  printVoucher(): void {
    const title = this.translate.instant('JournalVoucher.DailyJournalVoucher') + ' (' + this.docNum + ')';
    const cols = [
      { label: this.translate.instant('JournalVoucher.Acc') },
      { label: this.translate.instant('JournalVoucher.AccName') },
      { label: this.translate.instant('JournalVoucher.Debit') },
      { label: this.translate.instant('JournalVoucher.Credit') },
      { label: this.translate.instant('JournalVoucher.Statement') },
      { label: this.translate.instant('JournalVoucher.CCntrNo') },
    ];
    const rows = this.lines.map(l =>
      `<tr>
        <td style="text-align: center;">${l.acc || '—'}</td>
        <td style="text-align: center;">${l.accName || '—'}</td>
        <td style="text-align: center;">${l.debit.toFixed(3)}</td>
        <td style="text-align: center;">${l.credit.toFixed(3)}</td>
        <td style="text-align: center;">${l.des || '—'}</td>
        <td style="text-align: center;">${l.ccntrNo || '—'}</td>
      </tr>`
    ).join('');

    this.reportService.printReport(title, cols, rows);
  }

  printList(): void {
    const title = this.translate.instant('JournalVoucher.VouchersList');
    const cols = [
      { label: this.translate.instant('JournalVoucher.DocNum') },
      { label: this.translate.instant('JournalVoucher.Date') },
      { label: this.translate.instant('JournalVoucher.User') },
      { label: this.translate.instant('JournalVoucher.Debit') },
      { label: this.translate.instant('JournalVoucher.Credit') },
      { label: this.translate.instant('JournalVoucher.Posted') },
    ];
    const rows = this.dataSource.data.map(r =>
      `<tr>
        <td style="text-align: center;">${r.DocNum}</td>
        <td style="text-align: center;">${r.Date}</td>
        <td style="text-align: center;">${r.UserName ?? '—'}</td>
        <td style="text-align: center;">${r.TotalDebit.toFixed(3)}</td>
        <td style="text-align: center;">${r.TotalCredit.toFixed(3)}</td>
        <td style="text-align: center;">${r.Post ? '*' : ''}</td>
      </tr>`
    ).join('');

    this.reportService.printReport(title, cols, rows);
  }

  // Changing vType resets the form to a new voucher under the new sequence
  onVTypeChange(): void {
    if (this.vType > 0) {
      this.initNewVoucher();
    }
  }

  // ─── Navigation buttons ──────────────────────────────────
  goFirst(): void {
    if (this.navMinDocNum) this.loadVoucher(this.navMinDocNum);
  }

  goLast(): void {
    if (this.navMaxDocNum) this.loadVoucher(this.navMaxDocNum);
  }

  goPrev(): void {
    this.jvService.getAdjacentDocNum(
      this.docNum, this.myYear, this.vType, this.docType, 'PREV'
    ).subscribe({
      next: res => this.loadVoucher(res.DocNum),
      error: () => this.toastr.info(
        this.translate.instant('JournalVoucher.FirstVoucher'),
        this.translate.instant('General.Info')
      ),
    });
  }

  goNext(): void {
    this.jvService.getAdjacentDocNum(
      this.docNum, this.myYear, this.vType, this.docType, 'NEXT'
    ).subscribe({
      next: res => this.loadVoucher(res.DocNum),
      error: () => this.toastr.info(
        this.translate.instant('JournalVoucher.LastVoucher'),
        this.translate.instant('General.Info')
      ),
    });
  }

  // ─── Lines management ────────────────────────────────────
  addLine(): void {
    this.lines.push({ acc: null, accName: '', debit: 0, credit: 0, des: '', ccntrNo: 0 });
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.splice(index, 1);
  }

  onAccountSelected(index: number, account: ChartOfAccountDto | null): void {
    if (account) {
      this.lines[index].acc = account.no;
      this.lines[index].accName = account.name ?? '';
    }
  }

  onDebitChange(index: number): void {
    if (this.lines[index].debit > 0) this.lines[index].credit = 0;
  }

  onCreditChange(index: number): void {
    if (this.lines[index].credit > 0) this.lines[index].debit = 0;
  }

  // ─── Currency change ─────────────────────────────────────
  onCurrencySelected(currency: CurrencyDto | null): void {
    if (currency) this.rate = currency.lrate ?? 1;
  }

  // ─── Save ────────────────────────────────────────────────
  save(): void {
    if (!this.validateForm()) return;

    const validLines = this.lines.filter(l => l.acc !== null && (l.debit > 0 || l.credit > 0));

    const request: SaveJournalVoucherRequest = {
      TransNum: this.transNum,
      DocNum: this.docNum,
      MyYear: this.myYear,
      VType: this.vType,
      DocType: this.docType,
      BrNo: this.brNo,
      Date: this.date,
      CurNo: this.curNo,
      Rate: this.rate,
      Pay: this.pay,
      UserName: this.userName,
      PDFPath: this.pdfPath || undefined,
      Lines: validLines.map<SaveJournalVoucherLineRequest>(l => ({
        Acc: l.acc!,
        Debit: l.debit,
        Credit: l.credit,
        Des: l.des,
        CCntrNo: l.ccntrNo,
      })),
    };

    this.loading = true;
    this.jvService.save(request).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('JournalVoucher.SavedSuccessfully', { docNum: result.DocNum }),
          this.translate.instant('General.Success')
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  private validateForm(): boolean {
    const validLines = this.lines.filter(l => l.acc !== null && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      this.toastr.warning(
        this.translate.instant('JournalVoucher.MinTwoLines'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (!this.isBalanced) {
      this.toastr.error(
        this.translate.instant('JournalVoucher.NotBalanced'),
        this.translate.instant('General.ValidationError')
      );
      return false;
    }
    if (this.isPosted) {
      this.toastr.warning(
        this.translate.instant('JournalVoucher.PostedCannotEdit'),
        this.translate.instant('General.Warning')
      );
      return false;
    }
    return true;
  }

  // ─── Delete ──────────────────────────────────────────────
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
    this.jvService.delete(this.pendingDeleteTransNum).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('JournalVoucher.DeletedSuccessfully'),
          this.translate.instant('General.Success')
        );
        this.initNewVoucher();
      },
      error: () => { this.loading = false; },
    });
  }

  // ─── Vouchers list ───────────────────────────────────────
  switchToList(): void {
    this.activeTab = 'list';
    this.loadList();
  }

  switchToForm(): void {
    this.activeTab = 'form';
  }

  loadList(): void {
    this.loading = true;
    this.jvService
      .getList(this.myYear, this.vType, this.docType, this.pageIndex + 1, this.pageSize)
      .subscribe({
        next: res => {
          this.allListData = res.Items;
          this.totalItems = res.TotalCount;
          this.dataSource.data = res.Items;
          this._loadedYear = this.myYear;
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
    if (!sort.active || !sort.direction) {
      this.dataSource.data = data;
      return;
    }
    this.dataSource.data = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'DocNum': return this.compare(a.DocNum, b.DocNum, isAsc);
        case 'Date': return this.compare(new Date(a.Date).getTime(), new Date(b.Date).getTime(), isAsc);
        case 'TotalDebit': return this.compare(a.TotalDebit, b.TotalDebit, isAsc);
        case 'TotalCredit': return this.compare(a.TotalCredit, b.TotalCredit, isAsc);
        default: return 0;
      }
    });
  }

  openVoucherFromList(item: JournalVoucherListItemDto): void {
    this.activeTab = 'form';
    this.loadVoucher(item.DocNum);
  }

  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  // ─── Account search ──────────────────────────────────────
  accountSearchFn(term: string, item: ChartOfAccountDto): boolean {
    if (!term) return true;
    term = term.toLowerCase();
    return (item.name?.toLowerCase().includes(term) ?? false)
      || item.no.toString().includes(term);
  }

  // ─── Helpers ─────────────────────────────────────────────
  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ─── Attachments Methods ─────────────────────────────────
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (this.transNum === 0) {
      this.toastr.warning(
        this.translate.instant('JournalVoucher.SaveFirstToAttach'),
        this.translate.instant('General.Warning')
      );
      event.target.value = '';
      return;
    }

    this.loading = true;
    this.jvService.uploadAttachment(this.transNum, file).subscribe({
      next: att => {
        this.attachments.push(att);
        this.toastr.success(
          this.translate.instant('JournalVoucher.FileUploaded'),
          this.translate.instant('General.Success')
        );
        this.loading = false;
        event.target.value = '';
      },
      error: () => {
        this.loading = false;
        event.target.value = '';
      }
    });
  }

  deleteAttachment(att: JournalVoucherAttachmentDto): void {
    this.pendingDeleteAttachment = att;
    this.modalRef = this.modalService.open(this.attDeleteConfirmModal, {
      centered: true, size: 'sm', backdrop: 'static',
    });
  }

  executeDeleteAttachment(): void {
    if (!this.pendingDeleteAttachment) return;
    const attId = this.pendingDeleteAttachment.Id;

    this.modalRef?.close();
    this.loading = true;
    this.jvService.deleteAttachment(attId).subscribe({
      next: () => {
        this.attachments = this.attachments.filter(a => a.Id !== attId);
        this.toastr.success(
          this.translate.instant('JournalVoucher.FileDeleted'),
          this.translate.instant('General.Success')
        );
        this.loading = false;
        this.pendingDeleteAttachment = null;
      },
      error: () => {
        this.loading = false;
        this.pendingDeleteAttachment = null;
      },
    });
  }

  downloadAttachment(att: JournalVoucherAttachmentDto): void {
    this.jvService.downloadAttachment(att.Id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.FileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => { }
    });
  }

  viewAttachment(att: JournalVoucherAttachmentDto): void {
    this.jvService.downloadAttachment(att.Id).subscribe({
      next: blob => {
        const type = att.ContentType || 'application/octet-stream';
        const file = new Blob([blob], { type: type });
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
      },
      error: () => { }
    });
  }
}
