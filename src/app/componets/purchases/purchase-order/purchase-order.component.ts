import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService } from '../../../shared/services/report.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import {
  PurchaseOrderService, PurchaseOrder, PurchaseOrderLine, PurchaseOrderLookups,
  PurchaseOrderListRow, PofUnit, PO_REQ_STATUS,
} from '../../../shared/services/purchase-order.service';

interface PoLine extends PurchaseOrderLine { units: PofUnit[]; }

@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule,
    ConfirmationModalComponent, HasPermissionDirective, PaginatorComponent, PaginatePipe, ReportExportComponent,
  ],
  templateUrl: './purchase-order.component.html',
  styleUrl: './purchase-order.component.scss',
})
export class PurchaseOrderComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  activeTab: 'form' | 'list' = 'form';
  readonly currentYear = new Date().getFullYear();
  readonly ST = PO_REQ_STATUS;

  /** The happy-path lifecycle, shown as a stepper. Cancelled sits off it. */
  readonly lifecycle = [
    { s: PO_REQ_STATUS.Draft,    k: 'PurchaseOrder.StatusDraft' },
    { s: PO_REQ_STATUS.Pending,  k: 'PurchaseOrder.StatusPending' },
    { s: PO_REQ_STATUS.Approved, k: 'PurchaseOrder.StatusApproved' },
    { s: PO_REQ_STATUS.Closed,   k: 'PurchaseOrder.StatusClosed' },
  ];

  hdr = this.initHdr();
  lines: PoLine[] = [this.newLine()];
  lookups: PurchaseOrderLookups = { Serials: [], Currencies: [], PaymentTerms: [], Suppliers: [], ContactReps: [], Stores: [], CostCenters: [], MaterialRequests: [], DebitAccounts: [] };
  allItems: ItemListRow[] = [];
  isExisting = false;
  saving = false;

  requests: PurchaseOrderListRow[] = [];
  listFilter = '';
  page = 1;
  pageSize = 10;

  readonly pCreate = 'PurchaseOrder.Create';
  readonly pDelete = 'PurchaseOrder.Delete';
  readonly pPrint = 'PurchaseOrder.Print';

  constructor(
    private svc: PurchaseOrderService,
    private itemSvc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  ngOnInit(): void {
    this.itemSvc.list().subscribe({ next: d => (this.allItems = d || []), error: () => {} });
    this.svc.lookups().subscribe({
      next: l => {
        this.lookups = l || this.lookups;
        if (this.lookups.Serials.length && this.hdr.vtype == null) {
          this.hdr.vtype = this.lookups.Serials[0].SerialNo;
          this.onSerialChange();
        }
      },
      error: () => {},
    });
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Best-effort convert a stored delivery date (yyyy-MM-dd, dd/mm/yyyy, ISO) to
   *  the yyyy-MM-dd a <input type="date"> needs; '' if unparseable. */
  private toDateInput(s: string | null | undefined): string {
    const v = (s || '').toString().trim();
    if (!v) return '';
    let m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);          // yyyy-mm-dd / yyyy/mm/dd
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);              // dd/mm/yyyy
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  }

  private initHdr() {
    return {
      year: new Date().getFullYear(), vtype: null as number | null, orderNo: '',
      brNo: 0, odate: this.today(), venNo: null as number | null, dacc: '',
      cluse: null as number | null, curNo: 1, rate: 1,
      itemReq: '', manF: null as number | null,
      delvTime: '', delvD: '', delivNote: '', origin: '', packing: '', partial: 1,
      dis: 0, isPercent: false,
      note1: '', note2: '', note3: '', note4: '', note5: '', state: 0,
      poStatus: PO_REQ_STATUS.Draft as number,
      linkedPO: '',
    };
  }

  private newLine(): PoLine {
    return { ItemNo: '', ItemName: '', UnitNo: null, UnitName: '', Qty: null, Cost: null, Operand: 0, StoreNo: null, CCntrNo: null, Barcode: '', units: [] };
  }

  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  // ─── totals ──────────────────────────────────────────────────
  get total(): number { return this.lines.reduce((s, l) => s + (+(l.Qty || 0)) * (+(l.Cost || 0)), 0); }
  get disAmount(): number { return this.hdr.isPercent ? this.total * (+this.hdr.dis || 0) / 100 : (+this.hdr.dis || 0); }
  get net(): number { return this.total - this.disAmount; }
  get repName(): string {
    const r = this.lookups.ContactReps.find(x => x.ManNo === this.hdr.manF);
    return r ? (this.isAr ? (r.Name || '') : (r.Ename || r.Name || '')) : '';
  }

  // ─── status badge lifecycle ──────────────────────────────────
  /** Approved / cancelled / linked-to-a-PO requests are locked. */
  get readOnly(): boolean {
    return this.isExisting &&
      (this.hdr.poStatus === PO_REQ_STATUS.Approved ||
       this.hdr.poStatus === PO_REQ_STATUS.Cancelled ||
       this.hdr.poStatus === PO_REQ_STATUS.Linked);
  }

  get isCancelled(): boolean { return this.hdr.poStatus === PO_REQ_STATUS.Cancelled; }

  /** Sourced by an أمر الشراء — an off-path final state (like cancelled). */
  get isLinked(): boolean { return this.hdr.poStatus === PO_REQ_STATUS.Linked; }

  /** Linked and cancelled both sit off the happy-path stepper. */
  get offPath(): boolean { return this.isCancelled || this.isLinked; }

  /** One lifecycle step's state: 'done' | 'current' | 'todo'. */
  stepState(s: number): 'done' | 'current' | 'todo' {
    if (this.hdr.poStatus === s) return 'current';
    return this.hdr.poStatus > s && !this.offPath ? 'done' : 'todo';
  }

  statusKey(s: number): string {
    switch (s) {
      case PO_REQ_STATUS.Pending:   return 'PurchaseOrder.StatusPending';
      case PO_REQ_STATUS.Approved:  return 'PurchaseOrder.StatusApproved';
      case PO_REQ_STATUS.Closed:    return 'PurchaseOrder.StatusClosed';
      case PO_REQ_STATUS.Cancelled: return 'PurchaseOrder.StatusCancelled';
      case PO_REQ_STATUS.Linked:    return 'PurchaseOrder.StatusLinked';
      default:                      return 'PurchaseOrder.StatusDraft';
    }
  }

  /** Draft grey, pending amber, approved green, closed blue, cancelled red, linked teal. */
  statusClass(s: number): string {
    switch (s) {
      case PO_REQ_STATUS.Pending:   return 'badge bg-warning text-dark';
      case PO_REQ_STATUS.Approved:  return 'badge bg-success';
      case PO_REQ_STATUS.Closed:    return 'badge bg-primary';
      case PO_REQ_STATUS.Cancelled: return 'badge bg-danger';
      case PO_REQ_STATUS.Linked:    return 'badge bg-info text-dark';
      default:                      return 'badge bg-secondary';
    }
  }

  setStatus(action: string): void {
    const no = (this.hdr.orderNo || '').toString().trim();
    if (!no || this.hdr.vtype == null) return;
    this.svc.setStatus(no, this.hdr.year, this.hdr.vtype, action).subscribe({
      next: r => {
        this.hdr.poStatus = r?.status ?? this.hdr.poStatus;
        this.toastr.success(this.translate.instant('PurchaseOrder.StatusChanged',
          { s: this.translate.instant(this.statusKey(this.hdr.poStatus)) }));
        this.loadList();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  onSerialChange(): void {
    const s = this.lookups.Serials.find(x => x.SerialNo === this.hdr.vtype);
    this.hdr.brNo = s ? s.BranchNo : 0;
    if (!this.isExisting) this.refreshNextNo();
  }

  onCurrencyChange(): void {
    const c = this.lookups.Currencies.find(x => x.CurNo === this.hdr.curNo);
    if (c) this.hdr.rate = c.Rate || 1;
  }

  private refreshNextNo(): void {
    if (this.hdr.vtype == null) return;
    this.svc.nextNo(this.hdr.year, this.hdr.vtype).subscribe({
      next: r => (this.hdr.orderNo = r?.nextNo || ''),
      error: () => {},
    });
  }

  itemSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Barcode || '').toLowerCase().includes(term);
  };

  // ─── grid ────────────────────────────────────────────────────
  addRow(): void { this.lines.push(this.newLine()); }
  removeRow(i: number): void {
    this.lines.splice(i, 1);
    if (!this.lines.length) this.lines.push(this.newLine());
  }

  onItemPick(line: PoLine): void {
    const code = (line.ItemNo || '').toString().trim();
    if (!code) { line.ItemName = ''; line.units = []; line.UnitNo = null; line.UnitName = ''; line.Barcode = ''; line.Operand = 0; line.Cost = null; return; }
    this.svc.itemDetails(code).subscribe({
      next: d => {
        line.ItemName = d?.ItemName || this.allItems.find(x => x.ItemNo === code)?.ItemName || '';
        line.Cost = d?.Cost || 0;
        line.units = d?.Units || [];
        const u = line.units[0];
        if (u) { line.UnitNo = u.UnitNo; this.applyUnit(line); }
      },
      error: () => { line.units = []; },
    });
  }

  onUnitPick(line: PoLine): void { this.applyUnit(line); }

  private applyUnit(line: PoLine): void {
    const u = line.units.find(x => x.UnitNo === line.UnitNo);
    line.UnitName = u ? (this.isAr ? (u.UnitName || '') : (u.UnitEname || u.UnitName || '')) : '';
    line.Operand = u ? u.Operand : 0;
    if (u && u.Barcode) line.Barcode = u.Barcode;
  }

  lineTotal(line: PoLine): number { return (+(line.Qty || 0)) * (+(line.Cost || 0)); }

  // ─── load from material request ──────────────────────────────
  loadFromRequest(): void {
    const req = (this.hdr.itemReq || '').toString().trim();
    if (!req) return;
    this.svc.fromRequest(req).subscribe({
      next: rows => {
        if (!rows || !rows.length) { this.toastr.info(this.translate.instant('PurchaseOrder.RequestEmpty')); return; }
        const mapped = rows.map(r => ({ ...r, units: r.UnitNo != null ? [{ UnitNo: r.UnitNo, UnitName: r.UnitName, UnitEname: r.UnitName, Operand: r.Operand || 0, Barcode: r.Barcode }] : [] }) as PoLine);
        // replace blank first row, else append
        this.lines = this.lines.filter(l => (l.ItemNo || '').toString().trim());
        this.lines.push(...mapped);
        if (!this.lines.length) this.lines = [this.newLine()];
        this.toastr.success(this.translate.instant('PurchaseOrder.RequestLoaded', { n: mapped.length }));
      },
      error: (err) => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── load / new ──────────────────────────────────────────────
  onOrderNoChange(): void {
    const code = (this.hdr.orderNo || '').toString().trim();
    this.hdr.orderNo = code;
    if (!code || this.hdr.vtype == null) { this.isExisting = false; return; }
    this.loadOrder(code);
  }

  private loadOrder(orderNo: string): void {
    if (this.hdr.vtype == null) return;
    this.svc.get(orderNo, this.hdr.year, this.hdr.vtype).subscribe({
      next: (o: PurchaseOrder) => {
        this.hdr.orderNo = o.OrderNo || orderNo;
        this.hdr.brNo = o.BrNo || 0;
        this.hdr.odate = (o.ODate || '').toString().substring(0, 10) || this.today();
        this.hdr.venNo = o.VenNo || null;
        this.hdr.dacc = o.DAcc || '';
        this.hdr.cluse = o.Cluse || null;
        this.hdr.curNo = o.CurNo || 1;
        this.hdr.rate = o.Rate || 1;
        this.hdr.itemReq = o.ItemReq || '';
        this.hdr.manF = o.ManF || null;
        this.hdr.delvTime = o.DelvTime || '';
        this.hdr.delvD = this.toDateInput(o.DelvD);
        this.hdr.delivNote = o.DelivNote || '';
        this.hdr.origin = o.Origin || '';
        this.hdr.packing = o.Packing || '';
        this.hdr.partial = o.Partial ?? 1;
        this.hdr.dis = o.Dis || 0;
        this.hdr.isPercent = (o.Percentage || 0) === 1;
        this.hdr.note1 = o.Note1 || ''; this.hdr.note2 = o.Note2 || ''; this.hdr.note3 = o.Note3 || '';
        this.hdr.note4 = o.Note4 || ''; this.hdr.note5 = o.Note5 || '';
        this.hdr.state = o.State || 0;
        this.hdr.poStatus = o.POStatus ?? PO_REQ_STATUS.Draft;
        this.hdr.linkedPO = o.LinkedPO || '';
        this.lines = (o.Lines && o.Lines.length ? o.Lines : [this.newLine()]).map(l => ({
          ...l,
          units: l.UnitNo != null ? [{ UnitNo: l.UnitNo, UnitName: l.UnitName, UnitEname: l.UnitName, Operand: l.Operand || 0, Barcode: l.Barcode }] : [],
        }) as PoLine);
        this.isExisting = true;
      },
      error: (err) => {
        if (err?.status === 404) this.isExisting = false;
        else this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  reset(): void {
    // Year, serial and order date carry over — consecutive orders are normally
    // entered against the same working date, so re-typing it every time is noise.
    const year = this.hdr.year, vtype = this.hdr.vtype, odate = this.hdr.odate;
    this.hdr = this.initHdr();
    this.hdr.year = year; this.hdr.vtype = vtype;
    if (odate) this.hdr.odate = odate;
    this.lines = [this.newLine()];
    this.isExisting = false;
    this.onCurrencyChange();
    this.onSerialChange();
  }

  // ─── save / delete ───────────────────────────────────────────
  private itemLines(): PoLine[] { return this.lines.filter(l => (l.ItemNo || '').toString().trim()); }

  /** Mirrors the VB6 PF01 required-field chain, in the same order. */
  private validate(): boolean {
    const w = (k: string) => { this.toastr.warning(this.translate.instant(k)); return false; };
    if (!this.hdr.year) return w('PurchaseOrder.YearRequired');
    if (this.hdr.vtype == null) return w('PurchaseOrder.SerialRequired');
    if (!(this.hdr.orderNo || '').toString().trim()) return w('PurchaseOrder.OrderNoRequired');
    if (!this.hdr.odate) return w('PurchaseOrder.DateRequired');
    if (!this.hdr.venNo) return w('PurchaseOrder.VendorRequired');
    if (!this.hdr.curNo) return w('PurchaseOrder.CurrencyRequired');
    if (!(+this.hdr.rate > 0)) return w('PurchaseOrder.RateRequired');
    if (!(this.hdr.origin || '').toString().trim()) return w('PurchaseOrder.CreatorNameRequired');
    if (!(this.hdr.delivNote || '').toString().trim()) return w('PurchaseOrder.DeliveryNoteRequired');
    if (!this.hdr.delvD) return w('PurchaseOrder.DeliveryDateRequired');
    // VB6 also pins both dates to the financial year.
    if (+this.hdr.odate.slice(0, 4) !== +this.hdr.year) return w('PurchaseOrder.DateYearMismatch');
    if (+this.hdr.delvD.slice(0, 4) !== +this.hdr.year) return w('PurchaseOrder.DeliveryDateYearMismatch');
    const items = this.itemLines();
    if (!items.length) return w('PurchaseOrder.NoLines');
    if (items.some(l => !l.UnitNo)) return w('PurchaseOrder.UnitRequired');
    if (items.some(l => !(+(l.Qty || 0) > 0) || !(+(l.Cost || 0) > 0))) return w('PurchaseOrder.LineIncomplete');
    return true;
  }

  save(print = false): void {
    if (this.readOnly) { this.toastr.warning(this.translate.instant('PurchaseOrder.LockedForEdit')); return; }
    if (!this.validate()) return;
    this.saving = true;
    const payload: PurchaseOrder = {
      OrderNo: this.hdr.orderNo.trim(), Myear: this.hdr.year, VType: this.hdr.vtype!, BrNo: this.hdr.brNo,
      ODate: this.hdr.odate, VenNo: this.hdr.venNo!, DAcc: this.hdr.dacc, Cluse: this.hdr.cluse || 0,
      CurNo: this.hdr.curNo, Rate: +this.hdr.rate || 1, ItemReq: this.hdr.itemReq, ManF: this.hdr.manF || 0,
      DelvTime: this.hdr.delvTime, DelvD: this.hdr.delvD, DelivNote: this.hdr.delivNote, Origin: this.hdr.origin,
      Packing: this.hdr.packing, Partial: this.hdr.partial, Tot: this.total, Dis: +this.hdr.dis || 0,
      Percentage: this.hdr.isPercent ? 1 : 0,
      Note1: this.hdr.note1, Note2: this.hdr.note2, Note3: this.hdr.note3, Note4: this.hdr.note4, Note5: this.hdr.note5,
      Lines: this.itemLines().map(l => ({
        ItemNo: (l.ItemNo || '').toString().trim(), ItemName: l.ItemName, UnitNo: l.UnitNo, Operand: l.Operand,
        Qty: l.Qty, Cost: l.Cost, StoreNo: l.StoreNo, CCntrNo: l.CCntrNo, Barcode: l.Barcode,
      })),
    };
    this.svc.save(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toastr.success(this.translate.instant('PurchaseOrder.SavedSerial', { no: res?.orderNo || this.hdr.orderNo }));
        if (print) this.print();
        this.reset();
        this.refreshNextNo();
      },
      error: (err) => { this.saving = false; this.toastr.error(err?.error?.message || this.translate.instant('General.Error')); },
    });
  }

  delete(): void { if (this.isExisting) this.confirmModal.show(); }

  confirmDelete(): void {
    if (this.hdr.vtype == null) return;
    this.svc.delete(this.hdr.orderNo, this.hdr.year, this.hdr.vtype).subscribe({
      next: () => { this.toastr.success(this.translate.instant('General.DeleteSuccess')); this.reset(); this.refreshNextNo(); },
      error: (err) => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── list tab ────────────────────────────────────────────────
  loadList(): void {
    if (this.hdr.vtype == null) return;
    this.svc.list(this.hdr.year, this.hdr.vtype).subscribe({ next: d => (this.requests = d || []), error: () => {} });
  }

  get filteredRequests(): PurchaseOrderListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.requests;
    return this.requests.filter(r => (r.OrderNo || '').toLowerCase().includes(t) || (r.VenName || '').toLowerCase().includes(t));
  }

  openRow(row: PurchaseOrderListRow): void { this.activeTab = 'form'; this.loadOrder(row.OrderNo); }

  // ─── print ───────────────────────────────────────────────────
  /** Prints what the user is looking at: the orders list on the list tab,
   *  otherwise the current order document. */
  print(): void {
    if (this.activeTab === 'list') { this.printList(); return; }
    this.printDocument();
  }

  private printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const esc = (v: any) => (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
    const n3 = (v: any) => (+(v || 0)).toLocaleString('en-US', { maximumFractionDigits: 3 });
    const rowsData = this.filteredRequests;
    if (!rowsData.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('PurchaseOrder.OrderNo') }, { label: t('PurchaseOrder.Date') },
      { label: t('PurchaseOrder.Supplier') }, { label: t('PurchaseOrder.Total') },
    ];
    const rows = rowsData.map(r => `<tr>` +
      `<td>${esc(r.OrderNo)}</td>` +
      `<td>${esc((r.ODate || '').toString().slice(0, 10))}</td>` +
      `<td>${esc(r.VenName)}</td>` +
      `<td>${esc(n3(r.Total))}</td></tr>`).join('');
    const grand = rowsData.reduce((s, r) => s + (+(r.Total || 0)), 0);
    const filtersHtml =
      `<div class="filter-item"><span class="filter-label">${esc(t('PurchaseOrder.Year'))}:</span><span class="filter-value">${esc(this.hdr.year)}</span></div>` +
      (this.listFilter ? `<div class="filter-item"><span class="filter-label">${esc(t('General.Search'))}:</span><span class="filter-value">${esc(this.listFilter)}</span></div>` : '');
    const footerHtml = `<div style="text-align:end">${esc(t('PurchaseOrder.Total'))}: <b>${esc(n3(grand))}</b></div>`;
    this.reportService.printReport(t('PurchaseOrder.ListTab'), cols, rows, filtersHtml, footerHtml);
  }

  private printDocument(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.itemLines().length) { this.toastr.warning(t('PurchaseOrder.NoLines')); return; }
    const esc = (v: any) => (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
    const cols = [
      { label: t('PurchaseOrder.ItemNo') }, { label: t('PurchaseOrder.ItemName') }, { label: t('PurchaseOrder.UnitName') },
      { label: t('PurchaseOrder.Qty') }, { label: t('PurchaseOrder.Cost') }, { label: t('PurchaseOrder.Total') }, { label: t('PurchaseOrder.Barcode') },
    ];
    const rows = this.itemLines().map(l => `<tr>` +
      `<td>${esc(l.ItemNo)}</td><td>${esc(l.ItemName)}</td><td>${esc(l.UnitName)}</td>` +
      `<td>${esc(l.Qty)}</td><td>${esc(l.Cost)}</td><td>${esc(this.lineTotal(l))}</td><td>${esc(l.Barcode)}</td></tr>`).join('');
    const ven = this.lookups.Suppliers.find(x => x.VenNo === this.hdr.venNo);
    const filtersHtml =
      `<div class="filter-item"><span class="filter-label">${esc(t('PurchaseOrder.OrderNo'))}:</span><span class="filter-value">${esc(this.hdr.orderNo)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${esc(t('PurchaseOrder.Date'))}:</span><span class="filter-value">${esc(this.hdr.odate)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${esc(t('PurchaseOrder.Supplier'))}:</span><span class="filter-value">${esc(ven ? ven.Name : this.hdr.venNo)}</span></div>`;
    const footerHtml = `<div style="text-align:end">${esc(t('PurchaseOrder.Total'))}: <b>${esc(this.total)}</b> — ${esc(t('PurchaseOrder.Discount'))}: <b>${esc(this.disAmount)}</b> — ${esc(t('PurchaseOrder.Net'))}: <b>${esc(this.net)}</b></div>`;
    this.reportService.printReport(`${t('PurchaseOrder.Title')} — ${this.hdr.orderNo}`, cols, rows, filtersHtml, footerHtml);
  }
}
