import {
  Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FlatpickrModule, FlatpickrDefaults } from 'angularx-flatpickr';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

import {
  CheqTrackingService,
  CheqTrackingListItemDto,
  CheqTrackingLineDto,
  SaveCheqTrackingRequest,
  SaveCheqTrackingLine,
} from '../../../shared/services/cheq-tracking.service';

import { CurrencyService, CurrencyDto } from '../../../shared/services/currency.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';

export interface CheqTrackingLine {
  cheqNum: string;
  date1: string;
  amt: number;
  ben: string;
  bankAcc: number;
  acc2: number;
  acc2Name: string;
  docNum: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-cheq-tracking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgSelectModule,
    SharedModule,
    FlatpickrModule,
    MatPaginatorModule,
    HasPermissionDirective,
  ],
  providers: [NgbModalConfig, NgbModal, FlatpickrDefaults],
  templateUrl: './cheq-tracking.component.html',
  styleUrls: ['./cheq-tracking.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CheqTrackingComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  // ─── Header ────────────────────────────────────────────────
  docNo      = 0;
  _loadedDocNo = 0;
  myYear     = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  private _loadedYear = this.myYear;
  vType      = 0;
  brNo       = 0;
  date       = this.today();
  curNo      = 1;
  curRate    = 1;
  isPosted   = false;

  // ─── Period filter (احضار) ─────────────────────────────────
  periodFrom = '';
  periodTo   = '';

  // ─── Grid ──────────────────────────────────────────────────
  lines: CheqTrackingLine[] = [];

  get totalAmt(): number {
    return this.lines
      .filter(l => l.isSelected)
      .reduce((s, l) => s + (l.amt || 0), 0);
  }

  get selectedCount(): number {
    return this.lines.filter(l => l.isSelected).length;
  }

  get allSelected(): boolean {
    return this.lines.length > 0 && this.lines.every(l => l.isSelected);
  }

  // ─── Lookups ───────────────────────────────────────────────
  voucherSerials: VoucherSerial[] = [];
  currencies: CurrencyDto[] = [];

  // ─── List tab ──────────────────────────────────────────────
  activeTab    = 'form';
  listItems: CheqTrackingListItemDto[] = [];
  listTotal    = 0;
  listPage     = 1;
  listPageSize = 20;

  // ─── Row expand ────────────────────────────────────────────
  expandedRowKey: string | null = null;
  rowLinesCache = new Map<string, CheqTrackingLineDto[]>();
  expandLoadingKey: string | null = null;

  private rowKey(row: CheqTrackingListItemDto): string {
    return `${row.DocNo}|${row.VType}`;
  }

  toggleRowExpand(row: CheqTrackingListItemDto): void {
    const key = this.rowKey(row);
    if (this.expandedRowKey === key) { this.expandedRowKey = null; return; }
    this.expandedRowKey = key;
    if (!this.rowLinesCache.has(key)) {
      this.expandLoadingKey = key;
      this.svc.getVoucher(row.DocNo, this.myYear, row.VType).subscribe({
        next: v => {
          this.rowLinesCache.set(key, v.Lines);
          if (this.expandLoadingKey === key) this.expandLoadingKey = null;
        },
        error: () => { if (this.expandLoadingKey === key) this.expandLoadingKey = null; },
      });
    }
  }

  isRowExpanded(row: CheqTrackingListItemDto): boolean {
    return this.expandedRowKey === this.rowKey(row);
  }

  isRowLoading(row: CheqTrackingListItemDto): boolean {
    return this.expandLoadingKey === this.rowKey(row);
  }

  getExpandedLines(row: CheqTrackingListItemDto): CheqTrackingLineDto[] {
    return this.rowLinesCache.get(this.rowKey(row)) ?? [];
  }

  // ─── Navigation ────────────────────────────────────────────
  minDocNo = 0;
  maxDocNo = 0;

  // ─── Flatpickr ─────────────────────────────────────────────
  dateOptions:       any = {};
  periodFromOptions: any = {};
  periodToOptions:   any = {};

  get numFmt(): string {
    const d = this.cs.decimals; return `1.${d}-${d}`;
  }

  modalRef?: NgbModalRef;
  private _deleteDocNo = 0;

  constructor(
    private svc:       CheqTrackingService,
    private currSvc:   CurrencyService,
    private vSerSvc:   VoucherSerialService,
    private cs:        CompanySettingsService,
    private toastr:    ToastrService,
    private translate: TranslateService,
    private modal:     NgbModal,
  ) {}

  ngOnInit(): void {
    this.dateOptions = this.buildDateOptions(this.myYear);
    this.periodFromOptions = { dateFormat: 'Y-m-d', allowInput: true };
    this.periodToOptions   = { dateFormat: 'Y-m-d', allowInput: true };
    this.loadLookups();
  }

  private loadLookups(): void {
    this.currSvc.getAll().subscribe(d => this.currencies = d);
    this.vSerSvc.getAll(14).subscribe(d => {
      this.voucherSerials = d;
      if (d.length > 0 && !this.vType) {
        this.vType = d[0].VSerialNo;
        this.brNo  = d[0].BR_No;
        this.initNew();
      }
    });
  }

  // ─── Date helpers ──────────────────────────────────────────
  private buildDateOptions(year: number): any {
    return { dateFormat: 'Y-m-d', allowInput: true,
             minDate: `${year}-01-01`, maxDate: `${year}-12-31` };
  }

  onDateChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.date = this.today();
  }

  onPeriodFromChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.periodFrom = '';
  }

  onPeriodToChange(ev: { selectedDates: Date[] }): void {
    if (!ev.selectedDates?.length) this.periodTo = '';
  }

  // ─── Year / VType change ───────────────────────────────────
  onYearChange(): void {
    this.myYear = Math.min(Math.max(this.myYear, 1900), this.currentYear);
    if (this.myYear >= 1000 && this.myYear <= 9999 && this.myYear !== this._loadedYear) {
      this.dateOptions = this.buildDateOptions(this.myYear);
      if (this.activeTab === 'form') this.initNew();
      else this.loadList();
    }
  }

  onDocNoChange(): void {
    const max = this.maxDocNo + 1;
    if (!this.docNo || this.docNo < 1 || this.docNo > max) {
      this.docNo = max; return;
    }
    if (this.docNo !== this._loadedDocNo) this.loadVoucher(this.docNo);
  }

  onVTypeChange(): void {
    const s = this.voucherSerials.find(x => x.VSerialNo === this.vType);
    if (s) this.brNo = s.BR_No;
    this.initNew();
  }

  onCurrencyChange(): void {
    const c = this.currencies.find(x => x.cur_no === this.curNo);
    if (c) this.curRate = c.lrate ?? 1;
  }

  // ─── Init new voucher ──────────────────────────────────────
  initNew(): void {
    this._loadedYear  = this.myYear;
    this.isPosted     = false;
    this.lines        = [];
    this.periodFrom   = '';
    this.periodTo     = '';

    if (!this.vType) return;
    this.svc.getNextDocNo(this.myYear, this.vType).subscribe({
      next: n => {
        this.docNo          = n;
        this._loadedDocNo   = 0;
        this.date           = this.dateForYear(this.myYear);
      },
      error: () => {}
    });
    this.loadNavigation();
  }

  // ─── Load voucher ─────────────────────────────────────────
  loadVoucher(docNo: number): void {
    if (!docNo || !this.vType) return;
    this.svc.getVoucher(docNo, this.myYear, this.vType).subscribe({
      next: v => {
        const h = v.Header;
        this.docNo        = h.DocNo;
        this._loadedDocNo = h.DocNo;
        this._loadedYear  = h.MyYear;
        this.date         = h.Date?.substring(0, 10) ?? this.today();
        this.brNo         = h.BrNo;
        this.curNo        = h.CurNo;
        this.curRate      = h.CurRate;
        this.isPosted     = h.IsPosted;
        this.lines = v.Lines.map(l => ({
          cheqNum:  l.CheqNum ?? '',
          date1:    l.Date1?.substring(0, 10) ?? '',
          amt:      l.Amt,
          ben:      l.Ben ?? '',
          bankAcc:  l.BankAcc,
          acc2:     l.Acc2,
          acc2Name: l.Acc2Name ?? '',
          docNum:   l.DocNum ?? '',
          isSelected: true,
        }));
      },
      error: () => this.toastr.error(
        this.translate.instant('CheqTracking.NotFound'))
    });
  }

  // ─── احضار: fetch available cheques by period ──────────────
  fetchCheques(): void {
    if (!this.vType) {
      this.toastr.warning(this.translate.instant('CheqTracking.SelectVType'));
      return;
    }
    this.svc.getAvailableCheques(this.vType, this.periodFrom, this.periodTo).subscribe({
      next: list => {
        this.lines = list.map(c => ({
          cheqNum:  c.CheqNum,
          date1:    c.Date1?.substring(0, 10) ?? '',
          amt:      c.Amt * (c.Rate || 1),
          ben:      c.Ben ?? '',
          bankAcc:  c.BankAcc,
          acc2:     c.Acc2,
          acc2Name: c.Acc2Name ?? '',
          docNum:   c.DocNum ?? '',
          isSelected: false,
        }));
        if (!list.length)
          this.toastr.info(this.translate.instant('CheqTracking.NoCheques'));
      },
      error: () => this.toastr.error(this.translate.instant('CheqTracking.FetchError'))
    });
  }

  // ─── Selection ────────────────────────────────────────────
  toggleAll(checked: boolean): void {
    this.lines.forEach(l => l.isSelected = checked);
  }

  removeLine(i: number): void {
    if (this.lines.length > 0) this.lines.splice(i, 1);
  }

  // ─── Navigation ───────────────────────────────────────────
  loadNavigation(): void {
    if (!this.vType) return;
    this.svc.getNavigation(this.myYear, this.vType).subscribe({
      next: nav => { this.minDocNo = nav.MinDocNo; this.maxDocNo = nav.MaxDocNo; },
      error: () => {}
    });
  }

  goFirst(): void { if (this.minDocNo) this.loadVoucher(this.minDocNo); }
  goLast():  void { if (this.maxDocNo) this.loadVoucher(this.maxDocNo); }

  goPrev(): void {
    if (!this._loadedDocNo || !this.vType) return;
    this.svc.getAdjacentDocNo(this._loadedDocNo, this.myYear, this.vType, 'prev').subscribe({
      next: n => { if (n) this.loadVoucher(n); else
        this.toastr.info(this.translate.instant('CheqTracking.FirstDoc')); },
      error: () => {}
    });
  }

  goNext(): void {
    if (!this._loadedDocNo || !this.vType) return;
    this.svc.getAdjacentDocNo(this._loadedDocNo, this.myYear, this.vType, 'next').subscribe({
      next: n => { if (n) this.loadVoucher(n); else
        this.toastr.info(this.translate.instant('CheqTracking.LastDoc')); },
      error: () => {}
    });
  }

  // ─── Tab ──────────────────────────────────────────────────
  switchTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'list') this.loadList();
    else                this.loadNavigation();
  }

  // ─── List ─────────────────────────────────────────────────
  loadList(): void {
    this._loadedYear = this.myYear;
    this.expandedRowKey = null;
    this.rowLinesCache.clear();
    this.svc.getList(this.myYear, this.vType, this.listPage, this.listPageSize).subscribe({
      next: r => { this.listItems = r.items; this.listTotal = r.total; },
      error: () => {}
    });
  }

  onListPageChange(e: PageEvent): void {
    this.listPage     = e.pageIndex + 1;
    this.listPageSize = e.pageSize;
    this.loadList();
  }

  openFromList(item: CheqTrackingListItemDto): void {
    this.vType  = item.VType;
    this.dateOptions = this.buildDateOptions(this.myYear);
    this.activeTab = 'form';
    this.loadVoucher(item.DocNo);
    this.loadNavigation();
  }

  // ─── Save ─────────────────────────────────────────────────
  save(): void {
    if (!this.validate()) return;

    const selected = this.lines.filter(l => l.isSelected);
    const req: SaveCheqTrackingRequest = {
      docNo:   this._loadedDocNo,
      myYear:  this.myYear,
      vType:   this.vType,
      date:    this.date,
      brNo:    this.brNo,
      curNo:   this.curNo,
      curRate: this.curRate,
      lines:   selected.map<SaveCheqTrackingLine>(l => ({
        cheqNum: l.cheqNum,
        bankAcc: l.bankAcc,
        acc2:    l.acc2,
        amt:     l.amt,
      })),
    };

    this.svc.save(req).subscribe({
      next: r => {
        this._loadedDocNo = r.DocNo;
        this.docNo        = r.DocNo;
        this.toastr.success(this.translate.instant('CheqTracking.SaveSuccess'));
        this.loadNavigation();
        this.loadVoucher(r.DocNo);
      },
      error: e => this.toastr.error(e.message ?? this.translate.instant('CheqTracking.SaveError'))
    });
  }

  private validate(): boolean {
    if (!this.vType) {
      this.toastr.warning(this.translate.instant('CheqTracking.SelectVType'));
      return false;
    }
    if (!this.date) {
      this.toastr.warning(this.translate.instant('CheqTracking.EnterDate'));
      return false;
    }
    if (!this.curNo) {
      this.toastr.warning(this.translate.instant('CheqTracking.EnterCurrency'));
      return false;
    }
    if (!this.curRate) {
      this.toastr.warning(this.translate.instant('CheqTracking.EnterRate'));
      return false;
    }
    const selected = this.lines.filter(l => l.isSelected);
    if (selected.length === 0) {
      this.toastr.warning(this.translate.instant('CheqTracking.SelectAtLeastOne'));
      return false;
    }
    return true;
  }

  // ─── Delete ───────────────────────────────────────────────
  confirmDelete(): void {
    if (!this._loadedDocNo) return;
    this._deleteDocNo = this._loadedDocNo;
    this.modalRef = this.modal.open(this.deleteConfirmModal, { centered: true });
  }

  executeDelete(): void {
    this.modalRef?.close();
    this.svc.delete(this._deleteDocNo, this.myYear, this.vType).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('CheqTracking.DeleteSuccess'));
        this.initNew();
      },
      error: e => this.toastr.error(e.message ?? this.translate.instant('CheqTracking.DeleteError'))
    });
  }

  // ─── Print ────────────────────────────────────────────────
  print(): void {
    if (!this._loadedDocNo) return;
    this.toastr.info(this.translate.instant('CheqTracking.PrintNotImplemented'));
  }

  // ─── Helpers ──────────────────────────────────────────────
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dateForYear(year: number): string {
    const today = new Date();
    if (today.getFullYear() === year) return this.today();
    return `${year}-01-01`;
  }
}
