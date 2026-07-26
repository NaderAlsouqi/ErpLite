import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { ReportService, ReportFormat } from '../../../shared/services/report.service';
import {
  ItemCard, ItemCardLookups, ItemCardService, ItemSearchResult, ItemListRow,
  ItemUnitRow, ItemCategRow, ItemAltRow
} from '../../../shared/services/item-card.service';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ConfirmationModalComponent, HasPermissionDirective, ReportExportComponent],
  templateUrl: './item-card.component.html',
  styleUrls: ['./item-card.component.scss'],
})
export class ItemCardComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  activeTab: 'info' | 'units' | 'list' = 'info';
  current: ItemCard = this.init();
  isExisting = false;
  saving = false;
  lookups: ItemCardLookups = { Categories: [], Origins: [], Brands: [], Taxes: [], Units: [], PriceCategories: [] };

  // all-items list tab
  allItems: ItemListRow[] = [];
  listFilter = '';
  listLoading = false;
  listLoaded = false;

  // server-side item search (رمز المادة)
  itemInput$ = new Subject<string>();
  itemLoading = false;
  itemList: ItemSearchResult[] = [];          // current dropdown options (search results + selected item)
  selectedSearch: ItemSearchResult[] = [];    // the currently selected item (kept in itemList so its label shows)

  importing = false;

  /** Permission module prefix — 'ItemCard' under Warehouse, 'PurchItemCard' under
   *  Purchases (set via route data.permPrefix). Lets one component serve both
   *  modules with independent permission sets. */
  permPrefix = 'ItemCard';
  get pCreate(): string { return `${this.permPrefix}.Create`; }
  get pDelete(): string { return `${this.permPrefix}.Delete`; }
  get pImport(): string { return `${this.permPrefix}.Import`; }
  get pPrint(): string { return `${this.permPrefix}.Print`; }
  /** Breadcrumb parent — reflects which module the card is opened from. */
  get parentTitleKey(): string {
    return this.permPrefix === 'PurchItemCard' ? 'Nav.Purchases.InputScreens' : 'Nav.Warehouse.InputScreens';
  }

  constructor(
    private svc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private reportPrint: ReportService,
  ) {}

  /** Open the barcode label-printing screen for the current (saved) item. */
  goToBarcode(): void {
    if (!this.current.ItemNo || !this.isExisting) {
      this.toastr.warning(this.translate.instant('ItemCard.SaveFirst'));
      return;
    }
    this.router.navigate(['/warehouse/vouchers/barcode-print'], {
      queryParams: { from: this.current.ItemNo, to: this.current.ItemNo }
    });
  }

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  ngOnInit(): void {
    this.permPrefix = this.route.snapshot.data['permPrefix'] || 'ItemCard';
    this.svc.getLookups().subscribe({
      next: (l) => { this.lookups = l; if (!this.isExisting) this.fillAllCategs(); },
      error: () => {}
    });
    this.loadList();   // populate the items list (used by the list tab + alternatives dropdown)
    this.itemInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        this.itemLoading = true;
        return this.svc.search(term || '').pipe(catchError(() => of([] as ItemSearchResult[])));
      }),
    ).subscribe(res => {
      this.itemLoading = false;
      const sel = this.selectedSearch.filter(s => !res.some(r => r.ItemNo === s.ItemNo));
      this.itemList = [...sel, ...res];
    });
  }

  /** Mark an item as the selected one and ensure it stays in the options list. */
  private setSelected(item: ItemSearchResult): void {
    this.selectedSearch = [item];
    this.itemList = [item, ...this.itemList.filter(x => x.ItemNo !== item.ItemNo)];
  }

  private init(): ItemCard {
    return {
      ItemNo: '', ItemName: '', Ename: '', TypeNo: null, TypeName: '', Barcode: '', Place: '',
      OrderLimit: null, OrderQty: null, Price: null, Cost: null, OriginNo: null, BrandNo: null,
      Pack40: null, Pack20: null, ItemWeight: null, ContLength: null, ContWidth: null, TaxNo: null, TaxPerc: null,
      TaxCheck: false, Stopped: false, Expired: false,
      Units: [this.newUnit()], Categs: [this.newCateg()], Alts: [this.newAlt()],
    };
  }

  newUnit(): ItemUnitRow { return { UnitNo: 0, UnitName: '', Operand: 0, Price: null, Barcode: '', IsMin: false, IsMax: false }; }
  newCateg(): ItemCategRow { return { CategNo: 0, CatName: '', Price: null, MinPrice: null, Dis: null, Bonus: null }; }
  newAlt(): ItemAltRow { return { InstedItem: '', InstedName: '' }; }

  /** VB6 FillCatGride — a new item starts with every price category pre-listed. */
  private fillAllCategs(): void {
    if (!this.lookups.PriceCategories?.length) { this.current.Categs = [this.newCateg()]; return; }
    this.current.Categs = this.lookups.PriceCategories.map(c => ({
      CategNo: c.CategNo, CatName: this.isAr ? c.CatName : (c.CateEname || c.CatName),
      Price: null, MinPrice: null, Dis: null, Bonus: null,
    }));
  }

  switchTab(t: 'info' | 'units' | 'list'): void {
    this.activeTab = t;
    if (t === 'list' && !this.listLoaded) this.loadList();
  }

  // ─── all-items list tab ───────────────────────────────────────
  loadList(): void {
    this.listLoading = true;
    this.svc.list().subscribe({
      next: (rows) => { this.allItems = rows || []; this.listLoaded = true; this.listLoading = false; },
      error: () => { this.listLoading = false; }
    });
  }

  get filteredItems(): ItemListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.allItems;
    return this.allItems.filter(r =>
      (r.ItemNo || '').toLowerCase().includes(t) ||
      (r.ItemName || '').toLowerCase().includes(t) ||
      (r.Ename || '').toLowerCase().includes(t) ||
      (r.CategoryName || '').toLowerCase().includes(t) ||
      (r.Barcode || '').toLowerCase().includes(t));
  }

  openItem(row: ItemListRow): void {
    this.activeTab = 'info';
    this.loadItem(row.ItemNo);
  }

  // ─── item code (free text) ────────────────────────────────────
  /** User typed/changed the code: load it if it exists, else treat as a new item. */
  onItemCodeChange(): void {
    const code = (this.current.ItemNo || '').toString().trim();
    this.current.ItemNo = code;
    if (!code) { this.isExisting = false; return; }
    this.loadItem(code);
  }

  onItemPicked(picked: ItemSearchResult | null): void {
    if (!picked || !picked.ItemNo) { return; }
    this.loadItem(picked.ItemNo);
  }

  /** Allow typing a brand-new code to create a new item. */
  addItemTag = (term: string): ItemSearchResult => ({ ItemNo: (term || '').trim(), ItemName: '', Ename: '' });

  private loadItem(itemNo: string): void {
    this.svc.get(itemNo).subscribe({
      next: (card) => {
        this.current = {
          ...card,
          Units: card.Units?.length ? card.Units : [this.newUnit()],
          Categs: card.Categs?.length ? card.Categs : [this.newCateg()],
          Alts: card.Alts?.length ? card.Alts : [this.newAlt()],
        };
        if (!card.Categs?.length) this.fillAllCategs();
        this.isExisting = true;
        this.setSelected({ ItemNo: card.ItemNo || '', ItemName: card.ItemName || '', Ename: card.Ename || '' });
      },
      error: () => {
        // not found -> a new item with this code; keep what the user already entered (الصنف, names, ...)
        this.current.ItemNo = itemNo;
        this.isExisting = false;
        this.setSelected({ ItemNo: itemNo, ItemName: this.current.ItemName || '', Ename: this.current.Ename || '' });
      }
    });
  }

  // ─── master lookups ───────────────────────────────────────────
  onCategoryChange(): void {
    const cat = this.lookups.Categories.find(c => c.TypeNo === this.current.TypeNo);
    this.current.TypeName = cat ? (this.isAr ? cat.TypeName : cat.Etname) : '';
    // for a new item, (re)generate the code from the chosen category
    if (!this.isExisting && this.current.TypeNo) {
      this.svc.nextNo(this.current.TypeNo).subscribe({
        next: (r) => {
          this.current.ItemNo = r.nextNo;
          this.setSelected({ ItemNo: r.nextNo, ItemName: '', Ename: '' });
        }, error: () => {}
      });
    }
  }

  onTaxChange(): void {
    const t = this.lookups.Taxes.find(x => x.TaxNo === this.current.TaxNo);
    this.current.TaxPerc = t ? t.TaxPerc : 0;
  }

  onTaxCheck(): void {
    if (!this.current.TaxCheck) { this.current.TaxNo = null; this.current.TaxPerc = null; }
  }

  // ─── units grid ───────────────────────────────────────────────
  onUnitChange(row: ItemUnitRow): void {
    const u = this.lookups.Units.find(x => x.UnitNo === row.UnitNo);
    row.UnitName = u ? (this.isAr ? u.UnitName : u.UnitEname) : '';
    if (!row.Barcode) row.Barcode = `${row.UnitNo}${this.current.Barcode || this.current.ItemNo || ''}`;
  }

  onMinChange(row: ItemUnitRow): void {
    if (row.IsMin) {
      this.current.Units.forEach(u => { if (u !== row) u.IsMin = false; });
      row.Operand = 1;   // smallest unit factor is always 1
    }
  }

  addUnit(): void { this.current.Units.push(this.newUnit()); }
  removeUnit(i: number): void {
    this.current.Units.splice(i, 1);
    if (!this.current.Units.length) this.current.Units.push(this.newUnit());
  }

  // ─── price categories grid ────────────────────────────────────
  onCategRowChange(row: ItemCategRow): void {
    const c = this.lookups.PriceCategories.find(x => x.CategNo === row.CategNo);
    row.CatName = c ? (this.isAr ? c.CatName : c.CateEname) : '';
  }
  addCateg(): void { this.current.Categs.push(this.newCateg()); }
  removeCateg(i: number): void {
    this.current.Categs.splice(i, 1);
    if (!this.current.Categs.length) this.current.Categs.push(this.newCateg());
  }

  // ─── alternatives grid ────────────────────────────────────────
  altSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Ename || '').toLowerCase().includes(term);
  };

  /** An alternative item was picked from the dropdown. */
  onAltSelect(row: ItemAltRow): void {
    const code = (row.InstedItem || '').toString().trim();
    if (!code) { row.InstedName = ''; return; }
    if (code === this.current.ItemNo) {
      this.toastr.warning(this.translate.instant('ItemCard.AltSameAsItem'));
      row.InstedItem = ''; row.InstedName = '';
      return;
    }
    if (this.current.Alts.some(a => a !== row && (a.InstedItem || '').toString().trim() === code)) {
      this.toastr.warning(this.translate.instant('ItemCard.AltDuplicate'));
      row.InstedItem = ''; row.InstedName = '';
      return;
    }
    const item = this.allItems.find(x => x.ItemNo === code);
    row.InstedName = item ? (item.ItemName || '') : '';
  }
  addAlt(): void { this.current.Alts.push(this.newAlt()); }
  removeAlt(i: number): void {
    this.current.Alts.splice(i, 1);
    if (!this.current.Alts.length) this.current.Alts.push(this.newAlt());
  }

  // ─── save / delete / reset ────────────────────────────────────
  private validate(): boolean {
    if (!this.current.ItemNo?.trim()) { this.toastr.warning(this.translate.instant('ItemCard.ItemNoRequired')); return false; }
    if (!this.current.ItemName?.trim()) { this.toastr.warning(this.translate.instant('ItemCard.ItemNameRequired')); return false; }
    if (!this.current.TypeNo) { this.toastr.warning(this.translate.instant('ItemCard.CategoryRequired')); this.activeTab = 'info'; return false; }
    if (this.current.TaxCheck && !this.current.TaxNo) { this.toastr.warning(this.translate.instant('ItemCard.TaxRequired')); return false; }
    const units = this.current.Units.filter(u => u.UnitNo);
    if (!units.length) { this.toastr.warning(this.translate.instant('ItemCard.UnitRequired')); this.activeTab = 'units'; return false; }
    const mins = units.filter(u => u.IsMin);
    if (mins.length !== 1) { this.toastr.warning(this.translate.instant('ItemCard.OneMinUnit')); this.activeTab = 'units'; return false; }
    if (mins[0].Operand !== 1) { this.toastr.warning(this.translate.instant('ItemCard.MinOperandOne')); this.activeTab = 'units'; return false; }
    if (units.some(u => !u.Operand)) { this.toastr.warning(this.translate.instant('ItemCard.OperandRequired')); this.activeTab = 'units'; return false; }
    return true;
  }

  save(): void {
    if (!this.validate()) return;
    this.saving = true;
    const payload: ItemCard = {
      ...this.current,
      Units: this.current.Units.filter(u => u.UnitNo),
      Categs: this.current.Categs.filter(c => c.CategNo),
      Alts: this.current.Alts.filter(a => (a.InstedItem || '').trim()),
    };
    this.svc.save(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.saving = false;
        this.reset();
      },
      error: (err) => { this.saving = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
    });
  }

  delete(): void {
    if (!this.current.ItemNo || !this.isExisting) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.svc.delete(this.current.ItemNo!).subscribe({
      next: (res: any) => { this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess')); this.reset(); },
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('General.Error'))
    });
  }

  reset(): void {
    this.current = this.init();
    this.isExisting = false;
    this.selectedSearch = [];
    this.itemList = [];
    this.fillAllCategs();
    this.loadList();           // refresh items (list tab + alternatives dropdown) after save/delete/new
    this.activeTab = 'info';
  }

  // ─── Excel import (bulk create/update) ────────────────────────
  /** Excel header → item field. Each column is matched case/space-insensitively. */
  private importAliases: { [f: string]: string[] } = {
    ItemNo:     ['رمز المادة', 'الرمز', 'رمز', 'رقم المادة', 'itemno', 'code', 'itemcode'],
    ItemName:   ['اسم المادة', 'الاسم', 'الاسم العربي', 'itemname', 'name', 'arabicname'],
    Ename:      ['الاسم الانجليزي', 'الاسم الإنجليزي', 'englishname', 'ename'],
    TypeNo:     ['الصنف', 'رقم الصنف', 'الفئة', 'رقم الفئة', 'typeno', 'category', 'categoryno'],
    UnitNo:     ['الوحدة', 'وحدة', 'رقم الوحدة', 'unit', 'unitno'],
    Price:      ['السعر', 'سعر', 'price'],
    Barcode:    ['الباركود', 'باركود', 'barcode'],
    OrderLimit: ['حد الطلب', 'orderlimit'],
    OrderQty:   ['كمية الطلب', 'orderqty'],
    OriginNo:   ['بلد المنشأ', 'المنشأ', 'origin', 'originno'],
    BrandNo:    ['الماركة', 'العلامة التجارية', 'brand', 'brandno'],
  };

  private norm(h: any): string {
    return (h ?? '').toString().trim().toLowerCase().replace(/\s+/g, '');
  }

  triggerImport(input: HTMLInputElement): void { input.value = ''; input.click(); }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.importing = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows || rows.length < 2) { this.importing = false; this.toastr.warning(this.translate.instant('ItemCard.ImportEmpty')); input.value = ''; return; }

        const headers = rows[0].map(h => this.norm(h));
        const colField: (string | null)[] = headers.map(h => {
          for (const f of Object.keys(this.importAliases)) {
            if (this.importAliases[f].some(a => this.norm(a) === h)) return f;
          }
          return null;
        });
        if (!colField.includes('ItemNo')) { this.importing = false; this.toastr.error(this.translate.instant('ItemCard.ImportNoCodeCol')); input.value = ''; return; }

        const num = (v: any) => { const n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
        const items: ItemCard[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r] || [];
          if (row.every(cc => String(cc ?? '').trim() === '')) continue;
          const raw: any = {};
          colField.forEach((f, ci) => {
            if (!f) return;
            const val = row[ci];
            if (val === '' || val == null) return;
            if (['TypeNo', 'UnitNo', 'OriginNo', 'BrandNo'].includes(f)) raw[f] = Math.trunc(num(val));
            else if (['Price', 'OrderLimit', 'OrderQty'].includes(f)) raw[f] = num(val);
            else raw[f] = String(val).trim();
          });
          const code = (raw.ItemNo || '').toString().trim();
          if (!code) continue;
          const unitNo: number = raw.UnitNo || 0;
          items.push({
            ItemNo: code,
            ItemName: raw.ItemName || '',
            Ename: raw.Ename || '',
            TypeNo: raw.TypeNo || null,
            Barcode: raw.Barcode || '',
            Price: raw.Price ?? null,
            OrderLimit: raw.OrderLimit ?? null,
            OrderQty: raw.OrderQty ?? null,
            OriginNo: raw.OriginNo || null,
            BrandNo: raw.BrandNo || null,
            TaxCheck: false, Stopped: false, Expired: false,
            Units: unitNo
              ? [{ UnitNo: unitNo, UnitName: '', Operand: 1, Price: raw.Price ?? null, Barcode: raw.Barcode || '', IsMin: true, IsMax: false }]
              : [],
            Categs: [],
            Alts: [],
          });
        }
        if (!items.length) { this.importing = false; this.toastr.warning(this.translate.instant('ItemCard.ImportEmpty')); input.value = ''; return; }

        this.svc.import(items).subscribe({
          next: (res) => {
            this.importing = false;
            const msg = this.translate.instant('ItemCard.ImportSummary', { added: res.Added, updated: res.Updated, failed: res.Failed });
            if (res.Failed > 0) { this.toastr.warning(msg); if (res.Errors?.length) console.warn('Item import errors:', res.Errors); }
            else this.toastr.success(msg);
            this.loadList();
          },
          error: (err) => { this.importing = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
        });
      } catch {
        this.importing = false;
        this.toastr.error(this.translate.instant('ItemCard.ImportError'));
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /** Download a ready-to-fill .xlsx template, with reference sheets of the
   *  category and unit IDs the import expects. */
  downloadTemplate(): void {
    const t = (k: string) => this.translate.instant(k);
    const headers = [
      t('ItemCard.ItemNo'), t('ItemCard.NameAr'), t('ItemCard.NameEn'),
      t('ItemCard.Category'), t('ItemCard.UnitName'), t('ItemCard.SalePrice'),
      t('ItemCard.Barcode'), t('ItemCard.OrderLimit'), t('ItemCard.OrderQty'),
      t('ItemCard.Origin'), t('ItemCard.Brand'),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers]), 'Items');
    const catRows = [[t('ItemCard.Category'), t('ItemCard.NameAr')],
      ...this.lookups.Categories.map(c => [c.TypeNo, this.isAr ? c.TypeName : (c.Etname || c.TypeName)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'Categories');
    const unitRows = [[t('ItemCard.UnitName'), t('ItemCard.NameAr')],
      ...this.lookups.Units.map(u => [u.UnitNo, this.isAr ? u.UnitName : (u.UnitEname || u.UnitName)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(unitRows), 'Units');
    XLSX.writeFile(wb, 'item-card-template.xlsx');
  }

  // ─── Print / export ───────────────────────────────────────────
  private esc(v: any): string {
    return (v == null ? '' : String(v)).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[s]);
  }

  /** Enabled when there's something to print: the items list on the list tab,
   *  otherwise the currently-loaded item card. */
  get canExport(): boolean {
    return this.activeTab === 'list'
      ? this.filteredItems.length > 0
      : !!(this.current.ItemNo && this.current.ItemName);
  }

  /** The Purchases item card exposes print only on the قائمة المواد (list) tab;
   *  the Warehouse card keeps it available on every tab. */
  get exportVisible(): boolean {
    return this.permPrefix !== 'PurchItemCard' || this.activeTab === 'list';
  }

  /** Print / Word / Excel from the shared export control — list on the list tab, else the card. */
  export(format: ReportFormat): void {
    if (this.activeTab === 'list') { this.exportList(format); return; }
    if (!this.canExport) {
      this.toastr.warning(this.translate.instant('ItemCard.PrintNothing'));
      return;
    }
    const t = (k: string) => this.translate.instant(k);
    const esc = (v: any) => this.esc(v);
    const c = this.current;

    const fields: [string, any][] = [
      [t('ItemCard.ItemNo'), c.ItemNo],
      [t('ItemCard.NameAr'), c.ItemName],
      [t('ItemCard.NameEn'), c.Ename],
      [t('ItemCard.Category'), c.TypeName || c.TypeNo],
      [t('ItemCard.Barcode'), c.Barcode],
      [t('ItemCard.Origin'), c.OriginName],
      [t('ItemCard.Brand'), c.BrandName],
      [t('ItemCard.SalePrice'), c.Price],
      [t('ItemCard.Cost'), c.Cost],
      [t('ItemCard.OrderLimit'), c.OrderLimit],
      [t('ItemCard.OrderQty'), c.OrderQty],
      [t('ItemCard.Tax'), c.TaxCheck ? (c.TaxPerc ?? 0) + '%' : t('General.No')],
    ];
    const filtersHtml = fields
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([l, v]) => `<div class="filter-item"><span class="filter-label">${esc(l)}:</span><span class="filter-value">${esc(v)}</span></div>`)
      .join('');

    const cols = [
      { label: t('ItemCard.UnitName') }, { label: t('ItemCard.Operand') }, { label: t('ItemCard.UnitPrice') },
      { label: t('ItemCard.Barcode') }, { label: t('ItemCard.MinUnit') }, { label: t('ItemCard.MaxUnit') },
    ];
    const units = (c.Units || []).filter(u => u.UnitNo);
    const rows = units.map(u => `<tr><td>${esc(u.UnitName || u.UnitNo)}</td><td>${esc(u.Operand)}</td>` +
      `<td>${esc(u.Price ?? '')}</td><td>${esc(u.Barcode || '')}</td>` +
      `<td>${u.IsMin ? '✔' : ''}</td><td>${u.IsMax ? '✔' : ''}</td></tr>`).join('')
      || `<tr><td colspan="6" style="text-align:center">—</td></tr>`;

    const categs = (c.Categs || []).filter(x => x.CategNo);
    let footerHtml = '';
    if (categs.length) {
      const head = ['ItemCard.CategName', 'ItemCard.CategPrice', 'ItemCard.MinPrice', 'ItemCard.Discount', 'ItemCard.Bonus']
        .map(k => `<th style="border:1px solid #cbd5e1;padding:4px 8px">${esc(t(k))}</th>`).join('');
      const body = categs.map(x => `<tr>` +
        `<td style="border:1px solid #e2e8f0;padding:4px 8px">${esc(x.CatName || x.CategNo)}</td>` +
        `<td style="border:1px solid #e2e8f0;padding:4px 8px">${esc(x.Price ?? '')}</td>` +
        `<td style="border:1px solid #e2e8f0;padding:4px 8px">${esc(x.MinPrice ?? '')}</td>` +
        `<td style="border:1px solid #e2e8f0;padding:4px 8px">${esc(x.Dis ?? '')}</td>` +
        `<td style="border:1px solid #e2e8f0;padding:4px 8px">${esc(x.Bonus ?? '')}</td></tr>`).join('');
      footerHtml = `<div style="font-weight:600;margin-bottom:6px">${esc(t('ItemCard.PriceCategories'))}</div>` +
        `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }

    const title = `${t('ItemCard.Title')} — ${c.ItemName} (${c.ItemNo})`;
    this.reportPrint.output(format, title, cols, rows, filtersHtml, footerHtml);
  }

  /** Print / export the all-items list (the قائمة المواد tab). */
  private exportList(format: ReportFormat): void {
    const t = (k: string) => this.translate.instant(k);
    const items = this.filteredItems;
    if (!items.length) { this.toastr.warning(this.translate.instant('ItemCard.PrintNothing')); return; }

    const cols = [
      { label: t('ItemCard.ItemNo') }, { label: t('ItemCard.NameAr') },
      { label: t('ItemCard.Category') }, { label: t('ItemCard.SalePrice') },
      { label: t('ItemCard.Barcode') },
    ];
    const rows = items.map(r => `<tr>` +
      `<td>${this.esc(r.ItemNo)}</td>` +
      `<td>${this.esc(r.ItemName || '')}</td>` +
      `<td>${this.esc(r.CategoryName || '')}</td>` +
      `<td>${this.esc(r.Price ?? '')}</td>` +
      `<td>${this.esc(r.Barcode || '')}</td></tr>`).join('');
    const filtersHtml = this.listFilter
      ? `<div class="filter-item"><span class="filter-label">${this.esc(t('ItemCard.SearchItem'))}:</span><span class="filter-value">${this.esc(this.listFilter)}</span></div>`
      : '';
    const footerHtml = `<div style="text-align:end">${this.esc(t('ItemCard.ListTab'))}: <b>${items.length}</b></div>`;
    this.reportPrint.output(format, t('ItemCard.ListTab'), cols, rows, filtersHtml, footerHtml);
  }
}
