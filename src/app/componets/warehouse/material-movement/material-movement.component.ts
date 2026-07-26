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
import { AuthService } from '../../../shared/services/auth.service';
import { StoreService, StoreDto } from '../../../shared/services/store.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { MaterialMovementService, MaterialMovementFilter, MaterialMovementRow } from '../../../shared/services/material-movement.service';

interface MovementDisplayRow {
  rowType: 'O' | 'M';
  labelKey: string;                 // i18n key for the type column
  docNo: string;
  date: string | null;
  des: string;
  storeName: string;
  storeEName: string;
  inQty: number; inAmount: number;
  outQty: number; outAmount: number;
  balanceQty: number; balanceAmount: number;
}
interface MovementGroup {
  itemNo: string; itemName: string; ename: string; typeName: string; typeEName: string;
  rows: MovementDisplayRow[];
  totInQty: number; totInAmount: number; totOutQty: number; totOutAmount: number;
  finalBalQty: number; finalBalAmount: number;
}

@Component({
  selector: 'app-material-movement',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent],
  templateUrl: './material-movement.component.html',
  styleUrl: './material-movement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MaterialMovementComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  itemAll = true;                       // لجميع المواد vs للمواد من رقم
  itemFrom: string | null = null;
  itemTo: string | null = null;

  storeAll = true;                      // في جميع المستودعات vs من مستودع رقم
  storeFrom: number | null = null;
  storeTo: number | null = null;

  largestUnit = false;                  // أكبر وحدة (true) / أصغر وحدة (false)
  transfersOnly = false;                // حركات سندات النقل فقط
  showCostCol = true;                   // إظهار المبالغ (gated by ViewCost)
  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  stores: StoreDto[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  groups: MovementGroup[] = [];
  loading = false;
  fetched = false;

  constructor(
    private svc: MaterialMovementService,
    private storeSvc: StoreService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  /** whether the user is ALLOWED to see amounts — gates the checkbox. */
  get canViewCost(): boolean { return this.auth.hasPermission('MaterialMovement.ViewCost'); }
  /** whether the amount columns actually show = permission AND checkbox ticked. */
  get showCostColumns(): boolean { return this.canViewCost && this.showCostCol; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }

  // ─── search fns ────────────────────────────────────────────
  itemSearchFn = (term: string, it: ItemListRow): boolean => {
    const t = (term || '').toLowerCase();
    return (it.ItemNo || '').toLowerCase().includes(t) || (it.ItemName || '').toLowerCase().includes(t) || (it.Ename || '').toLowerCase().includes(t);
  };
  storeSearchFn = (term: string, s: StoreDto): boolean => {
    const t = (term || '').toLowerCase();
    return String(s.StoreNo).includes(t) || (s.StoreName || '').toLowerCase().includes(t) || (s.StoreEname || '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.decimals = this.companySettings.decimals;   // default from company-info عدد الخانات العشرية
    this.storeSvc.getAll().subscribe({ next: r => this.stores = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.groups = []; }
  onItemModeChange(): void { if (this.itemAll) { this.itemFrom = null; this.itemTo = null; } this.onFilterChange(); }
  onStoreModeChange(): void { if (this.storeAll) { this.storeFrom = null; this.storeTo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('MaterialMovement.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('MaterialMovement.DateRangeInvalid')); return false; }
    if (!this.itemAll && (!this.itemFrom || !this.itemTo)) { this.toastr.warning(this.translate.instant('MaterialMovement.ItemRangeRequired')); return false; }
    if (!this.storeAll && (!this.storeFrom || !this.storeTo)) { this.toastr.warning(this.translate.instant('MaterialMovement.StoreRangeRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: MaterialMovementFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      ItemFrom: this.itemAll ? null : this.itemFrom,
      ItemTo: this.itemAll ? null : this.itemTo,
      StoreFrom: this.storeAll ? 0 : (this.storeFrom || 0),
      StoreTo: this.storeAll ? 0 : (this.storeTo || 0),
      TransfersOnly: this.transfersOnly,
      LargestUnit: this.largestUnit,
    };
    this.loading = true; this.fetched = false; this.groups = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.groups = this.buildGroups(data || []); this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  // ─── group by item + accumulate the running balance (compat-100 has no window SUM) ──
  private buildGroups(rows: MaterialMovementRow[]): MovementGroup[] {
    const groups: MovementGroup[] = [];
    let g: MovementGroup | null = null;
    let runQty = 0, runAmt = 0;
    for (const r of rows) {
      if (!g || g.itemNo !== r.ItemNo) {
        g = { itemNo: r.ItemNo, itemName: r.ItemName, ename: r.Ename, typeName: r.TypeName, typeEName: r.TypeEName,
              rows: [], totInQty: 0, totInAmount: 0, totOutQty: 0, totOutAmount: 0, finalBalQty: 0, finalBalAmount: 0 };
        groups.push(g);
        runQty = 0; runAmt = 0;
      }
      if (r.RowType === 'O') {
        runQty = +r.OpeningQty || 0;
        runAmt = +r.OpeningAmount || 0;
        g.rows.push({ rowType: 'O', labelKey: 'MaterialMovement.Opening', docNo: '', date: null, des: '', storeName: '', storeEName: '',
                      inQty: 0, inAmount: 0, outQty: 0, outAmount: 0, balanceQty: runQty, balanceAmount: runAmt });
      } else {
        const inQ = +r.InQty || 0, inA = +r.InAmount || 0, outQ = +r.OutQty || 0, outA = +r.OutAmount || 0;
        runQty += inQ - outQ;
        runAmt += inA - outA;
        if (runQty === 0) runAmt = 0;
        g.rows.push({ rowType: 'M', labelKey: this.kindLabel(r.Kind), docNo: r.DocNo || '', date: r.TransDate,
                      des: r.Des || '', storeName: r.StoreName || '', storeEName: r.StoreEName || '',
                      inQty: inQ, inAmount: inA, outQty: outQ, outAmount: outA, balanceQty: runQty, balanceAmount: runAmt });
        g.totInQty += inQ; g.totInAmount += inA; g.totOutQty += outQ; g.totOutAmount += outA;
      }
      g.finalBalQty = runQty; g.finalBalAmount = runAmt;
    }
    return groups;
  }

  private kindLabel(kind: number | null): string {
    switch (kind) {
      case 1: case 4: return 'MaterialMovement.TypeIn';
      case 2: return 'MaterialMovement.TypeOut';
      case 3: return 'MaterialMovement.TypeWriteoff';
      default: return 'MaterialMovement.TypeOther';
    }
  }

  fmtDate(d: string | null): string { return d ? d.substring(0, 10) : ''; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const showCost = this.showCostColumns;

    const cols = [
      { label: t('MaterialMovement.DocNo') }, { label: t('MaterialMovement.Type') },
      { label: t('MaterialMovement.Date') }, { label: t('MaterialMovement.Des') },
      { label: t('MaterialMovement.InQty') }, ...(showCost ? [{ label: t('MaterialMovement.InAmount') }] : []),
      { label: t('MaterialMovement.OutQty') }, ...(showCost ? [{ label: t('MaterialMovement.OutAmount') }] : []),
      { label: t('MaterialMovement.BalanceQty') }, ...(showCost ? [{ label: t('MaterialMovement.BalanceAmount') }] : []),
      { label: t('MaterialMovement.Store') },
    ];

    let body = '';
    for (const g of this.groups) {
      const name = this.isAr ? g.itemName : (g.ename || g.itemName);
      const cat = this.isAr ? g.typeName : (g.typeEName || g.typeName);
      const span = showCost ? 12 : 9;
      body += `<tr style="background:#e5e7eb;font-weight:700"><td colspan="${span}">` +
        `${t('MaterialMovement.ItemNo')}: ${g.itemNo} — ${name}${cat ? '  (' + cat + ')' : ''}</td></tr>`;
      for (const r of g.rows) {
        const store = this.isAr ? r.storeName : (r.storeEName || r.storeName);
        body += `<tr${r.rowType === 'O' ? ' style="font-weight:700;background:#f1f5f9"' : ''}>` +
          `<td>${r.docNo}</td><td>${t(r.labelKey)}</td><td>${this.fmtDate(r.date)}</td><td>${r.des}</td>` +
          `<td style="text-align:end">${r.rowType === 'O' ? '' : fmt(r.inQty)}</td>` +
          (showCost ? `<td style="text-align:end">${r.rowType === 'O' ? '' : fmt(r.inAmount)}</td>` : '') +
          `<td style="text-align:end">${r.rowType === 'O' ? '' : fmt(r.outQty)}</td>` +
          (showCost ? `<td style="text-align:end">${r.rowType === 'O' ? '' : fmt(r.outAmount)}</td>` : '') +
          `<td style="text-align:end">${fmt(r.balanceQty)}</td>` +
          (showCost ? `<td style="text-align:end">${fmt(r.balanceAmount)}</td>` : '') +
          `<td>${store}</td></tr>`;
      }
      body += `<tr style="font-weight:700;background:#dbeafe"><td colspan="4">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(g.totInQty)}</td>` + (showCost ? `<td style="text-align:end">${fmt(g.totInAmount)}</td>` : '') +
        `<td style="text-align:end">${fmt(g.totOutQty)}</td>` + (showCost ? `<td style="text-align:end">${fmt(g.totOutAmount)}</td>` : '') +
        `<td style="text-align:end">${fmt(g.finalBalQty)}</td>` + (showCost ? `<td style="text-align:end">${fmt(g.finalBalAmount)}</td>` : '') +
        `<td></td></tr>`;
    }

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('MaterialMovement.DateFrom'), this.dateFrom) + fi(t('MaterialMovement.DateTo'), this.dateTo) +
      (this.itemAll ? '' : fi(t('MaterialMovement.Items'), `${this.itemFrom} — ${this.itemTo}`)) +
      (this.storeAll ? '' : fi(t('MaterialMovement.Stores'), `${this.storeFrom} — ${this.storeTo}`)) +
      (this.transfersOnly ? fi(t('MaterialMovement.TransfersOnly'), '✓') : '') +
      (this.largestUnit ? fi(t('MaterialMovement.Unit'), t('MaterialMovement.LargestUnit')) : '');

    this.reportPrint.printReport(t('MaterialMovement.Title'), cols, body, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
