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
  SupplierQuotationService, RfqQuotation, RfqComparisonRow, RfqBestDeal,
  SupplierQuotationLookups, SQ_STATUS,
} from '../../../shared/services/supplier-quotation.service';

/** Comparison rows grouped per item, cheapest first. */
interface ItemGroup {
  itemNo: string;
  itemName: string;
  rows: RfqComparisonRow[];
}

@Component({
  selector: 'app-rfq',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule,
    SharedModule, ConfirmationModalComponent, HasPermissionDirective, PaginatePipe, PaginatorComponent,
    ReportExportComponent,
  ],
  templateUrl: './rfq.component.html',
  styleUrls: ['./rfq.component.scss'],
})
export class RfqComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  readonly currentYear = new Date().getFullYear();
  readonly SQ = SQ_STATUS;

  activeTab: 'offers' | 'compare' | 'best' = 'offers';

  filters = {
    year: new Date().getFullYear(),
    status: null as number | null,
    venNo: null as number | null,
    itemReq: null as string | null,
    fromDate: '',
    toDate: '',
  };

  lookups: SupplierQuotationLookups = {
    Suppliers: [], Currencies: [], PaymentTerms: [], Stores: [],
    CostCenters: [], MaterialRequests: [], PoSerials: [],
  };

  offers: RfqQuotation[] = [];
  comparison: RfqComparisonRow[] = [];
  bestDeal: RfqBestDeal | null = null;
  loading = false;
  page = 1;
  pageSize = 10;

  /** Purchase-order serial used when an approval generates the order. */
  poSerial: number | null = null;

  readonly pApprove = 'Rfq.Approve';
  readonly pPrint = 'Rfq.Print';

  readonly statusOptions = [
    { v: null as number | null, k: 'Rfq.StatusAll' },
    { v: SQ_STATUS.New, k: 'SupplierQuotation.StatusNew' },
    { v: SQ_STATUS.Approved, k: 'SupplierQuotation.StatusApproved' },
    { v: SQ_STATUS.Rejected, k: 'SupplierQuotation.StatusRejected' },
  ];

  constructor(
    private svc: SupplierQuotationService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  ngOnInit(): void {
    this.svc.lookups().subscribe({
      next: l => {
        this.lookups = l;
        if (l.PoSerials?.length) this.poSerial = l.PoSerials[0].SerialNo;
      },
      error: () => {},
    });
    this.search();
  }

  switchTab(t: 'offers' | 'compare' | 'best'): void {
    this.activeTab = t;
    if (t === 'compare') this.loadComparison();
    if (t === 'best') this.loadBestDeal();
  }

  /** Results are cleared whenever a filter changes, so what is shown always
   *  matches the filters (same convention as the report screens). */
  onFilterChange(): void {
    this.offers = [];
    this.comparison = [];
    this.bestDeal = null;
  }

  search(): void {
    this.loading = true;
    this.page = 1;
    this.svc.rfq(this.filters.year, {
      status: this.filters.status,
      venNo: this.filters.venNo,
      itemReq: this.filters.itemReq,
      fromDate: this.filters.fromDate,
      toDate: this.filters.toDate,
    }).subscribe({
      next: d => { this.offers = d || []; this.loading = false; },
      error: err => { this.loading = false; this.toastr.error(err?.error?.message || this.translate.instant('General.Error')); },
    });
    if (this.activeTab === 'compare') this.loadComparison();
    if (this.activeTab === 'best') this.loadBestDeal();
  }

  loadComparison(): void {
    this.svc.comparison(this.filters.year, this.filters.itemReq).subscribe({
      next: d => (this.comparison = d || []),
      error: () => (this.comparison = []),
    });
  }

  loadBestDeal(): void {
    this.svc.bestDeal(this.filters.year, this.filters.itemReq).subscribe({
      next: d => (this.bestDeal = d),
      error: () => (this.bestDeal = null),
    });
  }

  /** True when no supplier quoted every item, so there is no single-supplier award. */
  get noCompleteOffer(): boolean {
    return !!this.bestDeal && this.bestDeal.Totals.BestSingleTotal == null;
  }

  /** Savings as a share of the single-supplier award, for the headline card. */
  get savingsPct(): number {
    const t = this.bestDeal?.Totals;
    if (!t || t.BestSingleTotal == null || !t.BestSingleTotal) return 0;
    return +(((t.Savings || 0) / t.BestSingleTotal) * 100).toFixed(1);
  }

  /** Distinct suppliers involved if the award is split. */
  get splitSupplierCount(): number {
    return new Set((this.bestDeal?.SplitAward || []).map(r => r.VenNo)).size;
  }

  /** Comparison rows grouped by item; SP already orders them cheapest-first. */
  get itemGroups(): ItemGroup[] {
    const map = new Map<string, ItemGroup>();
    for (const r of this.comparison) {
      const key = (r.ItemNo || '').toString();
      if (!map.has(key)) map.set(key, { itemNo: key, itemName: r.ItemName || '', rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.values());
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

  // ─── confirmation dialog ─────────────────────────────────────
  // One modal instance drives every confirmation on this screen; the copy and
  // the action to run are set just before it is opened.
  confirmTitle = '';
  confirmMessage = '';
  confirmButtonText = '';
  confirmButtonClass = 'btn-danger';
  confirmDetails: { label: string; value: string }[] = [];
  private pendingAction: (() => void) | null = null;

  private ask(opts: {
    title: string; message: string; button: string; buttonClass?: string;
    details?: { label: string; value: string }[];
  }, action: () => void): void {
    this.confirmTitle = opts.title;
    this.confirmMessage = opts.message;
    this.confirmButtonText = opts.button;
    this.confirmButtonClass = opts.buttonClass || 'btn-danger';
    this.confirmDetails = opts.details || [];
    this.pendingAction = action;
    this.confirmModal.show();
  }

  onConfirmed(): void {
    const run = this.pendingAction;
    this.pendingAction = null;
    if (run) run();
  }

  // ─── actions ─────────────────────────────────────────────────
  approve(r: RfqQuotation): void {
    if (r.Status === SQ_STATUS.Approved) return;
    if (!this.poSerial) { this.toastr.warning(this.translate.instant('Rfq.SerialRequired')); return; }
    const t = (k: string, p?: any) => this.translate.instant(k, p);

    this.ask({
      title: t('Rfq.ConfirmApproveTitle'),
      // an expired offer still can be approved, but the dialog says so plainly
      message: r.Expired === 1 ? t('Rfq.ConfirmApproveExpired', { no: r.QuotNo })
                               : t('Rfq.ConfirmApprove', { no: r.QuotNo, ven: r.VenName || r.VenNo }),
      button: t('Rfq.Approve'),
      buttonClass: r.Expired === 1 ? 'btn-warning' : 'btn-success',
      details: [
        { label: t('SupplierQuotation.QuotNo'), value: `${r.QuotNo}` },
        { label: t('SupplierQuotation.Supplier'), value: `${r.VenName || r.VenNo}` },
        { label: t('SupplierQuotation.Net'), value: `${this.n3(r.Net)} ${r.CurName || ''}`.trim() },
      ],
    }, () => this.doApprove(r));
  }

  private doApprove(r: RfqQuotation): void {
    this.svc.approve(r.QuotNo, this.filters.year, this.poSerial!).subscribe({
      next: res => {
        this.toastr.success(this.translate.instant('Rfq.Approved', { po: res?.PONo }));
        this.search();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  unapprove(r: RfqQuotation): void {
    const t = (k: string, p?: any) => this.translate.instant(k, p);
    this.ask({
      title: t('Rfq.ConfirmUnapproveTitle'),
      message: t('Rfq.ConfirmUnapprove', { no: r.QuotNo, po: r.PONo }),
      button: t('Rfq.Unapprove'),
      buttonClass: 'btn-danger',
      details: [
        { label: t('SupplierQuotation.QuotNo'), value: `${r.QuotNo}` },
        { label: t('SupplierQuotation.PurchaseOrder'), value: `${r.PONo}` },
      ],
    }, () => this.doUnapprove(r));
  }

  private doUnapprove(r: RfqQuotation): void {
    this.svc.unapprove(r.QuotNo, this.filters.year).subscribe({
      next: () => { this.toastr.success(this.translate.instant('Rfq.Unapproved')); this.search(); },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  reject(r: RfqQuotation, reject = 1): void {
    this.svc.reject(r.QuotNo, this.filters.year, reject).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant(reject === 1 ? 'Rfq.Rejected' : 'Rfq.Reopened'));
        this.search();
      },
      error: err => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  openQuotation(r: RfqQuotation): void {
    this.router.navigate(['/purchases/documents/supplier-quotation']);
  }

  openPurchaseOrder(r: RfqQuotation): void {
    this.router.navigate(['/purchases/documents/purchase-order']);
  }

  // ─── print ───────────────────────────────────────────────────
  private esc = (v: any) =>
    (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
  private n3 = (v: any) => (+(v || 0)).toLocaleString('en-US', { maximumFractionDigits: 3 });

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    if (this.activeTab === 'compare') { this.printComparison(); return; }
    if (this.activeTab === 'best') { this.printBestDeal(); return; }
    if (!this.offers.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('SupplierQuotation.QuotNo') }, { label: t('SupplierQuotation.Date') },
      { label: t('SupplierQuotation.Supplier') }, { label: t('SupplierQuotation.MaterialReqNo') },
      { label: t('SupplierQuotation.Net') }, { label: t('SupplierQuotation.Status') },
      { label: t('SupplierQuotation.PurchaseOrder') },
    ];
    const rows = this.offers.map(r => `<tr>` +
      `<td>${this.esc(r.QuotNo)}</td><td>${this.esc((r.QDate || '').slice(0, 10))}</td>` +
      `<td>${this.esc(r.VenName)}</td><td>${this.esc(r.ItemReq)}</td>` +
      `<td>${this.esc(this.n3(r.Net))}</td><td>${this.esc(t(this.statusKey(r.Status)))}</td>` +
      `<td>${this.esc(r.PONo)}</td></tr>`).join('');
    this.reportService.printReport(t('Rfq.Title'), cols, rows, this.filtersHtml());
  }

  private printBestDeal(): void {
    const t = (k: string, p?: any) => this.translate.instant(k, p);
    const d = this.bestDeal;
    if (!d || !d.Suppliers.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('SupplierQuotation.Supplier') }, { label: t('SupplierQuotation.QuotNo') },
      { label: t('Rfq.Coverage') }, { label: t('SupplierQuotation.Net') },
      { label: t('SupplierQuotation.DelvDays') }, { label: t('Rfq.BestSingle') },
    ];
    const rows = d.Suppliers.map(r => `<tr>` +
      `<td>${this.esc(r.VenName)}</td><td>${this.esc(r.QuotNo)}</td>` +
      `<td>${this.esc(r.ItemsQuoted)}/${this.esc(r.ItemsInScope)}</td>` +
      `<td>${this.esc(this.n3(r.Net))}</td><td>${this.esc(r.MaxDelvDays)}</td>` +
      `<td>${r.IsBestSingle === 1 ? '★' : ''}</td></tr>`).join('');
    const tt = d.Totals;
    const footerHtml =
      `<div>${this.esc(t('Rfq.BestSingle'))}: <b>${this.esc(tt.BestSingleTotal == null ? '-' : this.n3(tt.BestSingleTotal))}</b>` +
      ` (${this.esc(tt.BestSingleVenName || '-')})</div>` +
      `<div>${this.esc(t('Rfq.SplitAward'))}: <b>${this.esc(this.n3(tt.SplitTotal))}</b></div>` +
      `<div>${this.esc(t('Rfq.Savings'))}: <b>${this.esc(tt.Savings == null ? '-' : this.n3(tt.Savings))}</b></div>`;
    this.reportService.printReport(t('Rfq.BestDealTab'), cols, rows, this.filtersHtml(), footerHtml);
  }

  private printComparison(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.comparison.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('SupplierQuotation.ItemNo') }, { label: t('SupplierQuotation.ItemName') },
      { label: t('SupplierQuotation.Supplier') }, { label: t('SupplierQuotation.QuotNo') },
      { label: t('SupplierQuotation.Qty') }, { label: t('Rfq.NetPrice') },
      { label: t('SupplierQuotation.Total') }, { label: t('SupplierQuotation.DelvDays') },
      { label: t('Rfq.Lowest') },
    ];
    const rows = this.comparison.map(r => `<tr>` +
      `<td>${this.esc(r.ItemNo)}</td><td>${this.esc(r.ItemName)}</td><td>${this.esc(r.VenName)}</td>` +
      `<td>${this.esc(r.QuotNo)}</td><td>${this.esc(this.n3(r.Qty))}</td>` +
      `<td>${this.esc(this.n3(r.NetPrice))}</td><td>${this.esc(this.n3(r.LineTotal))}</td>` +
      `<td>${this.esc(r.DelvDays)}</td>` +
      `<td>${r.IsLowest === 1 ? '★' : ''}</td></tr>`).join('');
    this.reportService.printReport(t('Rfq.ComparisonTab'), cols, rows, this.filtersHtml());
  }

  private filtersHtml(): string {
    const t = (k: string) => this.translate.instant(k);
    const ven = this.lookups.Suppliers.find(x => x.VenNo === this.filters.venNo);
    let h = `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.Year'))}:</span><span class="filter-value">${this.esc(this.filters.year)}</span></div>`;
    if (ven) h += `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.Supplier'))}:</span><span class="filter-value">${this.esc(ven.Name)}</span></div>`;
    if (this.filters.itemReq) h += `<div class="filter-item"><span class="filter-label">${this.esc(t('SupplierQuotation.MaterialReqNo'))}:</span><span class="filter-value">${this.esc(this.filters.itemReq)}</span></div>`;
    if (this.filters.fromDate) h += `<div class="filter-item"><span class="filter-label">${this.esc(t('General.DateFrom'))}:</span><span class="filter-value">${this.esc(this.filters.fromDate)}</span></div>`;
    if (this.filters.toDate) h += `<div class="filter-item"><span class="filter-label">${this.esc(t('General.DateTo'))}:</span><span class="filter-value">${this.esc(this.filters.toDate)}</span></div>`;
    return h;
  }
}
