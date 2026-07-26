import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import {
  DisbursementMovementService, DisbursementMovementFilter, DisbursementMovementRow, DisbursementEntity,
} from '../../../shared/services/disbursement-movement.service';

@Component({
  selector: 'app-disbursement-movement',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './disbursement-movement.component.html',
  styleUrl: './disbursement-movement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DisbursementMovementComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  kind: 1 | 2 = 1;                      // 1 = سندات الادخال (input), 2 = سندات الاخراج (output)

  entityAll = true;                     // جميع الجهات vs لجهة
  entityNo: number | null = null;

  itemAll = true;                       // لجميع المواد vs للمواد من رقم .. إلى
  itemFrom: string | null = null;
  itemTo: string | null = null;

  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  entities: DisbursementEntity[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: DisbursementMovementRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: DisbursementMovementService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private auth: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get canViewCost(): boolean { return this.auth.hasPermission('DisbursementMovement.ViewCost'); }

  get totQty(): number { return this.rows.reduce((s, r) => s + (+r.TotQty || 0), 0); }
  get grandTotal(): number { return this.rows.reduce((s, r) => s + (+r.TotalPrice || 0), 0); }

  entitySearchFn = (term: string, e: DisbursementEntity): boolean => {
    const t = (term || '').toLowerCase();
    return String(e.EntityNo).includes(t) || (e.Name || '').toLowerCase().includes(t) || (e.EName || '').toLowerCase().includes(t);
  };
  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;
    this.svc.getEntities().subscribe({ next: r => this.entities = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onEntityModeChange(): void { if (this.entityAll) { this.entityNo = null; } this.onFilterChange(); }
  onItemModeChange(): void { if (this.itemAll) { this.itemFrom = null; this.itemTo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('DisbursementMovement.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('DisbursementMovement.DateRangeInvalid')); return false; }
    if (!this.entityAll && !this.entityNo) { this.toastr.warning(this.translate.instant('DisbursementMovement.EntityRequired')); return false; }
    if (!this.itemAll && (!this.itemFrom || !this.itemTo)) { this.toastr.warning(this.translate.instant('DisbursementMovement.ItemRangeRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: DisbursementMovementFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      Kind: this.kind,
      EntityNo: this.entityAll ? 0 : (this.entityNo || 0),
      ItemFrom: this.itemAll ? '' : (this.itemFrom || ''),
      ItemTo: this.itemAll ? '' : (this.itemTo || ''),
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.page = 1; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  itemName(r: DisbursementMovementRow): string { return this.isAr ? (r.ItemName ?? '') : (r.ItemEName || r.ItemName || ''); }
  unitName(r: DisbursementMovementRow): string { return this.isAr ? (r.UnitName ?? '') : (r.UnitEName || r.UnitName || ''); }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const cost = this.canViewCost;

    const cols = [
      { label: t('DisbursementMovement.ItemNo') }, { label: t('DisbursementMovement.ItemName') },
      { label: t('DisbursementMovement.Unit') }, { label: t('DisbursementMovement.Qty') },
      ...(cost ? [{ label: t('DisbursementMovement.AvgCost') }, { label: t('DisbursementMovement.Total') }] : []),
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.ItemNo ?? ''}</td><td>${this.itemName(r)}</td>` +
      `<td>${this.unitName(r)}</td><td style="text-align:end">${fmt(r.TotQty)}</td>` +
      (cost ? `<td style="text-align:end">${fmt(r.AvgCost)}</td><td style="text-align:end">${fmt(r.TotalPrice)}</td>` : '') +
      `</tr>`).join('');
    const totRow = cost
      ? `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(this.totQty)}</td><td></td><td style="text-align:end">${fmt(this.grandTotal)}</td></tr>`
      : `<tr style="font-weight:700;background:#dbeafe"><td colspan="3">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(this.totQty)}</td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('DisbursementMovement.Period'), `${this.dateFrom} — ${this.dateTo}`) +
      fi(t('DisbursementMovement.VoucherType'), t(this.kind === 1 ? 'DisbursementMovement.Input' : 'DisbursementMovement.Output')) +
      (this.entityAll ? '' : fi(t('DisbursementMovement.Entity'), this.entityLabel())) +
      (this.itemAll ? '' : fi(t('DisbursementMovement.ItemRange'), `${this.itemFrom} — ${this.itemTo}`));

    this.reportPrint.printReport(t('DisbursementMovement.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private entityLabel(): string {
    const e = this.entities.find(x => x.EntityNo === this.entityNo);
    return e ? `${e.EntityNo} — ${this.isAr ? e.Name : (e.EName || e.Name)}` : String(this.entityNo ?? '');
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
