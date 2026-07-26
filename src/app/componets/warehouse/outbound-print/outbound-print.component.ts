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
import { OutboundPrintService, OutboundPrintFilter, OutboundPrintRow } from '../../../shared/services/outbound-print.service';

@Component({
  selector: 'app-outbound-print',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './outbound-print.component.html',
  styleUrl: './outbound-print.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class OutboundPrintComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  year: number = new Date().getFullYear();
  serialNo: number | null = null;
  docNo: string | null = null;
  showDetails = false;                  // اظهار التفاصيل (cost/total/accounts) — gated by ViewCost
  decimals = 3;

  serials: VoucherSerial[] = [];        // VoucherSerial where VTypeNo=21 (outbound)

  rows: OutboundPrintRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: OutboundPrintService,
    private serialSvc: VoucherSerialService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get canViewCost(): boolean { return this.auth.hasPermission('OutboundPrint.ViewCost'); }
  /** show cost/total/account columns = detail toggle AND permission (else batch column). */
  get showDetailCols(): boolean { return this.canViewCost && this.showDetails; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get header(): OutboundPrintRow | null { return this.rows[0] || null; }
  get grandTotal(): number { return this.rows.reduce((s, r) => s + (+r.Total || 0), 0); }

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.serialSvc.getAll(21).subscribe({ next: r => this.serials = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onlyDigits(e: KeyboardEvent): void { if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); }
  sanitizeDoc(): void { this.docNo = (this.docNo ?? '').replace(/\D/g, ''); this.onFilterChange(); }

  private validate(): boolean {
    if (!this.year) { this.toastr.warning(this.translate.instant('OutboundPrint.YearRequired')); return false; }
    if (!this.serialNo) { this.toastr.warning(this.translate.instant('OutboundPrint.SerialRequired')); return false; }
    if (!this.docNo) { this.toastr.warning(this.translate.instant('OutboundPrint.DocRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: OutboundPrintFilter = { Year: this.year, SerialNo: this.serialNo!, DocNo: this.docNo! };
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
    const det = this.showDetailCols;
    const hd = this.header;

    const cols = [
      { label: t('OutboundPrint.ItemNo') }, { label: t('OutboundPrint.ItemName') },
      { label: t('OutboundPrint.Qty') }, { label: t('OutboundPrint.Unit') }, { label: t('OutboundPrint.Store') },
      ...(det
        ? [{ label: t('OutboundPrint.Cost') }, { label: t('OutboundPrint.Total') }, { label: t('OutboundPrint.CrAcc') }, { label: t('OutboundPrint.DrAcc') }]
        : [{ label: t('OutboundPrint.Batch') }]),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.Qty)}</td><td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td>${this.isAr ? (r.StoreName ?? '') : (r.StoreEName || r.StoreName || '')}</td>` +
      (det
        ? `<td style="text-align:end">${fmt(r.Cost)}</td><td style="text-align:end">${fmt(r.Total)}</td><td>${r.CrAccName ?? (r.CrAccNo || '')}</td><td>${r.DrAccName ?? (r.DrAccNo || '')}</td>`
        : `<td>${r.BatchNo ?? ''}</td>`) + `</tr>`).join('');
    const totRow = det
      ? `<tr style="font-weight:700;background:#dbeafe"><td colspan="5">${t('General.Total')}</td><td></td><td style="text-align:end">${fmt(this.grandTotal)}</td><td></td><td></td></tr>`
      : '';

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml = hd
      ? fi(t('OutboundPrint.DocNo'), hd.DocNo) + fi(t('OutboundPrint.Date'), this.fmtDate(hd.TransDate)) +
        (hd.TargetName ? fi(t('OutboundPrint.Target'), this.isAr ? hd.TargetName : (hd.TargetEName || hd.TargetName)) : '') +
        fi(t('OutboundPrint.Customer'), `${hd.AccNo || ''} ${hd.CustomerName || ''}`) +
        fi(t('OutboundPrint.Serial'), this.isAr ? (hd.SerialName || '') : (hd.SerialEName || hd.SerialName || '')) +
        (hd.Des ? fi(t('OutboundPrint.Des'), hd.Des) : '')
      : '';

    // VB6 signature footer: مسؤول اللوازم | المالية | توقيع المستلم (each over a signature line)
    const sig = (label: string) =>
      `<div style="flex:1;text-align:center;padding:0 12px;"><div style="margin-bottom:40px;">${label}</div><div>-----------------</div></div>`;
    const footerHtml =
      `<div style="display:flex;margin-top:24px;">${sig(t('OutboundPrint.SigStorekeeper'))}${sig(t('OutboundPrint.SigFinance'))}${sig(t('OutboundPrint.SigRecipient'))}</div>`;

    this.reportPrint.printReport(t('OutboundPrint.Title'), cols, rowsHtml + totRow, filtersHtml, footerHtml);
  }
}
