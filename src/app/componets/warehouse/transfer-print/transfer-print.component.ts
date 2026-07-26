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
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';
import { TransferPrintService, TransferPrintFilter, TransferPrintRow } from '../../../shared/services/transfer-print.service';

@Component({
  selector: 'app-transfer-print',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './transfer-print.component.html',
  styleUrl: './transfer-print.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TransferPrintComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  year: number = new Date().getFullYear();
  serialNo: number | null = null;
  docNo: string | null = null;
  decimals = 3;

  serials: VoucherSerial[] = [];        // VoucherSerial where VTypeNo=23 (transfer)

  rows: TransferPrintRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: TransferPrintService,
    private serialSvc: VoucherSerialService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get header(): TransferPrintRow | null { return this.rows[0] || null; }
  get totQty(): number { return this.rows.reduce((s, r) => s + (+r.Qty || 0), 0); }

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.serialSvc.getAll(23).subscribe({ next: r => this.serials = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onlyDigits(e: KeyboardEvent): void { if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); }
  sanitizeDoc(): void { this.docNo = (this.docNo ?? '').replace(/\D/g, ''); this.onFilterChange(); }

  private validate(): boolean {
    if (!this.year) { this.toastr.warning(this.translate.instant('TransferPrint.YearRequired')); return false; }
    if (!this.serialNo) { this.toastr.warning(this.translate.instant('TransferPrint.SerialRequired')); return false; }
    if (!this.docNo) { this.toastr.warning(this.translate.instant('TransferPrint.DocRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: TransferPrintFilter = { Year: this.year, SerialNo: this.serialNo!, DocNo: this.docNo! };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  fmtDate(d: string | null): string { return d ? d.substring(0, 10) : ''; }
  storeLabel(no: number | null | undefined, ar: string | null, en: string | null): string {
    const name = this.isAr ? (ar || '') : (en || ar || '');
    return `${no ?? ''}${name ? ' — ' + name : ''}`;
  }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const hd = this.header;

    const cols = [
      { label: t('TransferPrint.ItemNo') }, { label: t('TransferPrint.ItemName') },
      { label: t('TransferPrint.Unit') }, { label: t('TransferPrint.Qty') }, { label: t('TransferPrint.Batch') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td style="text-align:end">${fmt(r.Qty)}</td><td>${r.BatchNo ?? ''}</td></tr>`).join('');
    const totRow = `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td><td style="text-align:end">${fmt(this.totQty)}</td><td></td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml = hd
      ? fi(t('TransferPrint.DocNo'), hd.DocNo) + fi(t('TransferPrint.Date'), this.fmtDate(hd.TransDate)) +
        fi(t('TransferPrint.FromStore'), this.storeLabel(hd.FromStore, hd.FromStoreName, hd.FromStoreEName)) +
        fi(t('TransferPrint.ToStore'), this.storeLabel(hd.ToStore, hd.ToStoreName, hd.ToStoreEName)) +
        fi(t('TransferPrint.Serial'), this.isAr ? (hd.SerialName || '') : (hd.SerialEName || hd.SerialName || '')) +
        ((hd.Notes || hd.Des) ? fi(t('TransferPrint.Des'), hd.Notes || hd.Des) : '')
      : '';

    this.reportPrint.printReport(t('TransferPrint.Title'), cols, rowsHtml + totRow, filtersHtml);
  }
}
