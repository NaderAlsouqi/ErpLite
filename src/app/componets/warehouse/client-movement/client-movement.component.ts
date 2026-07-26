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
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { DisbursementMovementService, DisbursementEntity } from '../../../shared/services/disbursement-movement.service';
import {
  ClientMovementService, ClientMovementFilter, ClientMovementRow, ClientMovementClient,
} from '../../../shared/services/client-movement.service';

interface ClientGroup {
  clientNo: number;
  clientName: string;
  clientEName: string;
  rows: ClientMovementRow[];
}

@Component({
  selector: 'app-client-movement',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ReportExportComponent],
  templateUrl: './client-movement.component.html',
  styleUrl: './client-movement.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ClientMovementComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date());
  dateTo = this.toDateStr(new Date());

  both = false;                         // كلا هما
  kind: 1 | 2 = 1;                      // 1 = سندات الادخال, 2 = سندات الاخراج

  clientAll = true;                     // جميع العملاء vs من عميل .. إلى
  clientFrom: number | null = null;
  clientTo: number | null = null;

  entityAll = true;                     // جميع الجهات vs لجهة (output only)
  entityNo: number | null = null;

  itemAll = true;                       // لجميع المواد vs للمواد من رقم .. إلى
  itemFrom: string | null = null;
  itemTo: string | null = null;

  decimals = 3;

  // ─── Lookups ───────────────────────────────────────────────
  clients: ClientMovementClient[] = [];
  entities: DisbursementEntity[] = [];
  allItems: ItemListRow[] = [];

  // ─── Results ───────────────────────────────────────────────
  rows: ClientMovementRow[] = [];
  loading = false;
  fetched = false;

  constructor(
    private svc: ClientMovementService,
    private entitySvc: DisbursementMovementService,
    private itemSvc: ItemCardService,
    public reportPrint: ReportService,
    private companySettings: CompanySettingsService,
    private auth: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get numFmt(): string { const d = this.decimals ?? 3; return `1.${d}-${d}`; }
  get canViewCost(): boolean { return this.auth.hasPermission('ClientMovement.ViewCost'); }
  /** جهة filter only applies to output (VB6: SSPanel3 enabled only for output). */
  get entityApplies(): boolean { return !this.both && this.kind === 2; }

  // ─── Grouping (by client) ──────────────────────────────────
  get groups(): ClientGroup[] {
    const map = new Map<number, ClientGroup>();
    for (const r of this.rows) {
      let g = map.get(r.ClientNo);
      if (!g) { g = { clientNo: r.ClientNo, clientName: r.ClientName, clientEName: r.ClientEName, rows: [] }; map.set(r.ClientNo, g); }
      g.rows.push(r);
    }
    return Array.from(map.values());
  }
  groupQty(g: ClientGroup): number { return g.rows.reduce((s, r) => s + (+r.TotQty || 0), 0); }
  groupTotal(g: ClientGroup): number { return g.rows.reduce((s, r) => s + (+r.TotalPrice || 0), 0); }
  get grandTotal(): number { return this.rows.reduce((s, r) => s + (+r.TotalPrice || 0), 0); }

  clientSearchFn = (term: string, c: ClientMovementClient): boolean => {
    const t = (term || '').toLowerCase();
    return String(c.ClientNo).includes(t) || (c.Name || '').toLowerCase().includes(t) || (c.EName || '').toLowerCase().includes(t);
  };
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
    this.svc.getClients().subscribe({ next: r => this.clients = r || [], error: () => {} });
    this.entitySvc.getEntities().subscribe({ next: r => this.entities = r || [], error: () => {} });
    this.itemSvc.list().subscribe({ next: r => this.allItems = r || [], error: () => {} });
  }

  onFilterChange(): void { this.fetched = false; this.rows = []; }
  onBothChange(): void { if (this.both) { this.entityAll = true; this.entityNo = null; } this.onFilterChange(); }
  onKindChange(): void { if (this.kind !== 2) { this.entityAll = true; this.entityNo = null; } this.onFilterChange(); }
  onClientModeChange(): void { if (this.clientAll) { this.clientFrom = null; this.clientTo = null; } this.onFilterChange(); }
  onEntityModeChange(): void { if (this.entityAll) { this.entityNo = null; } this.onFilterChange(); }
  onItemModeChange(): void { if (this.itemAll) { this.itemFrom = null; this.itemTo = null; } this.onFilterChange(); }

  private validate(): boolean {
    if (!this.dateFrom || !this.dateTo) { this.toastr.warning(this.translate.instant('ClientMovement.DateRequired')); return false; }
    if (this.dateFrom > this.dateTo) { this.toastr.warning(this.translate.instant('ClientMovement.DateRangeInvalid')); return false; }
    if (!this.clientAll && (!this.clientFrom || !this.clientTo)) { this.toastr.warning(this.translate.instant('ClientMovement.ClientRangeRequired')); return false; }
    if (this.entityApplies && !this.entityAll && !this.entityNo) { this.toastr.warning(this.translate.instant('ClientMovement.EntityRequired')); return false; }
    if (!this.itemAll && (!this.itemFrom || !this.itemTo)) { this.toastr.warning(this.translate.instant('ClientMovement.ItemRangeRequired')); return false; }
    return true;
  }

  generate(): void {
    if (!this.validate()) return;
    const filter: ClientMovementFilter = {
      DateFrom: this.dateFrom,
      DateTo: this.dateTo,
      Both: this.both,
      Kind: this.kind,
      ClientFrom: this.clientAll ? 0 : (this.clientFrom || 0),
      ClientTo: this.clientAll ? 0 : (this.clientTo || 0),
      EntityNo: (this.entityApplies && !this.entityAll) ? (this.entityNo || 0) : 0,
      ItemFrom: this.itemAll ? '' : (this.itemFrom || ''),
      ItemTo: this.itemAll ? '' : (this.itemTo || ''),
    };
    this.loading = true; this.fetched = false; this.rows = [];
    this.svc.getReport(filter).subscribe({
      next: data => { this.rows = data || []; this.fetched = true; this.loading = false; },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }

  itemName(r: ClientMovementRow): string { return this.isAr ? (r.ItemName ?? '') : (r.ItemEName || r.ItemName || ''); }
  unitName(r: ClientMovementRow): string { return this.isAr ? (r.UnitName ?? '') : (r.UnitEName || r.UnitName || ''); }
  storeName(r: ClientMovementRow): string { return this.isAr ? (r.StoreName ?? '') : (r.StoreEName || r.StoreName || ''); }
  kindLabel(k: number): string { return this.translate.instant(k === 1 ? 'ClientMovement.KindIn' : 'ClientMovement.KindOut'); }
  clientLabel(g: ClientGroup): string { return `${g.clientNo} — ${this.isAr ? g.clientName : (g.clientEName || g.clientName)}`; }

  // ─── print / export ────────────────────────────────────────
  onExport(): void { this.print(); }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const d = this.decimals ?? 3;
    const fmt = (n: any) => (n == null ? '' : (+n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
    const cost = this.canViewCost;

    const cols = [
      { label: t('ClientMovement.VoucherType') }, { label: t('ClientMovement.ItemNo') },
      { label: t('ClientMovement.ItemName') }, { label: t('ClientMovement.Unit') },
      { label: t('ClientMovement.Qty') }, { label: t('ClientMovement.Store') },
      ...(cost ? [{ label: t('ClientMovement.AvgCost') }, { label: t('ClientMovement.Total') }] : []),
    ];
    const span = cost ? 8 : 6;
    let body = '';
    for (const g of this.groups) {
      body += `<tr style="font-weight:700;background:#1b2b4a;color:#fff"><td colspan="${span}">${this.clientLabel(g)}</td></tr>`;
      for (const r of g.rows) {
        body += `<tr><td>${this.kindLabel(r.Kind)}</td><td>${r.ItemNo ?? ''}</td><td>${this.itemName(r)}</td>` +
          `<td>${this.unitName(r)}</td><td style="text-align:end">${fmt(r.TotQty)}</td><td>${this.storeName(r)}</td>` +
          (cost ? `<td style="text-align:end">${fmt(r.AvgCost)}</td><td style="text-align:end">${fmt(r.TotalPrice)}</td>` : '') + `</tr>`;
      }
      body += `<tr style="font-weight:700;background:#e9edf5"><td colspan="4">${t('ClientMovement.ClientTotal')}</td>` +
        `<td style="text-align:end">${fmt(this.groupQty(g))}</td><td></td>` +
        (cost ? `<td></td><td style="text-align:end">${fmt(this.groupTotal(g))}</td>` : '') + `</tr>`;
    }
    if (cost) {
      body += `<tr style="font-weight:700;background:#dbeafe"><td colspan="${span - 1}">${t('General.Total')}</td>` +
        `<td style="text-align:end">${fmt(this.grandTotal)}</td></tr>`;
    }

    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const kindTxt = this.both ? t('ClientMovement.Both') : t(this.kind === 1 ? 'ClientMovement.Input' : 'ClientMovement.Output');
    const filtersHtml =
      fi(t('ClientMovement.Period'), `${this.dateFrom} — ${this.dateTo}`) +
      fi(t('ClientMovement.VoucherType'), kindTxt) +
      (this.clientAll ? '' : fi(t('ClientMovement.ClientRange'), `${this.clientFrom} — ${this.clientTo}`)) +
      (this.entityApplies && !this.entityAll ? fi(t('ClientMovement.Entity'), this.entityLabel()) : '') +
      (this.itemAll ? '' : fi(t('ClientMovement.ItemRange'), `${this.itemFrom} — ${this.itemTo}`));

    this.reportPrint.printReport(t('ClientMovement.Title'), cols, body, filtersHtml);
  }

  private entityLabel(): string {
    const e = this.entities.find(x => x.EntityNo === this.entityNo);
    return e ? `${e.EntityNo} — ${this.isAr ? e.Name : (e.EName || e.Name)}` : String(this.entityNo ?? '');
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
