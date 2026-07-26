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
import { DamagePrintService, DamagePrintFilter, DamagePrintRow } from '../../../shared/services/damage-print.service';

@Component({
  selector: 'app-damage-print',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './damage-print.component.html',
  styleUrl: './damage-print.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DamagePrintComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  year: number = new Date().getFullYear();
  serialNo: number | null = null;
  docNo: string | null = null;
  decimals = 3;

  serials: VoucherSerial[] = [];        // VoucherSerial where VTypeNo=22 (damage)

  rows: DamagePrintRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: DamagePrintService,
    private serialSvc: VoucherSerialService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get header(): DamagePrintRow | null { return this.rows[0] || null; }

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.serialSvc.getAll(22).subscribe({ next: r => this.serials = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onlyDigits(e: KeyboardEvent): void { if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault(); }
  sanitizeDoc(): void { this.docNo = (this.docNo ?? '').replace(/\D/g, ''); this.onFilterChange(); }

  private validate(): boolean {
    if (!this.year) { this.toastr.warning(this.translate.instant('DamagePrint.YearRequired')); return false; }
    if (!this.serialNo) { this.toastr.warning(this.translate.instant('DamagePrint.SerialRequired')); return false; }
    if (!this.docNo) { this.toastr.warning(this.translate.instant('DamagePrint.DocRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: DamagePrintFilter = { Year: this.year, SerialNo: this.serialNo!, DocNo: this.docNo! };
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
    const hd = this.header;

    const cols = [
      { label: t('DamagePrint.ItemNo') }, { label: t('DamagePrint.ItemName') }, { label: t('DamagePrint.Qty') },
      { label: t('DamagePrint.Unit') }, { label: t('DamagePrint.Store') }, { label: t('DamagePrint.Batch') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td style="text-align:end">${fmt(r.Qty)}</td><td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      `<td>${this.isAr ? (r.StoreName ?? '') : (r.StoreEName || r.StoreName || '')}</td><td>${r.BatchNo ?? ''}</td></tr>`).join('');

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml = hd
      ? fi(t('DamagePrint.DocNo'), hd.DocNo) + fi(t('DamagePrint.Date'), this.fmtDate(hd.TransDate)) +
        fi(t('DamagePrint.CustAcc'), `${hd.AccNo || ''} ${hd.CustomerName || ''}`) +
        fi(t('DamagePrint.Serial'), this.isAr ? (hd.SerialName || '') : (hd.SerialEName || hd.SerialName || '')) +
        (hd.Des ? fi(t('DamagePrint.Des'), hd.Des) : '')
      : '';

    // VB6 signature footer: a single مدير المستودعات (Warehouse Manager) line with signing space below
    const footerHtml =
      `<div style="display:flex;margin-top:30px;min-height:80px;"><div style="flex:1;text-align:center;">${t('DamagePrint.SigManager')}</div><div style="flex:2;"></div></div>`;

    this.reportPrint.printReport(t('DamagePrint.Title'), cols, rowsHtml, filtersHtml, footerHtml);
  }
}
