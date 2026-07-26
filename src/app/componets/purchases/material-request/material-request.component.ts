import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService } from '../../../shared/services/report.service';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import {
  MaterialRequestService, MaterialRequest, MaterialRequestLine,
  MaterialRequestItemUnit, MaterialRequestListRow,
} from '../../../shared/services/material-request.service';

/** A grid line plus the units available for its item. */
interface ReqLine extends MaterialRequestLine {
  units: MaterialRequestItemUnit[];
}

@Component({
  selector: 'app-material-request',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule,
    ConfirmationModalComponent, HasPermissionDirective, PaginatorComponent, PaginatePipe,
    ReportExportComponent,
  ],
  templateUrl: './material-request.component.html',
  styleUrl: './material-request.component.scss',
})
export class MaterialRequestComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  activeTab: 'form' | 'list' = 'form';

  orderNo = '';
  odate = this.today();
  section = '';
  notes = '';
  state = 0;

  lines: ReqLine[] = [this.newLine()];
  allItems: ItemListRow[] = [];
  isExisting = false;
  saving = false;

  // list tab
  requests: MaterialRequestListRow[] = [];
  listFilter = '';
  page = 1;
  pageSize = 10;

  readonly pCreate = 'MaterialRequest.Create';
  readonly pDelete = 'MaterialRequest.Delete';
  readonly pPrint = 'MaterialRequest.Print';

  constructor(
    private svc: MaterialRequestService,
    private itemSvc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  /** Posted requests (State=1) are read-only, mirroring the VB6 screen. */
  get readOnly(): boolean { return this.state === 1; }

  ngOnInit(): void {
    this.itemSvc.list().subscribe({ next: d => (this.allItems = d || []), error: () => {} });
    this.reset();
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private newLine(): ReqLine {
    return { ItemNo: '', ItemName: '', UnitNo: null, UnitName: '', Qty: null, Barcode: '', Operand: 0, units: [] };
  }

  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list') this.loadList();
  }

  itemSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Ename || '').toLowerCase().includes(term)
      || (item.Barcode || '').toLowerCase().includes(term);
  };

  // ─── grid ────────────────────────────────────────────────────
  addRow(): void { this.lines.push(this.newLine()); }
  removeRow(i: number): void {
    this.lines.splice(i, 1);
    if (!this.lines.length) this.lines.push(this.newLine());
  }

  /** Item chosen on a line → fetch its name + units, default to the smallest unit. */
  onItemPick(line: ReqLine): void {
    const code = (line.ItemNo || '').toString().trim();
    if (!code) { line.ItemName = ''; line.units = []; line.UnitNo = null; line.UnitName = ''; line.Barcode = ''; line.Operand = 0; return; }
    this.svc.itemDetails(code).subscribe({
      next: d => {
        line.ItemName = d?.ItemName || this.allItems.find(x => x.ItemNo === code)?.ItemName || '';
        line.units = d?.Units || [];
        const u = line.units[0];
        if (u) { line.UnitNo = u.UnitNo; this.applyUnit(line); }
        else { line.UnitNo = null; line.UnitName = ''; line.Barcode = ''; line.Operand = 0; }
      },
      error: () => { line.units = []; },
    });
  }

  /** Unit chosen on a line → fill unit name, operand, barcode. */
  onUnitPick(line: ReqLine): void { this.applyUnit(line); }

  private applyUnit(line: ReqLine): void {
    const u = line.units.find(x => x.UnitNo === line.UnitNo);
    line.UnitName = u ? (this.isAr ? (u.UnitName || '') : (u.UnitEname || u.UnitName || '')) : '';
    line.Operand = u ? u.Operand : 0;
    line.Barcode = u ? (u.Barcode || '') : '';
  }

  // ─── load / new ──────────────────────────────────────────────
  onOrderNoChange(): void {
    const code = (this.orderNo || '').toString().trim();
    this.orderNo = code;
    if (!code) { this.isExisting = false; return; }
    this.loadOrder(code);
  }

  private loadOrder(orderNo: string): void {
    this.svc.get(orderNo).subscribe({
      next: (req: MaterialRequest) => {
        this.orderNo = req.OrderNo || orderNo;
        this.odate = (req.ODate || '').toString().substring(0, 10) || this.today();
        this.section = req.Section || '';
        this.notes = req.Notes || '';
        this.state = req.State || 0;
        this.lines = (req.Lines && req.Lines.length ? req.Lines : [this.newLine()]).map(l => ({
          ...l,
          // seed the saved unit so the dropdown shows it; re-picking the item loads all units
          units: l.UnitNo != null
            ? [{ UnitNo: l.UnitNo, UnitName: l.UnitName, UnitEname: l.UnitName, Operand: l.Operand || 0, Barcode: l.Barcode }]
            : [],
        }) as ReqLine);
        this.isExisting = true;
      },
      error: (err) => {
        if (err?.status === 404) { this.isExisting = false; }  // new number
        else this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  reset(): void {
    // Keep the working date across new/saved documents (see purchase-order.reset).
    this.odate = this.odate || this.today();
    this.section = '';
    this.notes = '';
    this.state = 0;
    this.lines = [this.newLine()];
    this.isExisting = false;
    this.activeTab = 'form';
    this.svc.nextNo().subscribe({
      next: r => (this.orderNo = r?.nextNo || ''),
      error: () => (this.orderNo = ''),
    });
  }

  // ─── save / delete ───────────────────────────────────────────
  private itemLines(): ReqLine[] {
    return this.lines.filter(l => (l.ItemNo || '').toString().trim());
  }

  private validate(): boolean {
    if (!(this.orderNo || '').toString().trim()) { this.toastr.warning(this.translate.instant('MaterialRequest.OrderNoRequired')); return false; }
    if (!this.odate) { this.toastr.warning(this.translate.instant('MaterialRequest.DateRequired')); return false; }
    const items = this.itemLines();
    if (!items.length) { this.toastr.warning(this.translate.instant('MaterialRequest.NoLines')); return false; }
    if (items.some(l => !l.UnitNo)) { this.toastr.warning(this.translate.instant('MaterialRequest.UnitRequired')); return false; }
    if (items.some(l => !(+(l.Qty || 0) > 0))) { this.toastr.warning(this.translate.instant('MaterialRequest.QtyRequired')); return false; }
    return true;
  }

  save(print = false): void {
    if (this.readOnly) { this.toastr.warning(this.translate.instant('MaterialRequest.Posted')); return; }
    if (!this.validate()) return;
    this.saving = true;
    const payload: MaterialRequest = {
      OrderNo: this.orderNo.trim(),
      ODate: this.odate,
      Section: this.section,
      Notes: this.notes,
      Lines: this.itemLines().map(l => ({
        ItemNo: (l.ItemNo || '').toString().trim(),
        ItemName: l.ItemName,
        UnitNo: l.UnitNo,
        Qty: l.Qty,
        Operand: l.Operand,
      })),
    };
    this.svc.save(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.toastr.success(this.translate.instant('MaterialRequest.SavedSerial', { no: res?.orderNo || this.orderNo }));
        if (print) this.print();
        this.reset();
      },
      error: (err) => { this.saving = false; this.toastr.error(err?.error?.message || this.translate.instant('General.Error')); },
    });
  }

  delete(): void {
    if (!this.isExisting) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.svc.delete(this.orderNo).subscribe({
      next: () => { this.toastr.success(this.translate.instant('General.DeleteSuccess')); this.reset(); },
      error: (err) => this.toastr.error(err?.error?.message || this.translate.instant('General.Error')),
    });
  }

  // ─── list tab ────────────────────────────────────────────────
  loadList(): void {
    this.svc.list().subscribe({ next: d => (this.requests = d || []), error: () => {} });
  }

  get filteredRequests(): MaterialRequestListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.requests;
    return this.requests.filter(r =>
      (r.OrderNo || '').toLowerCase().includes(t) || (r.Section || '').toLowerCase().includes(t));
  }

  openRow(row: MaterialRequestListRow): void {
    this.activeTab = 'form';
    this.loadOrder(row.OrderNo);
  }

  // ─── print ───────────────────────────────────────────────────
  /** Prints what the user is looking at: the requests list on the list tab,
   *  otherwise the current request document. */
  print(): void {
    if (this.activeTab === 'list') { this.printList(); return; }
    this.printDocument();
  }

  private printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const esc = (v: any) => (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
    const rowsData = this.filteredRequests;
    if (!rowsData.length) { this.toastr.warning(t('General.NoRecordsFound')); return; }
    const cols = [
      { label: t('MaterialRequest.OrderNo') }, { label: t('MaterialRequest.Date') },
      { label: t('MaterialRequest.Section') }, { label: t('MaterialRequest.Status') },
    ];
    const rows = rowsData.map(r => `<tr>` +
      `<td>${esc(r.OrderNo)}</td>` +
      `<td>${esc((r.ODate || '').toString().slice(0, 10))}</td>` +
      `<td>${esc(r.Section)}</td>` +
      `<td>${esc(t(r.State === 1 ? 'MaterialRequest.PostedShort' : 'MaterialRequest.Draft'))}</td></tr>`).join('');
    const filtersHtml = this.listFilter
      ? `<div class="filter-item"><span class="filter-label">${esc(t('General.Search'))}:</span><span class="filter-value">${esc(this.listFilter)}</span></div>`
      : '';
    this.reportService.printReport(t('MaterialRequest.ListTab'), cols, rows, filtersHtml);
  }

  private printDocument(): void {
    const t = (k: string) => this.translate.instant(k);
    if (!this.itemLines().length) { this.toastr.warning(t('MaterialRequest.NoLines')); return; }
    const esc = (v: any) => (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
    const cols = [
      { label: t('MaterialRequest.ItemNo') }, { label: t('MaterialRequest.ItemName') },
      { label: t('MaterialRequest.UnitNo') }, { label: t('MaterialRequest.UnitName') },
      { label: t('MaterialRequest.Qty') }, { label: t('MaterialRequest.Barcode') },
    ];
    const rows = this.itemLines().map(l => `<tr>` +
      `<td>${esc(l.ItemNo)}</td><td>${esc(l.ItemName)}</td><td>${esc(l.UnitNo)}</td>` +
      `<td>${esc(l.UnitName)}</td><td>${esc(l.Qty)}</td><td>${esc(l.Barcode)}</td></tr>`).join('');
    const filtersHtml =
      `<div class="filter-item"><span class="filter-label">${esc(t('MaterialRequest.OrderNo'))}:</span><span class="filter-value">${esc(this.orderNo)}</span></div>` +
      `<div class="filter-item"><span class="filter-label">${esc(t('MaterialRequest.Date'))}:</span><span class="filter-value">${esc(this.odate)}</span></div>` +
      (this.section ? `<div class="filter-item"><span class="filter-label">${esc(t('MaterialRequest.Section'))}:</span><span class="filter-value">${esc(this.section)}</span></div>` : '') +
      (this.notes ? `<div class="filter-item"><span class="filter-label">${esc(t('MaterialRequest.Notes'))}:</span><span class="filter-value">${esc(this.notes)}</span></div>` : '');
    this.reportService.printReport(`${t('MaterialRequest.Title')} — ${this.orderNo}`, cols, rows, filtersHtml);
  }
}
