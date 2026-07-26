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
import { StoreService, StoreDto } from '../../../shared/services/store.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { StoreMovementsService, StoreMovementsFilter, StoreMovementRow } from '../../../shared/services/store-movements.service';

@Component({
  selector: 'app-store-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent, PaginatorComponent, PaginatePipe],
  templateUrl: './store-movements.component.html',
  styleUrl: './store-movements.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class StoreMovementsComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  storeAll = true;                      // في جميع المستودعات vs في مستودع رقم
  store1: number | null = null;
  store2: number | null = null;         // optional 2nd store

  itemNo: string | null = null;         // optional item filter
  voucherType: 0 | 1 | 2 | 3 = 0;      // all / inbound / outbound / transfer

  showCostCol = true;                   // إظهار الكلفة (gated by ViewCost)
  showTax = false;                      // اظهار نسبة الضريبة
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: StoreMovementRow[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  constructor(
    private svc: StoreMovementsService,
    private storeSvc: StoreService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get canViewCost(): boolean { return this.auth.hasPermission('StoreMovements.ViewCost'); }
  get showCostColumns(): boolean { return this.canViewCost && this.showCostCol; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  // ─── Totals ────────────────────────────────────────────────
  get totIn(): number { return this.rows.reduce((s, r) => s + (+r.InQty || 0), 0); }
  get totOut(): number { return this.rows.reduce((s, r) => s + (+r.OutQty || 0), 0); }
  get totNet(): number { return this.rows.reduce((s, r) => s + ((r.Kind === 1 || r.Kind === 4) ? (+r.Total || 0) : -(+r.Total || 0)), 0); }

  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };
  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };

  /** display movement type: VoucherSerial name (VB6 GetSerailName by doctype+v_type), else the Kind label. */
  typeLabel(r: StoreMovementRow): string {
    const name = this.isAr ? r.TypeName : (r.TypeEName || r.TypeName);
    return name || this.translate.instant(this.docTypeKey(r));
  }

  /** fallback movement-type label (doc_no prefix, else by Kind) when there is no serial name. */
  docTypeKey(r: StoreMovementRow): string {
    const dn = (r.DocNo || '').toLowerCase();
    if (dn.includes('+s')) return 'StoreMovements.TSale';
    if (dn.includes('+r')) return 'StoreMovements.TRSale';
    if (dn.includes('+p')) return 'StoreMovements.TPurchase';
    if (dn.includes('+tr')) return 'StoreMovements.TTransfer';
    if (dn.includes('+t')) return 'StoreMovements.TRPurchase';
    switch (r.Kind) {
      case 1: return 'StoreMovements.TIn';
      case 2:
        return r.SampleFl === 1 ? 'StoreMovements.TOutSamples'
             : r.SampleFl === 2 ? 'StoreMovements.TOutMaint'
             : r.SampleFl === 3 ? 'StoreMovements.TOutGas'
             : 'StoreMovements.TOut';
      case 3: return 'StoreMovements.TWriteoff';
      case 4: return 'StoreMovements.TStockTaking';
      default: return 'StoreMovements.TOther';
    }
  }

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onStoreModeChange(): void { if (this.storeAll) { this.store1 = null; this.store2 = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('StoreMovements.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('StoreMovements.DateRangeInvalid')); return false; }
    if (!this.storeAll && !this.store1) { this.toastr.warning(this.translate.instant('StoreMovements.StoreRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: StoreMovementsFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      Store1: this.storeAll ? 0 : (this.store1 || 0),
      Store2: this.storeAll ? 0 : (this.store2 || 0),
      ItemNo: this.itemNo,
      VoucherType: this.voucherType,
    };
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
    const showCost = this.showCostColumns, showTax = this.showTax;

    const cols = [
      { label: t('StoreMovements.DocNo') }, { label: t('StoreMovements.Type') }, { label: t('StoreMovements.Date') },
      { label: t('StoreMovements.ItemNo') }, { label: t('StoreMovements.ItemName') }, { label: t('StoreMovements.Unit') },
      ...(showTax ? [{ label: t('StoreMovements.Tax') }] : []),
      { label: t('StoreMovements.InQty') }, { label: t('StoreMovements.OutQty') },
      ...(showCost ? [{ label: t('StoreMovements.Cost') }, { label: t('StoreMovements.Total') }] : []),
      { label: t('StoreMovements.Store') },
    ];
    const rowsHtml = this.rows.map(r =>
      `<tr><td>${r.DocNo ?? ''}</td><td>${this.typeLabel(r)}</td><td>${this.fmtDate(r.TransDate)}</td>` +
      `<td>${r.ItemNo ?? ''}</td><td>${this.isAr ? (r.ItemName ?? '') : (r.Ename || r.ItemName || '')}</td>` +
      `<td>${this.isAr ? (r.Unit ?? '') : (r.UnitE || r.Unit || '')}</td>` +
      (showTax ? `<td style="text-align:end">${fmt(r.Tax)}%</td>` : '') +
      `<td style="text-align:end">${r.InQty ? fmt(r.InQty) : ''}</td><td style="text-align:end">${r.OutQty ? fmt(r.OutQty) : ''}</td>` +
      (showCost ? `<td style="text-align:end">${fmt(r.Cost)}</td><td style="text-align:end">${fmt(r.Total)}</td>` : '') +
      `<td>${r.StoreNo ?? ''}${r.StoreName ? ' — ' + (this.isAr ? r.StoreName : (r.StoreEName || r.StoreName)) : ''}</td></tr>`).join('');
    const totRow =
      `<tr style="font-weight:700;background:#dbeafe"><td colspan="${6 + (showTax ? 1 : 0)}">${t('General.Total')}</td>` +
      `<td style="text-align:end">${fmt(this.totIn)}</td><td style="text-align:end">${fmt(this.totOut)}</td>` +
      (showCost ? `<td></td><td style="text-align:end">${fmt(this.totNet)}</td>` : '') + `<td></td></tr>`;

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const vtKeys = ['StoreMovements.VtAll', 'StoreMovements.VtInbound', 'StoreMovements.VtOutbound', 'StoreMovements.VtTransfer'];
    const filtersHtml =
      fi(t('StoreMovements.DateFrom'), this.dateFrom) + fi(t('StoreMovements.DateTo'), this.dateTo) +
      (this.storeAll ? '' : fi(t('StoreMovements.Store'), `${this.store1}${this.store2 ? ', ' + this.store2 : ''}`)) +
      (this.itemNo ? fi(t('StoreMovements.Item'), this.itemNo) : '') +
      fi(t('StoreMovements.VoucherType'), t(vtKeys[this.voucherType]));

    this.reportPrint.printReport(t('StoreMovements.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
