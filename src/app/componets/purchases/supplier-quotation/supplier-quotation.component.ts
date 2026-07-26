import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute } from '@angular/router';

import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService } from '../../../shared/services/report.service';
import {
  SupplierQuotationService, SupplierQuotation, SupplierQuotationLine,
  SupplierQuotationListRow, SupplierQuotationLookups, SqPurchaseOrder, SQ_STATUS,
} from '../../../shared/services/supplier-quotation.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { PurchaseOrderService } from '../../../shared/services/purchase-order.service';

/** A grid row; carries the picked item's units for the unit dropdown.
 *  Always an array (never undefined) so ng-select can bind it directly. */
interface SqLine extends SupplierQuotationLine {
  units: { UnitNo: number; UnitName?: string | null; Operand?: number | null }[];
}

@Component({
  selector: 'app-supplier-quotation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule,
    SharedModule, ConfirmationModalComponent, HasPermissionDirective, PaginatePipe, PaginatorComponent,
    ReportExportComponent,
  ],
  templateUrl: './supplier-quotation.component.html',
  styleUrls: ['./supplier-quotation.component.scss'],
})
export class SupplierQuotationComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  readonly currentYear = new Date().getFullYear();
  activeTab: 'form' | 'list' = 'form';

  hdr = this.initHdr();
  lines: SqLine[] = [this.newLine()];
  lookups: SupplierQuotationLookups = {
    Suppliers: [], Currencies: [], PaymentTerms: [], Stores: [],
    CostCenters: [], MaterialRequests: [], PoSerials: [],
  };
  allItems: ItemListRow[] = [];
  /** Purchase orders for the رقم طلب شراء المواد dropdown. */
  purchaseOrders: SqPurchaseOrder[] = [];

  quotations: SupplierQuotationListRow[] = [];
  listFilter = '';
  /** Quotation deep-linked from another screen; highlighted in the list. */
  highlightQuotNo = '';
  page = 1;
  pageSize = 10;

  isExisting = false;
  saving = false;

  readonly pCreate = 'SupplierQuotation.Create';
  readonly pDelete = 'SupplierQuotation.Delete';
  readonly pPrint  = 'SupplierQuotation.Print';

  constructor(
    private svc: SupplierQuotationService,
    private poSvc: PurchaseOrderService,
    private itemSvc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** An approved offer already produced a purchase order, so it is locked. */
  get readOnly(): boolean { return this.hdr.status === SQ_STATUS.Approved; }

  private initHdr() {
    return {
      year: new Date().getFullYear(),
      quotNo: '',
      qdate: this.today(),
      validUntil: '',
      venNo: null as number | null,
      curNo: 1,
      rate: 1,
      cluse: null as number | null,
      delvTime: '',
      itemReq: '',
      dis: 0,
      isPercent: false,
      status: 0,
      poNo: '',
      note1: '', note2: '', note3: '',
    };
  }

  private newLine(): SqLine {
    return { ItemNo: '', ItemName: '', UnitNo: null, UnitName: '', UnitRate: 1, Qty: 0,
             Cost: 0, LineDis: 0, StoreNo: 0, CCntrNo: 0, Barcode: '', DelvDays: 0, Note: '', units: [] };
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    // Arriving from تجميع طلبات شراء المواد: ?quotNo=&year=&tab=list opens the
    // list on the right year with that quotation filtered in and highlighted.
    const qp = this.route.snapshot.queryParamMap;
    const year = +(qp.get('year') || 0);
    const quotNo = (qp.get('quotNo') || '').trim();
    if (year) this.hdr.year = year;
    if (quotNo) {
      this.highlightQuotNo = quotNo;
      this.listFilter = quotNo;
    }
    if (quotNo || qp.get('tab') === 'list') this.activeTab = 'list';

    this.svc.lookups().subscribe({
      next: l => (this.lookups = l),
      error: () => {},
    });
    this.itemSvc.list().subscribe({ next: d => (this.allItems = d || []), error: () => {} });
    this.loadPurchaseOrders();
    this.refreshNextNo();
    this.loadList();
  }

  loadPurchaseOrders(): void {
    this.svc.purchaseOrders(this.hdr.year).subscribe({
      next: d => (this.purchaseOrders = d || []),
      error: () => (this.purchaseOrders = []),
    });
  }

  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  refreshNextNo(): void {
    if (this.isExisting) return;
    this.svc.nextNo(this.hdr.year).subscribe({
      next: r => (this.hdr.quotNo = r?.nextNo || ''),
      error: () => (this.hdr.quotNo = ''),
    });
  }

  // ─── totals ──────────────────────────────────────────────────
  private itemLines(): SqLine[] {
    return this.lines.filter(l => (l.ItemNo || '').toString().trim());
  }

  lineTotal(l: SqLine): number {
    const net = (+(l.Cost || 0)) - (+(l.LineDis || 0));
    return +((net * (+(l.Qty || 0))).toFixed(4));
  }

  get total(): number {
    return +this.itemLines().reduce((s, l) => s + this.lineTotal(l), 0).toFixed(4);
  }

  get disAmount(): number {
    const d = +(this.hdr.dis || 0);
    return +(this.hdr.isPercent ? (this.total * d) / 100 : d).toFixed(4);
  }

  get net(): number { return +(this.total - this.disAmount).toFixed(4); }

  // ─── grid ────────────────────────────────────────────────────
  /** Search an item by number, name or barcode (same as the purchase-order grid). */
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

  /** Item picked: fill the name and load its units. The unit list is fetched via
   *  the purchase-order item-details endpoint rather than duplicating that SP. */
  onItemPick(l: SqLine): void {
    const no = (l.ItemNo || '').toString().trim();
    if (!no) return;
    const found = this.allItems.find(x => (x.ItemNo || '').toString().trim() === no);
    if (found) l.ItemName = this.isAr ? found.ItemName : (found.Ename || found.ItemName);
    this.poSvc.itemDetails(no).subscribe({
      next: d => {
        l.units = (d?.Units || []).map(u => ({ UnitNo: u.UnitNo, UnitName: u.UnitName, Operand: u.Operand }));
        if (l.units.length && !l.UnitNo) this.onUnitPick(l, l.units[0].UnitNo);
        if (!l.Barcode) l.Barcode = d?.Barcode || '';
      },
      error: () => (l.units = []),
    });
  }

  onUnitPick(l: SqLine, unitNo?: number | null): void {
    const no = unitNo ?? l.UnitNo;
    l.UnitNo = no ?? null;
    const u = (l.units || []).find(x => x.UnitNo === no);
    if (u) { l.UnitName = u.UnitName; l.UnitRate = u.Operand || 1; }
  }

  // ─── load / save ─────────────────────────────────────────────
  onQuotNoChange(): void {
    const no = (this.hdr.quotNo || '').toString().trim();
    if (no) this.loadQuot(no);
  }

  openRow(row: SupplierQuotationListRow): void {
    this.highlightQuotNo = '';
    this.activeTab = 'form';
    this.loadQuot(row.QuotNo);
  }

  loadQuot(quotNo: string): void {
    this.svc.get(quotNo, this.hdr.year).subscribe({
      next: (q: SupplierQuotation) => {
        if (!q) return;
        this.isExisting = true;
        this.hdr.quotNo = q.QuotNo || quotNo;
        this.hdr.qdate = (q.QDate || '').toString().substring(0, 10) || this.today();
        this.hdr.validUntil = (q.ValidUntil || '').toString().substring(0, 10);
        this.hdr.venNo = q.VenNo || null;
        this.hdr.curNo = q.CurNo || 1;
        this.hdr.rate = q.Rate || 1;
        this.hdr.cluse = q.Cluse || null;
        this.hdr.delvTime = q.DelvTime || '';
        this.hdr.itemReq = q.ItemReq || '';
        this.hdr.dis = q.Dis || 0;
        this.hdr.isPercent = q.Percentage === 1;
        this.hdr.status = q.Status ?? 0;
        this.hdr.poNo = q.PONo || '';
        this.hdr.note1 = q.Note1 || '';
        this.hdr.note2 = q.Note2 || '';
        this.hdr.note3 = q.Note3 || '';
        this.lines = (q.Lines && q.Lines.length ? q.Lines : [this.newLine()]).map(l => ({ ...l, units: [] }));
      },
      error: () => {
        // not found -> treat the typed number as a new document
        this.isExisting = false;
      },
    });
  }

  /** Seed the grid from a material request so the supplier prices our own list. */
  /** Pull the chosen purchase order's items in as a starting point. */
  loadFromRequest(): void {
    const no = (this.hdr.itemReq || '').toString().trim();
    if (!no) { this.toastr.warning(this.translate.instant('SupplierQuotation.PickPoFirst')); return; }
    const po = this.purchaseOrders.find(x => (x.OrderNo || '').toString().trim() === no);
    this.svc.fromPurchaseOrder(no, po?.Myear ?? this.hdr.year, po?.VType).subscribe({
      next: rows => {
        if (!rows || !rows.length) { this.toastr.info(this.translate.instant('SupplierQuotation.PoEmpty')); return; }
        const mapped: SqLine[] = rows.map(r => ({ ...r, units: [] }));
        const existing = this.itemLines();
        this.lines = existing.length ? [...existing, ...mapped] : mapped;
        // pull each line's units so the unit dropdown is usable straight away
        this.lines.forEach(l => { if (l.ItemNo) this.onItemPick(l); });
        this.toastr.success(this.translate.instant('SupplierQuotation.PoLoaded', { n: mapped.length }));
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  private validate(): boolean {
    const w = (k: string) => { this.toastr.warning(this.translate.instant(k)); return false; };
    if (!this.hdr.year) return w('SupplierQuotation.YearRequired');
    if (!(this.hdr.quotNo || '').toString().trim()) return w('SupplierQuotation.QuotNoRequired');
    if (!this.hdr.qdate) return w('SupplierQuotation.DateRequired');
    if (!this.hdr.venNo) return w('SupplierQuotation.SupplierRequired');
    if (!this.hdr.curNo) return w('SupplierQuotation.CurrencyRequired');
    if (!(+this.hdr.rate > 0)) return w('SupplierQuotation.RateRequired');
    if (+this.hdr.qdate.slice(0, 4) !== +this.hdr.year) return w('SupplierQuotation.DateYearMismatch');
    if (this.hdr.validUntil && this.hdr.validUntil < this.hdr.qdate)
      return w('SupplierQuotation.ValidUntilBeforeDate');
    const items = this.itemLines();
    if (!items.length) return w('SupplierQuotation.NoLines');
    if (items.some(l => !l.UnitNo)) return w('SupplierQuotation.UnitRequired');
    if (items.some(l => !(+(l.Qty || 0) > 0) || !(+(l.Cost || 0) > 0)))
      return w('SupplierQuotation.LineIncomplete');
    return true;
  }

  save(print = false): void {
    if (this.readOnly) { this.toastr.warning(this.translate.instant('SupplierQuotation.ApprovedLocked')); return; }
    if (!this.validate()) return;
    this.saving = true;
    const payload: SupplierQuotation = {
      QuotNo: this.hdr.quotNo.trim(),
      Myear: this.hdr.year,
      QDate: this.hdr.qdate,
      ValidUntil: this.hdr.validUntil || null,
      VenNo: this.hdr.venNo!,
      CurNo: this.hdr.curNo,
      Rate: +this.hdr.rate || 1,
      Cluse: this.hdr.cluse || 0,
      DelvTime: this.hdr.delvTime,
      ItemReq: this.hdr.itemReq,
      Tot: this.total,
      Dis: +this.hdr.dis || 0,
      Percentage: this.hdr.isPercent ? 1 : 0,
      Note1: this.hdr.note1, Note2: this.hdr.note2, Note3: this.hdr.note3,
      Lines: this.itemLines().map(l => ({
        ItemNo: (l.ItemNo || '').toString().trim(), ItemName: l.ItemName, UnitNo: l.UnitNo,
        UnitRate: l.UnitRate, Qty: l.Qty, Cost: l.Cost, LineDis: l.LineDis,
        StoreNo: l.StoreNo, CCntrNo: l.CCntrNo, Barcode: l.Barcode,
        DelvDays: l.DelvDays, Note: l.Note,
      })),
    };
    this.svc.save(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toastr.success(this.translate.instant('SupplierQuotation.Saved', { no: res?.quotNo || this.hdr.quotNo }));
        if (print) this.print();
        this.reset();
        this.refreshNextNo();
        this.loadList();
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  reset(): void {
    // Year and working date carry over between documents.
    const year = this.hdr.year, qdate = this.hdr.qdate;
    this.hdr = this.initHdr();
    this.hdr.year = year;
    if (qdate) this.hdr.qdate = qdate;
    this.lines = [this.newLine()];
    this.isExisting = false;
    this.activeTab = 'form';
  }

  newDoc(): void { this.reset(); this.refreshNextNo(); }

  /** Opens the styled confirmation dialog; the delete itself runs on confirm. */
  confirmDelete(): void {
    if (this.isExisting) this.confirmModal.show();
  }

  doDelete(): void {
    this.svc.delete(this.hdr.quotNo, this.hdr.year).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('General.DeleteSuccess'));
        this.reset();
        this.refreshNextNo();
        this.loadList();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── list ────────────────────────────────────────────────────
  loadList(): void {
    this.svc.list(this.hdr.year).subscribe({ next: d => (this.quotations = d || []), error: () => {} });
  }

  get filteredQuotations(): SupplierQuotationListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.quotations;
    return this.quotations.filter(r =>
      (r.QuotNo || '').toLowerCase().includes(t) || (r.VenName || '').toLowerCase().includes(t));
  }

  statusKey(s: number): string {
    return s === SQ_STATUS.Approved ? 'SupplierQuotation.StatusApproved'
         : s === SQ_STATUS.Rejected ? 'SupplierQuotation.StatusRejected'
         : 'SupplierQuotation.StatusNew';
  }

  statusClass(s: number): string {
    return s === SQ_STATUS.Approved ? 'badge bg-success'
         : s === SQ_STATUS.Rejected ? 'badge bg-danger'
         : 'badge bg-secondary';
  }

  netOf(r: SupplierQuotationListRow): number {
    const dis = r.Percentage === 1 ? (r.Tot * r.Dis) / 100 : r.Dis;
    return +((r.Tot || 0) - (dis || 0)).toFixed(4);
  }

  // ─── print ───────────────────────────────────────────────────
  print(): void {
    if (this.activeTab === 'list') { this.printList(); return; }
    this.printDocument();
  }

  private esc = (v: any) =>
    (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);

  private n3 = (v: any) => (+(v || 0)).toLocaleString('en-US', { maximumFractionDigits: 3 });

  private printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const rowsData = this.filteredQuotations;
    if (!rowsData.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('SupplierQuotation.QuotNo') }, { label: t('SupplierQuotation.Date') },
      { label: t('SupplierQuotation.Supplier') }, { label: t('SupplierQuotation.Net') },
      { label: t('SupplierQuotation.Status') },
    ];
    const rows = rowsData.map(r => `<tr>` +
      `<td>${this.esc(r.QuotNo)}</td><td>${this.esc((r.QDate || '').toString().slice(0, 10))}</td>` +
      `<td>${this.esc(r.VenName)}</td><td>${this.esc(this.n3(this.netOf(r)))}</td>` +
      `<td>${this.esc(t(this.statusKey(r.Status)))}</td></tr>`).join('');
    const grand = rowsData.reduce((s, r) => s + this.netOf(r), 0);
    const footerHtml = `<div style="text-align:end">${this.esc(t('SupplierQuotation.Net'))}: <b>${this.esc(this.n3(grand))}</b></div>`;
    this.reportService.printReport(t('SupplierQuotation.ListTab'), cols, rows, '', footerHtml);
  }

  private printDocument(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.itemLines().length) { this.toastr.warning(t('SupplierQuotation.NoLines')); return; }
    const cols = [
      { label: t('SupplierQuotation.ItemNo') }, { label: t('SupplierQuotation.ItemName') },
      { label: t('SupplierQuotation.UnitName') }, { label: t('SupplierQuotation.Qty') },
      { label: t('SupplierQuotation.Price') }, { label: t('SupplierQuotation.LineDis') },
      { label: t('SupplierQuotation.Total') }, { label: t('SupplierQuotation.DelvDays') },
    ];
    const rows = this.itemLines().map(l => `<tr>` +
      `<td>${this.esc(l.ItemNo)}</td><td>${this.esc(l.ItemName)}</td><td>${this.esc(l.UnitName)}</td>` +
      `<td>${this.esc(l.Qty)}</td><td>${this.esc(l.Cost)}</td><td>${this.esc(l.LineDis)}</td>` +
      `<td>${this.esc(this.n3(this.lineTotal(l)))}</td><td>${this.esc(l.DelvDays)}</td></tr>`).join('');
    const ven = this.lookups.Suppliers.find(x => x.VenNo === this.hdr.venNo);
    const filtersHtml =
      `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.QuotNo'))}:</span><span class="filter-value">${this.esc(this.hdr.quotNo)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.Date'))}:</span><span class="filter-value">${this.esc(this.hdr.qdate)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.Supplier'))}:</span><span class="filter-value">${this.esc(ven ? ven.Name : this.hdr.venNo)}</span></div>` +
      (this.hdr.validUntil ? `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.ValidUntil'))}:</span><span class="filter-value">${this.esc(this.hdr.validUntil)}</span></div>` : '');
    const footerHtml = `<div style="text-align:end">${this.esc(t('SupplierQuotation.Total'))}: <b>${this.esc(this.n3(this.total))}</b> — ${this.esc(t('SupplierQuotation.Discount'))}: <b>${this.esc(this.n3(this.disAmount))}</b> — ${this.esc(t('SupplierQuotation.Net'))}: <b>${this.esc(this.n3(this.net))}</b></div>`;
    this.reportService.printReport(`${t('SupplierQuotation.Title')} — ${this.hdr.quotNo}`, cols, rows, filtersHtml, footerHtml);
  }
}
