import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { AuthService } from '../../../shared/services/auth.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { InboundPrintService, InboundPrintFilter, InboundPrintRow } from '../../../shared/services/inbound-print.service';

@Component({
  selector: 'app-inbound-print',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './inbound-print.component.html',
  styleUrl: './inbound-print.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class InboundPrintComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  year: number = new Date().getFullYear();
  serialNo: number | null = null;
  docNo: string | null = null;
  showPrice = false;                    // إظهار سعر البيع
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  serials: VoucherSerial[] = [];        // VoucherSerial where VTypeNo=20 (inbound)

  // ─── Results ───────────────────────────────────────────────
  rows: InboundPrintRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: InboundPrintService,
    private serialSvc: VoucherSerialService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get canViewCost(): boolean { return this.auth.hasPermission('InboundPrint.ViewCost'); }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get header(): InboundPrintRow | null { return this.rows[0] || null; }
  get grandTotal(): number { return this.rows.reduce((s, r) => s + (+r.Total || 0), 0); }

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.serialSvc.getAll(20).subscribe({ next: r => this.serials = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onlyDigits(e: KeyboardEvent): void { if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); }
  sanitizeDoc(): void { this.docNo = (this.docNo ?? '').replace(/\D/g, ''); this.onFilterChange(); }

  private validate(): boolean {
    if (!this.year) { this.toastr.warning(this.translate.instant('InboundPrint.YearRequired')); return false; }
    if (!this.serialNo) { this.toastr.warning(this.translate.instant('InboundPrint.SerialRequired')); return false; }
    if (!this.docNo) { this.toastr.warning(this.translate.instant('InboundPrint.DocRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: InboundPrintFilter = { Year: this.year, SerialNo: this.serialNo!, DocNo: this.docNo! };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  fmtDate(d: string | null): string { return d ? d.substring(0, 10) : ''; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const showCost = this.canViewCost, showPrice = this.showPrice;
    const hd = this.header;

    const cols = [
      { label: t('InboundPrint.ItemNo') }, { label: t('InboundPrint.ItemName') }, { label: t('InboundPrint.Unit') },
      { label: t('InboundPrint.Store') }, { label: t('InboundPrint.Qty') },
      ...(showCost ? [{ label: t('InboundPrint.Cost') }] : []),
      { label: t('InboundPrint.Total') },
      ...(showPrice ? [{ label: t('InboundPrint.Price') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}${r.Barcode ? ' / ' + r.Barcode : ''}</td>` +
      `<td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td>${this.isAr ? (r.StoreName ?? '') : (r.StoreEName || r.StoreName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.Qty)}</td>` +
      (showCost ? `<td style="text-align:end">${fmt(r.Cost)}</td>` : '') +
      `<td style="text-align:end">${fmt(r.Total)}</td>` +
      (showPrice ? `<td style="text-align:end">${fmt(r.Price)}</td>` : '') + `</tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="${4 + (showCost ? 1 : 0)}">${t('General.Total')}</td>` +
      `<td></td><td style="text-align:end">${fmt(this.grandTotal)}</td>` + (showPrice ? '<td></td>' : '') + `</tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml = hd
      ? fi(t('InboundPrint.DocNo'), hd.DocNo) + fi(t('InboundPrint.Date'), this.fmtDate(hd.TransDate)) +
        fi(t('InboundPrint.Vendor'), `${hd.AccNo || ''} ${this.isAr ? (hd.VendorName || '') : (hd.VendorEName || hd.VendorName || '')}`) +
        fi(t('InboundPrint.Serial'), this.isAr ? (hd.SerialName || '') : (hd.SerialEName || hd.SerialName || '')) +
        (hd.Des ? fi(t('InboundPrint.Des'), hd.Des) : '')
      : '';

    this.reportPrint.printReport(t('InboundPrint.Title'), cols, rowsHtml + totRow, filtersHtml);
  }
}
