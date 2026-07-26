import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';

import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService } from '../../../shared/services/report.service';
import {
  PurchaseOrderDocService, PurchaseOrderDoc, PurchaseOrderDocLine,
  PurchaseOrderDocListRow, PurchaseOrderDocLookups, PoDocSource, PO_STATUS,
} from '../../../shared/services/purchase-order-doc.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { PurchaseOrderService } from '../../../shared/services/purchase-order.service';

/** A grid row; carries the picked item's units for the UoM dropdown. */
interface PoLine extends PurchaseOrderDocLine {
  units: { UnitNo: number; UnitName?: string | null; Operand?: number | null }[];
}

@Component({
  selector: 'app-purchase-order-doc',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule,
    SharedModule, ConfirmationModalComponent, HasPermissionDirective,
    PaginatePipe, PaginatorComponent, ReportExportComponent,
  ],
  templateUrl: './purchase-order-doc.component.html',
  styleUrls: ['./purchase-order-doc.component.scss'],
})
export class PurchaseOrderDocComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  readonly currentYear = new Date().getFullYear();
  readonly ST = PO_STATUS;

  activeTab: 'form' | 'list' = 'form';

  hdr = this.initHdr();
  lines: PoLine[] = [this.newLine()];
  /** Expected delivery dates when تواريخ تسليم متعددة is ticked. */
  delvDates: { date: string; note: string }[] = [{ date: '', note: '' }];
  lookups: PurchaseOrderDocLookups = {
    Vendors: [], Currencies: [], PaymentTerms: [], Stores: [], Taxes: [], SourceOrders: [],
  };
  allItems: ItemListRow[] = [];

  orders: PurchaseOrderDocListRow[] = [];
  listFilter = '';
  listStatus: number | null = null;
  page = 1;
  pageSize = 10;

  isExisting = false;
  saving = false;

  readonly pCreate  = 'PurchaseOrderDoc.Create';
  readonly pDelete  = 'PurchaseOrderDoc.Delete';
  readonly pApprove = 'PurchaseOrderDoc.Approve';
  readonly pCancel  = 'PurchaseOrderDoc.Cancel';
  readonly pPrint   = 'PurchaseOrderDoc.Print';

  readonly statusOptions = [
    { v: null as number | null, k: 'PurchaseOrderDoc.StatusAll' },
    { v: PO_STATUS.Draft,     k: 'PurchaseOrderDoc.StatusDraft' },
    { v: PO_STATUS.Pending,   k: 'PurchaseOrderDoc.StatusPending' },
    { v: PO_STATUS.Approved,  k: 'PurchaseOrderDoc.StatusApproved' },
    { v: PO_STATUS.Closed,    k: 'PurchaseOrderDoc.StatusClosed' },
    { v: PO_STATUS.Cancelled, k: 'PurchaseOrderDoc.StatusCancelled' },
  ];

  constructor(
    private svc: PurchaseOrderDocService,
    private poSvc: PurchaseOrderService,
    private itemSvc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** Only a draft may be edited; every later state is part of the audit trail. */
  get readOnly(): boolean { return this.hdr.status !== PO_STATUS.Draft; }

  private initHdr() {
    return {
      year: new Date().getFullYear(),
      poNo: '',
      podate: this.today(),
      delvDate: '',
      multiDelv: false,
      venNo: null as number | null,
      venTaxNo: '',
      curNo: 1,
      rate: 1,
      cluse: null as number | null,
      storeNo: null as number | null,
      sourcePONo: '' as string | null,
      sourcePOYear: 0,
      sourcePOVType: 0,
      remarks: '',
      // widened: PO_STATUS is `as const`, so this would otherwise narrow to the
      // literal 0 and every comparison against another status becomes an error
      status: PO_STATUS.Draft as number,
    };
  }

  private newLine(): PoLine {
    return {
      ItemNo: '', ItemName: '', UnitNo: null, UnitName: '', UnitRate: 1,
      Qty: 0, UnitPrice: 0, DiscPerc: 0, TaxNo: null, StoreNo: null,
      IsFreeGoods: false, Barcode: '', Note: '', units: [],
    };
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.svc.lookups().subscribe({ next: l => { this.lookups = l; this.refreshSources(); }, error: () => {} });
    this.itemSvc.list().subscribe({ next: d => (this.allItems = d || []), error: () => {} });
    this.refreshNextNo();
    this.loadList();
  }

  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  refreshNextNo(): void {
    if (this.isExisting) return;
    this.svc.nextNo(this.hdr.year).subscribe({
      next: r => (this.hdr.poNo = r?.nextNo || ''),
      error: () => (this.hdr.poNo = ''),
    });
  }

  // ─── status presentation ─────────────────────────────────────
  /** The happy-path lifecycle, shown as a stepper. Cancelled sits off it. */
  readonly lifecycle = [
    { s: PO_STATUS.Draft,    k: 'PurchaseOrderDoc.StatusDraft' },
    { s: PO_STATUS.Pending,  k: 'PurchaseOrderDoc.StatusPending' },
    { s: PO_STATUS.Approved, k: 'PurchaseOrderDoc.StatusApproved' },
    { s: PO_STATUS.Closed,   k: 'PurchaseOrderDoc.StatusClosed' },
  ];

  get isCancelled(): boolean { return this.hdr.status === PO_STATUS.Cancelled; }

  /** One lifecycle step's state: 'done' | 'current' | 'todo'. */
  stepState(s: number): 'done' | 'current' | 'todo' {
    if (this.hdr.status === s) return 'current';
    return this.hdr.status > s && !this.isCancelled ? 'done' : 'todo';
  }

  statusKey(s: number): string {
    switch (s) {
      case PO_STATUS.Pending:   return 'PurchaseOrderDoc.StatusPending';
      case PO_STATUS.Approved:  return 'PurchaseOrderDoc.StatusApproved';
      case PO_STATUS.Closed:    return 'PurchaseOrderDoc.StatusClosed';
      case PO_STATUS.Cancelled: return 'PurchaseOrderDoc.StatusCancelled';
      default:                  return 'PurchaseOrderDoc.StatusDraft';
    }
  }

  /** Draft grey, pending amber, approved green, closed blue, cancelled red. */
  statusClass(s: number): string {
    switch (s) {
      case PO_STATUS.Pending:   return 'badge bg-warning text-dark';
      case PO_STATUS.Approved:  return 'badge bg-success';
      case PO_STATUS.Closed:    return 'badge bg-primary';
      case PO_STATUS.Cancelled: return 'badge bg-danger';
      default:                  return 'badge bg-secondary';
    }
  }

  // ─── expected delivery date(s) ───────────────────────────────
  /** Toggling the checkbox seeds the list from the single date (and back). */
  onMultiDelvToggle(): void {
    if (this.hdr.multiDelv) {
      this.delvDates = this.hdr.delvDate ? [{ date: this.hdr.delvDate, note: '' }] : [{ date: '', note: '' }];
    } else {
      const first = this.delvDates.find(d => d.date);
      this.hdr.delvDate = first ? first.date : '';
    }
  }

  addDelvDate(): void { if (!this.readOnly) this.delvDates.push({ date: '', note: '' }); }

  removeDelvDate(i: number): void {
    if (this.readOnly) return;
    this.delvDates.splice(i, 1);
    if (!this.delvDates.length) this.delvDates.push({ date: '', note: '' });
  }

  private filledDelvDates(): { date: string; note: string }[] {
    return this.delvDates.filter(d => (d.date || '').trim());
  }

  // ─── vendor / currency ───────────────────────────────────────
  onVendorChange(): void {
    const v = this.lookups.Vendors.find(x => x.VenNo === this.hdr.venNo);
    this.hdr.venTaxNo = v?.TaxId || '';
  }

  onCurrencyChange(): void {
    const c = this.lookups.Currencies.find(x => x.CurNo === this.hdr.curNo);
    if (c) this.hdr.rate = +c.Rate || 1;
  }

  /** Target warehouse cascades to any line that has none yet. */
  onStoreChange(): void {
    this.lines.forEach(l => { if (!l.StoreNo) l.StoreNo = this.hdr.storeNo; });
  }

  // ─── grid ────────────────────────────────────────────────────
  itemSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Barcode || '').toLowerCase().includes(term);
  };

  addLine(): void { if (!this.readOnly) this.lines.push(this.newLine()); }

  removeLine(i: number): void {
    if (this.readOnly) return;
    this.lines.splice(i, 1);
    if (!this.lines.length) this.lines.push(this.newLine());
  }

  /** Item picked: fill the description, load its units, and seed the price with
   *  what this vendor last charged. */
  onItemPick(l: PoLine): void {
    const no = (l.ItemNo || '').toString().trim();
    if (!no) return;
    const found = this.allItems.find(x => (x.ItemNo || '').toString().trim() === no);
    if (found) l.ItemName = this.isAr ? found.ItemName : (found.Ename || found.ItemName);
    if (!l.StoreNo) l.StoreNo = this.hdr.storeNo;

    this.poSvc.itemDetails(no).subscribe({
      next: d => {
        l.units = (d?.Units || []).map(u => ({ UnitNo: u.UnitNo, UnitName: u.UnitName, Operand: u.Operand }));
        if (l.units.length && !l.UnitNo) this.onUnitPick(l, l.units[0].UnitNo);
        if (!l.Barcode) l.Barcode = d?.Barcode || '';
      },
      error: () => (l.units = []),
    });

    this.svc.lastPrice(no, this.hdr.venNo).subscribe({
      next: p => { if (!l.UnitPrice && p?.LastPrice) l.UnitPrice = +p.LastPrice; },
      error: () => {},
    });
  }

  onUnitPick(l: PoLine, unitNo?: number | null): void {
    const no = unitNo ?? l.UnitNo;
    l.UnitNo = no ?? null;
    const u = (l.units || []).find(x => x.UnitNo === no);
    if (u) { l.UnitName = u.UnitName; l.UnitRate = u.Operand || 1; }
  }

  /** Marking a line as free goods legitimises a zero price. */
  onFreeGoodsChange(l: PoLine): void {
    if (l.IsFreeGoods) l.UnitPrice = 0;
  }

  // ─── line + document money ───────────────────────────────────
  private itemLines(): PoLine[] {
    return this.lines.filter(l => (l.ItemNo || '').toString().trim());
  }

  gross(l: PoLine): number { return (+(l.Qty || 0)) * (+(l.UnitPrice || 0)); }

  discAmt(l: PoLine): number {
    return +((this.gross(l) * (+(l.DiscPerc || 0))) / 100).toFixed(4);
  }

  lineTotal(l: PoLine): number { return +(this.gross(l) - this.discAmt(l)).toFixed(4); }

  taxPerc(l: PoLine): number {
    const t = this.lookups.Taxes.find(x => x.TaxNo === l.TaxNo);
    return t ? +t.Perc : 0;
  }

  taxAmt(l: PoLine): number {
    return +((this.lineTotal(l) * this.taxPerc(l)) / 100).toFixed(4);
  }

  get subtotal(): number {
    return +this.itemLines().reduce((s, l) => s + this.lineTotal(l), 0).toFixed(4);
  }

  get totalDiscount(): number {
    return +this.itemLines().reduce((s, l) => s + this.discAmt(l), 0).toFixed(4);
  }

  get totalTax(): number {
    return +this.itemLines().reduce((s, l) => s + this.taxAmt(l), 0).toFixed(4);
  }

  get grandTotal(): number { return +(this.subtotal + this.totalTax).toFixed(4); }

  // ─── source طلب الشراء ───────────────────────────────────────
  /** Every purchase request, regardless of status, so any can be picked and its
   *  data loaded. Already-linked ones are just marked (see the option template),
   *  not hidden. A stable field, not a getter — ng-select's [items] must not get
   *  a fresh array on every change-detection pass or selection breaks. */
  sourceOrders: PoDocSource[] = [];

  private refreshSources(): void {
    this.sourceOrders = this.lookups.SourceOrders || [];
  }

  onSourceChange(): void {
    const src = this.lookups.SourceOrders.find(x => x.OrderNo === this.hdr.sourcePONo);
    if (!src) { this.hdr.sourcePOYear = 0; this.hdr.sourcePOVType = 0; return; }
    this.hdr.sourcePOYear = src.Myear;
    this.hdr.sourcePOVType = src.VType;
    // the request already knows its vendor - carry it over
    if (!this.hdr.venNo && src.VenNo) { this.hdr.venNo = src.VenNo; this.onVendorChange(); }
  }

  loadFromRequest(): void {
    const no = (this.hdr.sourcePONo || '').toString().trim();
    if (!no) { this.toastr.warning(this.translate.instant('PurchaseOrderDoc.PickSourceFirst')); return; }
    this.svc.fromRequest(no, this.hdr.sourcePOYear || null, this.hdr.sourcePOVType || null).subscribe({
      next: rows => {
        if (!rows || !rows.length) { this.toastr.info(this.translate.instant('PurchaseOrderDoc.SourceEmpty')); return; }
        const mapped: PoLine[] = rows.map(r => ({ ...r, IsFreeGoods: false, units: [] }));
        const existing = this.itemLines();
        this.lines = existing.length ? [...existing, ...mapped] : mapped;
        this.lines.forEach(l => { if (l.ItemNo) this.onItemPick(l); });
        this.toastr.success(this.translate.instant('PurchaseOrderDoc.SourceLoaded', { n: mapped.length }));
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── load / save ─────────────────────────────────────────────
  onPoNoChange(): void {
    const no = (this.hdr.poNo || '').toString().trim();
    if (no) this.load(no);
  }

  openRow(row: PurchaseOrderDocListRow): void {
    this.activeTab = 'form';
    this.load(row.PONo);
  }

  load(poNo: string): void {
    this.svc.get(poNo, this.hdr.year).subscribe({
      next: (o: PurchaseOrderDoc) => {
        this.hdr = {
          year: o.Myear || this.hdr.year,
          poNo: o.PONo || '',
          podate: (o.PODate || '').toString().slice(0, 10) || this.today(),
          delvDate: (o.DelvDate || '').toString().slice(0, 10),
          multiDelv: !!o.MultiDelv,
          venNo: o.VenNo || null,
          venTaxNo: o.VenTaxNo || '',
          curNo: o.CurNo || 1,
          rate: o.Rate || 1,
          cluse: o.Cluse || null,
          storeNo: o.StoreNo || null,
          sourcePONo: o.SourcePONo || '',
          sourcePOYear: o.SourcePOYear || 0,
          sourcePOVType: o.SourcePOVType || 0,
          remarks: o.Remarks || '',
          status: o.Status ?? PO_STATUS.Draft,
        };
        const dd = (o.DelvDates || []).map(x => ({ date: (x.DelvDate || '').toString().slice(0, 10), note: x.Note || '' }))
          .filter(x => x.date);
        this.delvDates = dd.length ? dd : [{ date: '', note: '' }];
        this.lines = (o.Lines && o.Lines.length ? o.Lines : [this.newLine()])
          .map(l => ({ ...l, IsFreeGoods: !!l.IsFreeGoods, units: [] }));
        this.lines.forEach(l => { if (l.ItemNo) this.onItemPick(l); });
        this.isExisting = true;
        this.refreshSources();   // keep this order's own (now-linked) source visible
      },
      error: err => {
        if (err?.status === 404) { this.isExisting = false; }
        else this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  /** Mirrors the server-side rules so problems surface before the round trip. */
  private validate(): boolean {
    const w = (k: string) => { this.toastr.warning(this.translate.instant(k)); return false; };
    if (!(this.hdr.poNo || '').toString().trim()) return w('PurchaseOrderDoc.PoNoRequired');
    if (!this.hdr.venNo) return w('PurchaseOrderDoc.VendorRequired');
    if (this.hdr.multiDelv) {
      if (!this.filledDelvDates().length) return w('PurchaseOrderDoc.DelvNoDates');
    } else if (!this.hdr.delvDate) {
      return w('PurchaseOrderDoc.DelvDateRequired');
    }
    const items = this.itemLines();
    if (!items.length) return w('PurchaseOrderDoc.NoLines');
    if (items.some(l => !(+(l.Qty || 0) > 0))) return w('PurchaseOrderDoc.QtyRequired');
    // a zero price is only legitimate on a free-goods line
    if (items.some(l => !(+(l.UnitPrice || 0) > 0) && !l.IsFreeGoods)) return w('PurchaseOrderDoc.PriceRequired');
    return true;
  }

  private payload(): PurchaseOrderDoc {
    return {
      PONo: this.hdr.poNo.trim(),
      Myear: this.hdr.year,
      PODate: this.hdr.podate,
      DelvDate: this.hdr.multiDelv ? null : this.hdr.delvDate,
      MultiDelv: this.hdr.multiDelv,
      DelvDates: this.hdr.multiDelv
        ? this.filledDelvDates().map(d => ({ DelvDate: d.date, Note: d.note }))
        : (this.hdr.delvDate ? [{ DelvDate: this.hdr.delvDate, Note: null }] : []),
      VenNo: this.hdr.venNo!,
      CurNo: this.hdr.curNo,
      Rate: +this.hdr.rate || 1,
      Cluse: this.hdr.cluse || 0,
      StoreNo: this.hdr.storeNo || 0,
      SourcePONo: this.hdr.sourcePONo || null,
      SourcePOYear: this.hdr.sourcePOYear || 0,
      SourcePOVType: this.hdr.sourcePOVType || 0,
      Subtotal: this.subtotal,
      TotalDiscount: this.totalDiscount,
      TotalTax: this.totalTax,
      GrandTotal: this.grandTotal,
      Remarks: this.hdr.remarks,
      Status: this.hdr.status,
      Lines: this.itemLines().map((l, i) => ({
        LineNum: i + 1,
        ItemNo: (l.ItemNo || '').toString().trim(),
        ItemName: l.ItemName,
        UnitNo: l.UnitNo,
        UnitRate: l.UnitRate,
        Qty: l.Qty,
        UnitPrice: l.UnitPrice,
        DiscPerc: l.DiscPerc,
        TaxNo: l.TaxNo,
        StoreNo: l.StoreNo,
        IsFreeGoods: !!l.IsFreeGoods,
        Barcode: l.Barcode,
        Note: l.Note,
      })),
    };
  }

  save(then?: 'submit'): void {
    if (this.readOnly) { this.toastr.warning(this.translate.instant('PurchaseOrderDoc.LockedForEdit')); return; }
    if (!this.validate()) return;
    this.saving = true;
    this.svc.save(this.payload()).subscribe({
      next: () => {
        this.saving = false;
        this.isExisting = true;
        this.toastr.success(this.translate.instant('PurchaseOrderDoc.Saved', { no: this.hdr.poNo }));
        this.loadList();
        if (then === 'submit') this.setStatus('submit');
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  setStatus(action: string, reason?: string): void {
    const no = (this.hdr.poNo || '').toString().trim();
    if (!no) return;
    this.svc.setStatus(no, this.hdr.year, action, reason).subscribe({
      next: r => {
        this.hdr.status = r?.status ?? this.hdr.status;
        this.toastr.success(this.translate.instant('PurchaseOrderDoc.StatusChanged',
          { s: this.translate.instant(this.statusKey(this.hdr.status)) }));
        this.loadList();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  reset(): void {
    const year = this.hdr.year;
    this.hdr = this.initHdr();
    this.hdr.year = year;
    this.lines = [this.newLine()];
    this.delvDates = [{ date: '', note: '' }];
    this.isExisting = false;
    this.refreshSources();   // fresh doc: show every currently-available request
    this.refreshNextNo();
  }

  confirmDelete(): void { if (this.isExisting) this.confirmModal.show(); }

  doDelete(): void {
    this.svc.delete(this.hdr.poNo, this.hdr.year).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('General.DeleteSuccess'));
        this.reset();
        this.loadList();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── list ────────────────────────────────────────────────────
  loadList(): void {
    this.svc.list(this.hdr.year, { status: this.listStatus }).subscribe({
      next: d => (this.orders = d || []),
      error: () => (this.orders = []),
    });
  }

  get filteredOrders(): PurchaseOrderDocListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.orders;
    return this.orders.filter(r =>
      (r.PONo || '').toLowerCase().includes(t) || (r.VenName || '').toLowerCase().includes(t));
  }

  // ─── print ───────────────────────────────────────────────────
  private esc(v: any): string {
    return (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
  }

  private n3(v: any): string {
    return (+(v || 0)).toLocaleString('en-US', { maximumFractionDigits: 3 });
  }

  print(): void {
    if (this.activeTab === 'list') { this.printList(); return; }
    this.printDoc();
  }

  private printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const rows0 = this.filteredOrders;
    if (!rows0.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('PurchaseOrderDoc.PoNo') }, { label: t('PurchaseOrderDoc.PoDate') },
      { label: t('PurchaseOrderDoc.Vendor') }, { label: t('PurchaseOrderDoc.SourcePo') },
      { label: t('PurchaseOrderDoc.GrandTotal') }, { label: t('PurchaseOrderDoc.Status') },
    ];
    const rows = rows0.map(r => `<tr>` +
      `<td>${this.esc(r.PONo)}</td><td>${this.esc((r.PODate || '').toString().slice(0, 10))}</td>` +
      `<td>${this.esc(r.VenName)}</td><td>${this.esc(r.SourcePONo)}</td>` +
      `<td>${this.esc(this.n3(r.GrandTotal))}</td>` +
      `<td>${this.esc(t(this.statusKey(r.Status)))}</td></tr>`).join('');
    const grand = rows0.reduce((s, r) => s + (+(r.GrandTotal || 0)), 0);
    const footerHtml = `<div style="text-align:end">${this.esc(t('PurchaseOrderDoc.GrandTotal'))}: <b>${this.esc(this.n3(grand))}</b></div>`;
    this.reportService.printReport(t('PurchaseOrderDoc.ListTab'), cols, rows, '', footerHtml);
  }

  private printDoc(): void {
    const t = (k: string) => this.translate.instant(k);
    const items = this.itemLines();
    if (!items.length) { this.toastr.warning(t('PurchaseOrderDoc.NoLines')); return; }
    const cols = [
      { label: '#' }, { label: t('PurchaseOrderDoc.ItemCode') }, { label: t('PurchaseOrderDoc.Description') },
      { label: t('PurchaseOrderDoc.Uom') }, { label: t('PurchaseOrderDoc.Qty') },
      { label: t('PurchaseOrderDoc.UnitPrice') }, { label: t('PurchaseOrderDoc.DiscPerc') },
      { label: t('PurchaseOrderDoc.Tax') }, { label: t('PurchaseOrderDoc.LineTotal') },
    ];
    const rows = items.map((l, i) => `<tr>` +
      `<td>${i + 1}</td><td>${this.esc(l.ItemNo)}</td><td>${this.esc(l.ItemName)}</td>` +
      `<td>${this.esc(l.UnitName)}</td><td>${this.esc(this.n3(l.Qty))}</td>` +
      `<td>${this.esc(this.n3(l.UnitPrice))}</td><td>${this.esc(this.n3(l.DiscPerc))}%</td>` +
      `<td>${this.esc(this.n3(this.taxAmt(l)))}</td>` +
      `<td>${this.esc(this.n3(this.lineTotal(l)))}</td></tr>`).join('');

    const ven = this.lookups.Vendors.find(x => x.VenNo === this.hdr.venNo);
    let filtersHtml =
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.PoNo'))}:</span><span class="filter-value">${this.esc(this.hdr.poNo)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.PoDate'))}:</span><span class="filter-value">${this.esc(this.hdr.podate)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.DelvDate'))}:</span><span class="filter-value">${this.esc(this.hdr.delvDate)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.Vendor'))}:</span><span class="filter-value">${this.esc(ven ? ven.Name : this.hdr.venNo)}</span></div>`;
    if (this.hdr.venTaxNo) filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.TaxId'))}:</span><span class="filter-value">${this.esc(this.hdr.venTaxNo)}</span></div>`;
    if (this.hdr.sourcePONo) filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseOrderDoc.SourcePo'))}:</span><span class="filter-value">${this.esc(this.hdr.sourcePONo)}</span></div>`;

    const footerHtml =
      `<div style="text-align:end">` +
      `${this.esc(t('PurchaseOrderDoc.Subtotal'))}: <b>${this.esc(this.n3(this.subtotal))}</b> — ` +
      `${this.esc(t('PurchaseOrderDoc.TotalDiscount'))}: <b>${this.esc(this.n3(this.totalDiscount))}</b> — ` +
      `${this.esc(t('PurchaseOrderDoc.TotalTax'))}: <b>${this.esc(this.n3(this.totalTax))}</b> — ` +
      `${this.esc(t('PurchaseOrderDoc.GrandTotal'))}: <b>${this.esc(this.n3(this.grandTotal))}</b></div>` +
      (this.hdr.remarks ? `<div style="margin-top:.5rem">${this.esc(this.hdr.remarks)}</div>` : '');

    this.reportService.printReport(
      `${t('PurchaseOrderDoc.Title')} — ${this.hdr.poNo}`, cols, rows, filtersHtml, footerHtml);
  }
}
