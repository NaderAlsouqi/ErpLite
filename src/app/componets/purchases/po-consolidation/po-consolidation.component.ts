import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  PoConsolidationService, PoConsolidation, PoConsolidationRow,
  PoConsolidationLine, PoConsolidationLookups, PoConsDoc, PoConsListRow,
} from '../../../shared/services/po-consolidation.service';

@Component({
  selector: 'app-po-consolidation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule,
    SharedModule, ConfirmationModalComponent, HasPermissionDirective, PaginatePipe, PaginatorComponent,
    ReportExportComponent,
  ],
  templateUrl: './po-consolidation.component.html',
  styleUrls: ['./po-consolidation.component.scss'],
})
export class PoConsolidationComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  readonly currentYear = new Date().getFullYear();

  activeTab: 'doc' | 'list' = 'doc';

  /** The طلب التجميع being built or edited. */
  doc = { consNo: '', cdate: this.today(), notes: '' };
  docs: PoConsListRow[] = [];
  docPage = 1;
  docPageSize = 10;
  isExistingDoc = false;
  saving = false;

  /** Purchase orders ticked into the current document, keyed `${OrderNo}|${VType}`. */
  private selected = new Set<string>();

  filters = {
    year: new Date().getFullYear(),
    vtype: null as number | null,
    venNo: null as number | null,
    fromDate: '',
    toDate: '',
    dealOnly: null as number | null,
  };

  lookups: PoConsolidationLookups = { Serials: [], Suppliers: [] };

  orders: PoConsolidationRow[] = [];
  private lines: PoConsolidationLine[] = [];
  /** Order keys currently expanded, as `${OrderNo}|${VType}`. */
  private expanded = new Set<string>();

  loading = false;
  page = 1;
  pageSize = 10;

  readonly pPrint  = 'PoConsolidation.Print';
  readonly pCreate = 'PoConsolidation.Create';
  readonly pDelete = 'PoConsolidation.Delete';

  readonly dealOptions = [
    { v: null as number | null, k: 'PoConsolidation.DealAll' },
    { v: 1, k: 'PoConsolidation.DealOnly' },
    { v: 0, k: 'PoConsolidation.ManualOnly' },
  ];

  constructor(
    private svc: PoConsolidationService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  ngOnInit(): void {
    this.svc.lookups().subscribe({ next: l => (this.lookups = l), error: () => {} });
    this.refreshDocNextNo();
    this.loadDocs();
    this.search();
  }

  switchTab(t: 'doc' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadDocs();
  }

  /** Opening a consolidation from the list jumps back to the document tab. */
  openDocFromList(row: PoConsListRow): void {
    this.activeTab = 'doc';
    this.openDoc(row.ConsNo);
  }

  /** Results are cleared when a filter changes, so what is shown always matches
   *  the filters (same convention as the report screens). */
  onFilterChange(): void {
    this.orders = [];
    this.lines = [];
    this.expanded.clear();
  }

  search(): void {
    this.loading = true;
    this.page = 1;
    this.expanded.clear();
    this.svc.list(this.filters.year, {
      vtype: this.filters.vtype,
      venNo: this.filters.venNo,
      fromDate: this.filters.fromDate,
      toDate: this.filters.toDate,
      dealOnly: this.filters.dealOnly,
    }).subscribe({
      next: (d: PoConsolidation) => {
        this.orders = d?.Orders || [];
        this.lines = d?.Lines || [];
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ─── طلب التجميع document ────────────────────────────────────
  refreshDocNextNo(): void {
    if (this.isExistingDoc) return;
    this.svc.docNextNo(this.filters.year).subscribe({
      next: r => (this.doc.consNo = r?.nextNo || ''),
      error: () => (this.doc.consNo = ''),
    });
  }

  loadDocs(): void {
    this.svc.docList(this.filters.year).subscribe({
      next: d => (this.docs = d || []),
      error: () => (this.docs = []),
    });
  }

  /** Start a fresh consolidation: new number, nothing selected. */
  newDoc(): void {
    this.doc = { consNo: '', cdate: this.today(), notes: '' };
    this.isExistingDoc = false;
    this.selected.clear();
    this.refreshDocNextNo();
  }

  /** Open an existing consolidation and tick its orders. */
  openDoc(consNo: string): void {
    if (!consNo) return;
    this.svc.docGet(consNo, this.filters.year).subscribe({
      next: d => {
        this.doc = {
          consNo: d.ConsNo || '',
          cdate: (d.CDate || '').toString().slice(0, 10) || this.today(),
          notes: d.Notes || '',
        };
        this.isExistingDoc = true;
        this.selected.clear();
        (d.Orders || []).forEach(o => this.selected.add(`${o.OrderNo}|${o.POVType}`));
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  onDocNoChange(): void {
    const no = (this.doc.consNo || '').toString().trim();
    if (no) this.openDoc(no);
  }

  saveDoc(): void {
    const no = (this.doc.consNo || '').toString().trim();
    if (!no) { this.toastr.warning(this.translate.instant('PoConsolidation.ConsNoRequired')); return; }
    if (!this.selectedCount) { this.toastr.warning(this.translate.instant('PoConsolidation.SelectOrders')); return; }

    const dto: PoConsDoc = {
      ConsNo: no,
      Myear: this.filters.year,
      CDate: this.doc.cdate,
      Notes: this.doc.notes,
      Orders: this.orders
        .filter(r => this.isSelected(r))
        .map(r => ({ OrderNo: r.OrderNo, POYear: r.Myear, POVType: r.VType })),
    };

    this.saving = true;
    this.svc.docSave(dto).subscribe({
      next: () => {
        this.saving = false;
        this.isExistingDoc = true;
        this.toastr.success(this.translate.instant('PoConsolidation.Saved', { no }));
        this.loadDocs();
        this.search();
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  confirmDelete(): void {
    if (this.isExistingDoc) this.confirmModal.show();
  }

  doDelete(): void {
    this.svc.docDelete(this.doc.consNo, this.filters.year).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('General.DeleteSuccess'));
        this.newDoc();
        this.loadDocs();
        this.search();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── order selection ─────────────────────────────────────────
  isSelected(r: PoConsolidationRow): boolean { return this.selected.has(this.key(r)); }

  /** An order already held by a DIFFERENT consolidation cannot be ticked. */
  isLockedByOther(r: PoConsolidationRow): boolean {
    const c = (r.ConsNo || '').toString().trim();
    return !!c && c !== (this.doc.consNo || '').toString().trim();
  }

  toggleSelect(r: PoConsolidationRow): void {
    if (this.isLockedByOther(r)) {
      this.toastr.warning(this.translate.instant('PoConsolidation.AlreadyConsolidated', { no: r.ConsNo }));
      return;
    }
    const k = this.key(r);
    if (this.selected.has(k)) this.selected.delete(k); else this.selected.add(k);
  }

  get selectableOrders(): PoConsolidationRow[] {
    return this.orders.filter(r => !this.isLockedByOther(r));
  }

  get allSelected(): boolean {
    const sel = this.selectableOrders;
    return sel.length > 0 && sel.every(r => this.isSelected(r));
  }

  toggleSelectAll(): void {
    const sel = this.selectableOrders;
    if (this.allSelected) sel.forEach(r => this.selected.delete(this.key(r)));
    else sel.forEach(r => this.selected.add(this.key(r)));
  }

  get selectedCount(): number {
    return this.orders.filter(r => this.isSelected(r)).length;
  }

  /** Totals for what is currently ticked — what this document will commit to. */
  get selectedNet(): number {
    return +this.orders.filter(r => this.isSelected(r))
                       .reduce((s, r) => s + (+(r.Net || 0)), 0).toFixed(4);
  }

  get selectedRemainQty(): number {
    return +this.orders.filter(r => this.isSelected(r))
                       .reduce((s, r) => s + (r.RemainQty == null ? 0 : +r.RemainQty), 0).toFixed(3);
  }

  // ─── row expansion ───────────────────────────────────────────
  private key(r: PoConsolidationRow): string { return `${r.OrderNo}|${r.VType}`; }

  isExpanded(r: PoConsolidationRow): boolean { return this.expanded.has(this.key(r)); }

  toggle(r: PoConsolidationRow): void {
    const k = this.key(r);
    if (this.expanded.has(k)) this.expanded.delete(k); else this.expanded.add(k);
  }

  /** Lines of one order; they arrive with the orders so this needs no request. */
  linesOf(r: PoConsolidationRow): PoConsolidationLine[] {
    return this.lines.filter(l => l.OrderNo === r.OrderNo && l.VType === r.VType);
  }

  // ─── totals ──────────────────────────────────────────────────
  get totalNet(): number {
    return +this.orders.reduce((s, r) => s + (+(r.Net || 0)), 0).toFixed(4);
  }

  get totalDealNet(): number {
    return +this.orders.filter(r => r.HasDeal === 1)
                       .reduce((s, r) => s + (+(r.DealNet || 0)), 0).toFixed(4);
  }

  get totalVariance(): number {
    return +this.orders.reduce((s, r) => s + (+(r.Variance || 0)), 0).toFixed(4);
  }

  /** Only deal-backed orders have a remaining quantity; the rest are skipped. */
  get totalRemainQty(): number {
    return +this.orders.reduce((s, r) => s + (r.RemainQty == null ? 0 : +r.RemainQty), 0).toFixed(3);
  }

  get totalRecvQty(): number {
    return +this.orders.reduce((s, r) => s + (+(r.RecvQty || 0)), 0).toFixed(3);
  }

  get totalRemainToReceive(): number {
    return +this.orders.reduce((s, r) => s + (+(r.RemainToReceive || 0)), 0).toFixed(3);
  }

  get dealCount(): number { return this.orders.filter(r => r.HasDeal === 1).length; }
  get manualCount(): number { return this.orders.filter(r => r.HasDeal !== 1).length; }

  /** A drifted order is one whose value no longer matches the deal it came from. */
  get driftedCount(): number {
    return this.orders.filter(r => r.HasDeal === 1 && Math.abs(+(r.Variance || 0)) > 0.0001).length;
  }

  varianceClass(r: PoConsolidationRow): string {
    if (r.HasDeal !== 1 || r.Variance == null) return '';
    const v = +r.Variance;
    if (Math.abs(v) <= 0.0001) return 'text-muted';
    return v > 0 ? 'text-danger fw-semibold' : 'text-success fw-semibold';
  }

  // ─── navigation ──────────────────────────────────────────────
  openOrder(r: PoConsolidationRow): void {
    this.router.navigate(['/purchases/documents/purchase-order']);
  }

  /** Opens the deal on the عرض سعر screen, landing on قائمة العروض with that
   *  quotation filtered in and highlighted. */
  openDeal(r: PoConsolidationRow): void {
    if (!r.QuotNo) return;
    this.router.navigate(['/purchases/documents/supplier-quotation'], {
      queryParams: { quotNo: r.QuotNo, year: r.Myear, tab: 'list' },
    });
  }

  // ─── print ───────────────────────────────────────────────────
  private esc(v: any): string {
    return (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
  }

  private n3(v: any): string {
    return (+(v || 0)).toLocaleString('en-US', { maximumFractionDigits: 3 });
  }

  print(): void {
    if (this.activeTab === 'list') { this.printDocs(); return; }
    this.printOrders();
  }

  private printDocs(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.docs.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('PoConsolidation.ConsNo') }, { label: t('PoConsolidation.ConsDate') },
      { label: t('PoConsolidation.Orders') }, { label: t('PoConsolidation.TotalNet') },
      { label: t('PoConsolidation.RemainQty') }, { label: t('PoConsolidation.Notes') },
    ];
    const rows = this.docs.map(d => `<tr>` +
      `<td>${this.esc(d.ConsNo)}</td>` +
      `<td>${this.esc((d.CDate || '').toString().slice(0, 10))}</td>` +
      `<td>${this.esc(d.OrderCount)}</td>` +
      `<td>${this.esc(this.n3(d.Net))}</td>` +
      `<td>${this.esc(this.n3(d.RemainQty))}</td>` +
      `<td>${this.esc(d.Notes)}</td></tr>`).join('');
    const footerHtml = `<div style="text-align:end">${this.esc(t('PoConsolidation.Consolidations'))}: <b>${this.docs.length}</b></div>`;
    this.reportService.printReport(t('PoConsolidation.ListTab'), cols, rows, '', footerHtml);
  }

  private printOrders(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.orders.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }

    const cols = [
      { label: t('PoConsolidation.OrderNo') }, { label: t('PoConsolidation.Date') },
      { label: t('PoConsolidation.Supplier') }, { label: t('PoConsolidation.MaterialReqNo') },
      { label: t('PoConsolidation.Deal') }, { label: t('PoConsolidation.DealNet') },
      { label: t('PoConsolidation.OrderNet') }, { label: t('PoConsolidation.Variance') },
      { label: t('PoConsolidation.Lines') },
    ];
    const rows = this.orders.map(r => `<tr>` +
      `<td>${this.esc(r.OrderNo)}</td>` +
      `<td>${this.esc((r.ODate || '').toString().slice(0, 10))}</td>` +
      `<td>${this.esc(r.VenName)}</td>` +
      `<td>${this.esc(r.ItemReq)}</td>` +
      `<td>${this.esc(r.QuotNo || t('PoConsolidation.NoDeal'))}</td>` +
      `<td>${this.esc(r.HasDeal === 1 ? this.n3(r.DealNet) : '')}</td>` +
      `<td>${this.esc(this.n3(r.Net))}</td>` +
      `<td>${this.esc(r.Variance == null ? '' : this.n3(r.Variance))}</td>` +
      `<td>${this.esc(r.RemainQty == null ? '' : this.n3(r.RemainQty))}</td>` +
      `<td>${this.esc(r.LineCount)}</td></tr>`).join('');

    const f = this.filters;
    const ven = this.lookups.Suppliers.find(x => x.VenNo === f.venNo);
    let filtersHtml =
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PoConsolidation.Year'))}:</span><span class="filter-value">${this.esc(f.year)}</span></div>`;
    if (ven) filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('PoConsolidation.Supplier'))}:</span><span class="filter-value">${this.esc(ven.Name)}</span></div>`;
    if (f.fromDate) filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('General.DateFrom'))}:</span><span class="filter-value">${this.esc(f.fromDate)}</span></div>`;
    if (f.toDate) filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('General.DateTo'))}:</span><span class="filter-value">${this.esc(f.toDate)}</span></div>`;

    const footerHtml =
      `<div style="text-align:end">${this.esc(t('PoConsolidation.Orders'))}: <b>${this.orders.length}</b>` +
      ` — ${this.esc(t('PoConsolidation.FromDeals'))}: <b>${this.dealCount}</b>` +
      ` — ${this.esc(t('PoConsolidation.TotalNet'))}: <b>${this.esc(this.n3(this.totalNet))}</b></div>`;

    this.reportService.printReport(t('PoConsolidation.Title'), cols, rows, filtersHtml, footerHtml);
  }
}
