import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService } from '../../../shared/services/report.service';
import {
  PurchaseInvoiceService, PurchaseInvoice, PurchaseInvoiceListRow,
  PurchInvReceipt, PurchInvAccounts,
} from '../../../shared/services/purchase-invoice.service';

@Component({
  selector: 'app-purchase-invoice',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule,
    ConfirmationModalComponent, HasPermissionDirective, ReportExportComponent,
  ],
  templateUrl: './purchase-invoice.component.html',
  styleUrl: './purchase-invoice.component.scss',
})
export class PurchaseInvoiceComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  activeTab: 'form' | 'list' = 'form';
  readonly currentYear = new Date().getFullYear();

  // ── form ──
  invNo = '';
  invDate = this.today();
  supplierInvNo = '';
  notes = '';
  vatAmount = 0;
  selectedReceipt: PurchInvReceipt | null = null;
  accounts: PurchInvAccounts | null = null;
  receipts: PurchInvReceipt[] = [];
  posted = false;         // an opened, already-posted invoice is read-only
  isExisting = false;
  saving = false;

  // ── list ──
  invoices: PurchaseInvoiceListRow[] = [];
  pendingDelete: PurchaseInvoiceListRow | null = null;

  readonly pCreate = 'PurchaseInvoice.Create';
  readonly pDelete = 'PurchaseInvoice.Delete';
  readonly pPrint  = 'PurchaseInvoice.Print';

  constructor(
    private svc: PurchaseInvoiceService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get readOnly(): boolean { return this.isExisting && this.posted; }

  get goodsAmount(): number { return this.selectedReceipt?.GoodsAmount ?? 0; }
  get totalAmount(): number { return this.round(this.goodsAmount + (Number(this.vatAmount) || 0)); }

  ngOnInit(): void {
    this.loadLookups();
    this.reset();
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private round(n: number): number { return Math.round((Number(n) || 0) * 1000) / 1000; }

  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  private loadLookups(): void {
    this.svc.getLookups(this.currentYear).subscribe({
      next: d => { this.receipts = d?.Receipts || []; this.accounts = d?.Accounts || null; },
      error: () => { this.receipts = []; },
    });
  }

  private loadList(): void {
    this.svc.list(this.currentYear).subscribe({
      next: d => (this.invoices = d || []),
      error: () => (this.invoices = []),
    });
  }

  reset(): void {
    this.isExisting = false;
    this.posted = false;
    this.supplierInvNo = '';
    this.notes = '';
    this.vatAmount = 0;
    this.selectedReceipt = null;
    this.invDate = this.today();
    this.svc.nextNo(this.currentYear).subscribe({
      next: r => (this.invNo = r.nextNo),
      error: () => (this.invNo = ''),
    });
  }

  newInvoice(): void { this.reset(); this.activeTab = 'form'; this.loadLookups(); }

  /** A goods receipt was chosen → default the VAT from its linked أمر الشراء. */
  onReceiptPick(): void {
    this.vatAmount = this.selectedReceipt ? this.round(this.selectedReceipt.DefaultVat || 0) : 0;
  }

  openInvoice(row: PurchaseInvoiceListRow): void {
    this.svc.get(row.InvNo, this.currentYear).subscribe({
      next: inv => {
        this.isExisting = true;
        this.posted = !!inv.Posted;
        this.invNo = inv.InvNo || '';
        this.invDate = inv.InvDate || this.today();
        this.supplierInvNo = inv.SupplierInvNo || '';
        this.notes = inv.Notes || '';
        this.vatAmount = inv.VatAmount || 0;
        // synthesise a receipt object so the summary renders read-only
        this.selectedReceipt = {
          RcptVType: inv.RcptVType || 0, RcptDocNo: inv.RcptDocNo || '', RcptYear: inv.RcptYear || this.currentYear,
          VenNo: inv.VenNo || 0, VenName: inv.VenName, SourcePONo: inv.SourcePONo,
          GoodsAmount: inv.GoodsAmount || 0, DefaultVat: inv.VatAmount || 0,
        };
        this.activeTab = 'form';
      },
      error: () => this.toastr.error(this.translate.instant('PurchaseInvoice.LoadError')),
    });
  }

  save(): void {
    if (this.readOnly) return;
    if (!this.selectedReceipt) { this.toastr.warning(this.translate.instant('PurchaseInvoice.SelectReceipt')); return; }
    if (!this.invNo) { this.toastr.warning(this.translate.instant('PurchaseInvoice.InvNoRequired')); return; }

    const dto: PurchaseInvoice = {
      InvNo: this.invNo,
      Myear: this.currentYear,
      InvDate: this.invDate,
      SupplierInvNo: this.supplierInvNo,
      RcptVType: this.selectedReceipt.RcptVType,
      RcptDocNo: this.selectedReceipt.RcptDocNo,
      RcptYear: this.selectedReceipt.RcptYear,
      GoodsAmount: this.goodsAmount,
      VatAmount: Number(this.vatAmount) || 0,
      TotalAmount: this.totalAmount,
      Notes: this.notes,
    };

    this.saving = true;
    this.svc.save(dto).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.translate.instant('PurchaseInvoice.Saved', { no: this.invNo }));
        this.reset();
        this.loadLookups();
      },
      error: e => {
        this.saving = false;
        this.toastr.error(e?.error?.message || this.translate.instant('PurchaseInvoice.SaveError'));
      },
    });
  }

  askDelete(row: PurchaseInvoiceListRow): void {
    this.pendingDelete = row;
    this.confirmModal.show();
  }

  onConfirmDelete(): void {
    const row = this.pendingDelete;
    this.pendingDelete = null;
    if (row) this.doDelete(row);
  }

  private doDelete(row: PurchaseInvoiceListRow): void {
    this.svc.delete(row.InvNo, this.currentYear).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('PurchaseInvoice.Deleted'));
        this.loadList();
        this.loadLookups();
      },
      error: e => this.toastr.error(e?.error?.message || this.translate.instant('PurchaseInvoice.DeleteError')),
    });
  }

  // ─── print ───────────────────────────────────────────────────
  private esc(v: any): string {
    return (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
  }

  private n2(v: any): string {
    return (+(v || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Prints what the user is looking at: the invoice list, or the open invoice
   *  with its accounting entry (the قيد the document produces). */
  print(): void {
    if (this.activeTab === 'list') { this.printList(); return; }
    this.printInvoice();
  }

  private printList(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.invoices.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('PurchaseInvoice.InvNo') }, { label: t('PurchaseInvoice.InvDate') },
      { label: t('PurchaseInvoice.Vendor') }, { label: t('PurchaseInvoice.SupplierInvNo') },
      { label: t('PurchaseInvoice.RcptShort') }, { label: t('PurchaseInvoice.GoodsAmount') },
      { label: t('PurchaseInvoice.Vat') }, { label: t('PurchaseInvoice.Total') },
    ];
    const rows = this.invoices.map(r => `<tr>` +
      `<td>${this.esc(r.InvNo)}</td><td>${this.esc((r.InvDate || '').toString().slice(0, 10))}</td>` +
      `<td>${this.esc(r.VenName)}</td><td>${this.esc(r.SupplierInvNo)}</td>` +
      `<td>${this.esc(r.RcptDocNo)}</td>` +
      `<td style="text-align:end">${this.esc(this.n2(r.GoodsAmount))}</td>` +
      `<td style="text-align:end">${this.esc(this.n2(r.VatAmount))}</td>` +
      `<td style="text-align:end">${this.esc(this.n2(r.TotalAmount))}</td></tr>`).join('');

    const sum = (f: (r: PurchaseInvoiceListRow) => any) =>
      this.invoices.reduce((s, r) => s + (+(f(r) || 0)), 0);
    const footerHtml =
      `<div style="text-align:end">` +
      `${this.esc(t('PurchaseInvoice.GoodsAmount'))}: <b>${this.esc(this.n2(sum(r => r.GoodsAmount)))}</b> — ` +
      `${this.esc(t('PurchaseInvoice.Vat'))}: <b>${this.esc(this.n2(sum(r => r.VatAmount)))}</b> — ` +
      `${this.esc(t('PurchaseInvoice.Total'))}: <b>${this.esc(this.n2(sum(r => r.TotalAmount)))}</b></div>`;

    this.reportService.printReport(t('PurchaseInvoice.ListTab'), cols, rows, '', footerHtml);
  }

  /** The open invoice printed as its journal entry (Dr GRNI + Dr VAT / Cr supplier). */
  private printInvoice(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.selectedReceipt) { this.toastr.warning(t('PurchaseInvoice.NoReceiptHint')); return; }

    const cols = [
      { label: t('PurchaseInvoice.Account') },
      { label: t('PurchaseInvoice.Debit') },
      { label: t('PurchaseInvoice.Credit') },
    ];
    const line = (acc: string, dr: number | null, cr: number | null) => `<tr>` +
      `<td>${this.esc(acc)}</td>` +
      `<td style="text-align:end">${dr == null ? '—' : this.esc(this.n2(dr))}</td>` +
      `<td style="text-align:end">${cr == null ? '—' : this.esc(this.n2(cr))}</td></tr>`;

    const vat = Number(this.vatAmount) || 0;
    let rows = line(this.accounts?.GrniAccName || t('PurchaseInvoice.Grni'), this.goodsAmount, null);
    if (vat > 0) rows += line(this.accounts?.VatAccName || t('PurchaseInvoice.VatInput'), vat, null);
    rows += line(`${this.selectedReceipt.VenName || ''} (${t('PurchaseInvoice.Payable')})`, null, this.totalAmount);

    let filtersHtml =
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.InvNo'))}:</span><span class="filter-value">${this.esc(this.invNo)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.InvDate'))}:</span><span class="filter-value">${this.esc(this.invDate)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.Vendor'))}:</span><span class="filter-value">${this.esc(this.selectedReceipt.VenName)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.Receipt'))}:</span><span class="filter-value">${this.esc(this.selectedReceipt.RcptDocNo)}</span></div>`;
    if (this.supplierInvNo)
      filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.SupplierInvNo'))}:</span><span class="filter-value">${this.esc(this.supplierInvNo)}</span></div>`;
    if (this.selectedReceipt.SourcePONo)
      filtersHtml += `<div class="filter-item"><span class="filter-label">${this.esc(t('PurchaseInvoice.PO'))}:</span><span class="filter-value">${this.esc(this.selectedReceipt.SourcePONo)}</span></div>`;

    const footerHtml =
      `<div style="text-align:end">` +
      `${this.esc(t('PurchaseInvoice.GoodsAmount'))}: <b>${this.esc(this.n2(this.goodsAmount))}</b> — ` +
      `${this.esc(t('PurchaseInvoice.Vat'))}: <b>${this.esc(this.n2(vat))}</b> — ` +
      `${this.esc(t('PurchaseInvoice.Total'))}: <b>${this.esc(this.n2(this.totalAmount))}</b></div>` +
      (this.notes ? `<div style="margin-top:.5rem">${this.esc(this.notes)}</div>` : '');

    this.reportService.printReport(
      `${t('PurchaseInvoice.Title')} — ${this.invNo}`, cols, rows, filtersHtml, footerHtml);
  }
}
