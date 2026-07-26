import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { OutboundVoucher, OutboundLine, OutboundLookups, OutboundListRow, OutboundGLRow, OutbCategoryItem, OutboundVoucherService } from '../../../shared/services/outbound-voucher.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { SerialsService, SerialLine } from '../../../shared/services/serials.service';
import { SerialEntryModalComponent } from '../../../shared/components/serial-entry-modal/serial-entry-modal.component';
import { AuthService } from '../../../shared/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-outbound-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ConfirmationModalComponent, HasPermissionDirective, ReportExportComponent, SerialEntryModalComponent],
  templateUrl: './outbound-voucher.component.html',
  styleUrls: ['./outbound-voucher.component.scss'],
})
export class OutboundVoucherComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;
  @ViewChild('serialModal') serialModal!: SerialEntryModalComponent;

  // serial-number system (kind=2 outbound, docType '21')
  private readonly KIND = 2;
  private readonly DOCTYPE = '21';

  activeTab: 'form' | 'list' = 'form';
  readonly currentYear = new Date().getFullYear();

  current: OutboundVoucher = this.init();
  lookups: OutboundLookups = { SerialTypes: [], Entities: [], Stores: [], Categories: [] };
  allItems: ItemListRow[] = [];
  accounts: ChartOfAccountDto[] = [];      // full list (for name lookups)
  postableAccounts: ChartOfAccountDto[] = []; // leaf accounts only (not branched) — for the dropdowns
  costCenters: CostCenterDto[] = [];       // م.الكلفة dropdown
  isExisting = false;
  saving = false;

  // vouchers list tab
  vouchers: OutboundListRow[] = [];
  listFilter = '';
  listLoading = false;
  listLoaded = false;

  // GL entries (قيود السند)
  glEntries: OutboundGLRow[] = [];
  glLoading = false;
  showGL = false;

  // احضار (bring items by category)
  showBring = false;
  bringCategory: number | null = null;
  bringStore: number | null = null;

  constructor(
    private svc: OutboundVoucherService,
    private itemSvc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
    private route: ActivatedRoute,
    private accSvc: ChartOfAccountsService,
    private ccSvc: CostCenterService,
    private serialSvc: SerialsService,
    private auth: AuthService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** Permission module prefix — 'Outbound' under Warehouse, 'PurchOutbound' under
   *  Purchases (set via route data.permPrefix). Lets one component serve both
   *  modules with independent permission sets. */
  permPrefix = 'Outbound';
  get pCreate(): string { return `${this.permPrefix}.Create`; }
  get pDelete(): string { return `${this.permPrefix}.Delete`; }
  get pPrint(): string { return `${this.permPrefix}.Print`; }
  /** Breadcrumb parent — reflects which module the voucher is opened from. */
  get parentTitleKey(): string {
    return this.permPrefix === 'PurchOutbound' ? 'Nav.Purchases.InputScreens' : 'Nav.Warehouse.Vouchers';
  }
  /** الكلفة column visibility — hides Cost + line Total + grand total when the user lacks it. */
  get canViewCost(): boolean { return this.auth.hasPermission(`${this.permPrefix}.ViewCost`); }

  ngOnInit(): void {
    this.permPrefix = this.route.snapshot.data['permPrefix'] || 'Outbound';
    // Workflow deep-link, applied once lookups load (async): ?vType= pre-selects
    // the serial (add), ?docNum= (+vType,year) opens that voucher (edit/delete).
    const qp = this.route.snapshot.queryParamMap;
    const pVType = qp.has('vType') ? (Number(qp.get('vType')) || null) : null;
    const pYear  = qp.has('year')  ? (Number(qp.get('year'))  || null) : null;
    const pDoc   = qp.get('docNum');
    this.svc.getLookups().subscribe({
      next: (l) => {
        this.lookups = l;
        if (pVType != null) this.current.VType = pVType;
        if (pYear  != null) this.current.Myear = pYear;
        if (pDoc) { this.current.DocNo = pDoc; this.load(); }
      },
      error: () => {}
    });
    this.itemSvc.list().subscribe({ next: (r) => this.allItems = r || [], error: () => {} });
    this.accSvc.getAll().subscribe({ next: (r) => this.setAccounts(r), error: () => {} });
    this.ccSvc.getAll().subscribe({ next: (r) => this.costCenters = r || [], error: () => {} });
  }

  // ─── header account / cost-center dropdowns ───────────────────
  accSearchFn = (term: string, a: ChartOfAccountDto): boolean => {
    term = (term || '').toLowerCase();
    return String(a.no).includes(term)
      || (a.name || '').toLowerCase().includes(term)
      || (a.Ename || '').toLowerCase().includes(term);
  };
  ccSearchFn = (term: string, c: CostCenterDto): boolean => {
    term = (term || '').toLowerCase();
    return String(c.CcntrNo).includes(term)
      || (c.CcAname || '').toLowerCase().includes(term)
      || (c.Ccename || '').toLowerCase().includes(term);
  };
  /** Keep the debit-account name in sync (used by the loaded voucher / print). */
  onDebitAccChange(): void {
    this.current.DebitAccName = this.accName(this.current.DebitAcc);
  }
  private accName(no: number | null | undefined): string {
    const a = this.accounts.find(x => x.no === no);
    return a ? (this.isAr ? (a.name || '') : (a.Ename || a.name || '')) : '';
  }
  /** Per-line credit account (الحساب الدائن) name sync. */
  onLineCreditAccChange(line: OutboundLine): void { line.CreditAccName = this.accName(line.CreditAcc); }
  /** Full list for name lookups + leaf-only (not branched) list for the dropdowns.
   *  An account is "branched" (a parent) if another account's belong points to it. */
  private setAccounts(r: ChartOfAccountDto[]): void {
    this.accounts = r || [];
    const parents = new Set<number>();
    this.accounts.forEach(a => { if (a.belong != null && +a.belong !== 0) parents.add(+a.belong); });
    this.postableAccounts = this.accounts.filter(a => !parents.has(+a.no));
  }

  // ─── tabs / vouchers list ─────────────────────────────────────
  switchTab(t: 'form' | 'list'): void {
    this.activeTab = t;
    if (t === 'list' && !this.listLoaded) this.loadList();
  }

  loadList(): void {
    if (!this.current.Myear) return;
    this.listLoading = true;
    this.svc.list(this.current.Myear).subscribe({
      next: (r) => { this.vouchers = r || []; this.listLoaded = true; this.listLoading = false; },
      error: () => { this.listLoading = false; }
    });
  }

  get filteredVouchers(): OutboundListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.vouchers;
    return this.vouchers.filter(v =>
      (v.DocNo || '').toLowerCase().includes(t) ||
      (v.VTypeName || '').toLowerCase().includes(t) ||
      (v.TgName || '').toLowerCase().includes(t));
  }

  openVoucher(row: OutboundListRow): void {
    this.current.VType = row.VType;
    this.current.DocNo = row.DocNo;
    this.current.Myear = row.Myear ?? this.current.Myear;
    this.activeTab = 'form';
    this.load();
  }

  private init(): OutboundVoucher {
    return {
      TransNo: null, DocNo: '', VType: null, VTypeName: '', Myear: new Date().getFullYear(),
      TransDate: this.todayIso(), Tg: null, BrNo: null, Des: '',
      CurNo: 1, Rate: 1, DebitAcc: null, DebitAccName: '', CostCenter: null,
      Lines: [this.newLine()],
    };
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  newLine(): OutboundLine {
    return {
      ItemNo: '', ItemName: '', UnitNo: 0, UnitName: '', UnitRate: 1, StoreNo: null, Qty: null, Weight: null,
      Cost: null, ItemTot: 0, ExpDate: '', BatchNo: '',
      CreditAcc: null, CreditAccName: '', CostCenter: null,
      Expired: false, Units: [],
    };
  }

  // ─── search helpers ───────────────────────────────────────────
  itemSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Ename || '').toLowerCase().includes(term);
  };

  // ─── header ───────────────────────────────────────────────────
  onSerialChange(): void {
    const s = this.lookups.SerialTypes.find(x => x.VType === this.current.VType);
    this.current.VTypeName = s ? (this.isAr ? s.Name : (s.Ename || s.Name)) : '';
    if (s && s.BrNo) this.current.BrNo = s.BrNo;
    if (!this.isExisting) this.fetchNextNo();
  }

  fetchNextNo(): void {
    if (!this.current.VType || !this.current.Myear) return;
    this.svc.nextNo(this.current.VType, this.current.Myear).subscribe({ next: (r) => this.current.DocNo = r.nextNo, error: () => {} });
  }

  /** احضار — load an existing voucher by (serial type, doc no, year). */
  load(): void {
    if (!this.current.VType) { this.toastr.warning(this.translate.instant('Outbound.SelectSerial')); return; }
    if (!this.current.DocNo) { this.toastr.warning(this.translate.instant('Outbound.EnterDocNo')); return; }
    this.svc.get(this.current.VType, this.current.DocNo, this.current.Myear!).subscribe({
      next: (v) => {
        const lines = (v.Lines || []).map(l => ({
          ...l,
          Units: [{ UnitNo: l.UnitNo, UnitName: l.UnitName, Operand: l.UnitRate }],
        } as OutboundLine));
        this.current = { ...v, Lines: lines.length ? lines : [this.newLine()] };
        this.isExisting = true;
        this.loadSerials();
        this.toastr.success(this.translate.instant('Outbound.Loaded'));
      },
      error: (err) => {
        if (err.status === 404) this.toastr.info(this.translate.instant('Outbound.NotFound'));
        else this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  // ─── detail grid ──────────────────────────────────────────────
  onItemPick(line: OutboundLine): void {
    const code = (line.ItemNo || '').trim();
    if (!code) { line.ItemName = ''; line.Units = []; line.UnitNo = 0; return; }
    const it = this.allItems.find(x => x.ItemNo === code);
    line.ItemName = it ? (this.isAr ? it.ItemName : (it.Ename || it.ItemName)) : '';
    this.loadItemStock(line);
    this.svc.getItemInfo(code).subscribe({
      next: (info) => {
        line.Units = info.Units || [];
        line.Expired = !!info.Expired;
        if (line.Cost == null || line.Cost === 0) line.Cost = info.DefaultCost ?? 0;
        const u = line.Units[0];
        if (u) { line.UnitNo = u.UnitNo; line.UnitName = this.isAr ? u.UnitName : (u.UnitEname || u.UnitName); line.UnitRate = u.Operand; }
        this.recalc(line);
        this.updateFifoCost(line);
      },
      error: () => {}
    });
  }

  onUnitChange(line: OutboundLine): void {
    const u = (line.Units || []).find(x => x.UnitNo === line.UnitNo);
    if (u) { line.UnitName = this.isAr ? u.UnitName : (u.UnitEname || u.UnitName); line.UnitRate = u.Operand; }
    this.recalc(line);
    this.setMaxQty(line);
    this.updateFifoCost(line);
  }

  // ─── احضار (bring items of a category into the grid — VB6 Command5) ───────
  private defaultStore(): number | null {
    const s = this.lookups.SerialTypes.find(x => x.VType === this.current.VType);
    return (s && s.StoreNo) ? s.StoreNo : (this.lookups.Stores[0]?.StoreNo ?? null);
  }
  openBring(): void {
    this.bringCategory = null;
    this.bringStore = this.defaultStore();
    this.showBring = true;
  }
  closeBring(): void { this.showBring = false; }
  doBring(): void {
    if (!this.bringCategory) { this.toastr.warning(this.translate.instant('Outbound.SelectCategory')); return; }
    this.svc.itemsByCategory(this.bringCategory).subscribe({
      next: (items: OutbCategoryItem[]) => {
        if (!items.length) { this.toastr.info(this.translate.instant('Outbound.NoItemsInCategory')); return; }
        const store = this.lookups.Stores.find(x => x.StoreNo === this.bringStore);
        this.current.Lines = items.map(it => ({
          ItemNo: it.ItemNo, ItemName: this.isAr ? it.ItemName : (it.Ename || it.ItemName),
          UnitNo: it.UnitNo, UnitName: this.isAr ? it.UnitName : (it.UnitEname || it.UnitName), UnitRate: it.Operand,
          StoreNo: this.bringStore, StoreName: store ? (this.isAr ? store.Name : (store.Ename || store.Name)) : '',
          Qty: null, Weight: null, Cost: it.DefaultCost ?? 0, ItemTot: 0, ExpDate: '', BatchNo: '',
          CreditAcc: store?.AccountNo || null, CreditAccName: store?.AccountName || '', CostCenter: null,
          Expired: !!it.Expired, Units: [{ UnitNo: it.UnitNo, UnitName: it.UnitName, Operand: it.Operand }],
        } as OutboundLine));
        this.showBring = false;
        this.toastr.success(this.translate.instant('Outbound.Brought'));
      },
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('General.Error'))
    });
  }

  // ─── GL entries (قيود السند) ───────────────────────────────────
  showGLEntries(): void {
    if (!this.isExisting || !this.current.VType || !this.current.DocNo) {
      this.toastr.info(this.translate.instant('Outbound.SaveFirstGL'));
      return;
    }
    this.glLoading = true;
    this.glEntries = [];
    this.showGL = true;
    this.svc.getGL(this.current.VType, this.current.DocNo, this.current.Myear!).subscribe({
      next: (r) => { this.glEntries = r || []; this.glLoading = false; },
      error: (err) => { this.glLoading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
    });
  }
  closeGL(): void { this.showGL = false; }
  get glDebit(): number { return this.glEntries.reduce((s, e) => s + (+e.Debit || 0), 0); }
  get glCredit(): number { return this.glEntries.reduce((s, e) => s + (+e.Credit || 0), 0); }

  onStoreChange(line: OutboundLine): void {
    const s = this.lookups.Stores.find(x => x.StoreNo === line.StoreNo);
    line.StoreName = s ? (this.isAr ? s.Name : (s.Ename || s.Name)) : '';
    line.CreditAcc = s?.AccountNo || null;              // credit = store's inventory account
    line.CreditAccName = s?.AccountName || '';
    this.setMaxQty(line);
    this.updateFifoCost(line);
  }

  recalc(line: OutboundLine): void {
    line.ItemTot = (+(line.Qty || 0)) * (+(line.Cost || 0));
  }

  /** Fetch the FIFO issue cost for a line (qty in base units) → line.Cost per selected unit. */
  updateFifoCost(line: OutboundLine): void {
    const qty = +(line.Qty || 0), store = line.StoreNo || 0, ur = +(line.UnitRate || 1) || 1;
    if (!(line.ItemNo || '').trim() || !store || qty <= 0) return;
    this.svc.fifoCost(line.ItemNo || '', qty * ur, store, this.current.TransDate || '').subscribe({
      next: (r) => { line.Cost = (+(r?.cost || 0)) * ur; this.recalc(line); },
      error: () => {},
    });
  }

  /** Voucher date changed → availability + FIFO cost are date-dependent, so refresh each line. */
  onDateChange(): void {
    (this.current.Lines || []).forEach(l => {
      if ((l.ItemNo || '').trim()) { this.loadItemStock(l); this.updateFifoCost(l); }
    });
  }

  /** Load the stores where this item is in stock → line.AvailStores + max qty. */
  loadItemStock(line: OutboundLine): void {
    const item = (line.ItemNo || '').trim();
    if (!item) { line.AvailStores = undefined; line.MaxQty = null; return; }
    this.svc.itemStock(item, this.current.TransDate || '').subscribe({
      next: (stores) => {
        line.AvailStores = stores || [];
        if (line.StoreNo && line.AvailStores.length && !line.AvailStores.some(s => s.StoreNo === line.StoreNo)) {
          line.StoreNo = null; line.StoreName = ''; line.CreditAcc = null; line.CreditAccName = '';
        }
        if (!line.StoreNo && line.AvailStores.length === 1) { line.StoreNo = line.AvailStores[0].StoreNo; this.onStoreChange(line); }
        this.setMaxQty(line);
      },
      error: () => { line.AvailStores = undefined; line.MaxQty = null; },   // fallback: all stores, no cap
    });
  }

  /** Available quantity in the selected store, in the line's selected unit.
   *  Item not stocked in the selected store → 0 (only null when stock is unknown / no store). */
  setMaxQty(line: OutboundLine): void {
    const ur = +(line.UnitRate || 1) || 1;
    if (line.AvailStores == null || !line.StoreNo) { line.MaxQty = null; return; }
    const st = line.AvailStores.find(s => s.StoreNo === line.StoreNo);
    line.MaxQty = st ? st.OnHand / ur : 0;
  }

  /** Clamp the entered quantity to what's available, then recost. */
  onQtyChange(line: OutboundLine): void {
    if (line.MaxQty != null && +(line.Qty || 0) > line.MaxQty) {
      line.Qty = line.MaxQty;
      this.toastr.warning(this.translate.instant('Outbound.QtyExceedsStock', { n: line.MaxQty }));
    }
    this.recalc(line);
    this.updateFifoCost(line);
  }

  addLine(): void { this.current.Lines.push(this.newLine()); }
  removeLine(i: number): void {
    // VB6 Command1_Click serial guard: can't drop a line whose item has serials.
    const line = this.current.Lines[i];
    if (this.serialSystem && (line?.Serials?.length || 0) > 0) {
      this.toastr.warning(this.translate.instant('Serials.LineHasSerials'));
      return;
    }
    this.current.Lines.splice(i, 1);
    if (!this.current.Lines.length) this.current.Lines.push(this.newLine());
  }

  get totalWeight(): number { return this.current.Lines.reduce((s, l) => s + (+(l.Weight || 0)), 0); }
  get grandTotal(): number { return this.current.Lines.reduce((s, l) => s + (+(l.ItemTot || 0)), 0); }

  // ─── serial numbers (نظام الأرقام التسلسلية) ─────────────────────
  get serialSystem(): boolean { return !!this.lookups.SerialSystem; }
  /** Physical unit count for a line = qty × unit rate (serials are 1-per-unit). */
  baseQty(line: OutboundLine): number { return Math.round((+(line.Qty || 0)) * (+(line.UnitRate || 1) || 1)); }

  /** Open the serial picker for a line (outbound → pick in-stock serials). */
  async openSerials(line: OutboundLine): Promise<void> {
    if (!(line.ItemNo || '').trim()) { this.toastr.warning(this.translate.instant('Outbound.PickItemFirst')); return; }
    if (!line.StoreNo) { this.toastr.warning(this.translate.instant('Outbound.StoreRequired')); return; }
    const need = this.baseQty(line);
    if (need <= 0) { this.toastr.warning(this.translate.instant('Outbound.QtyRequired')); return; }
    const picked = await this.serialModal.open({
      mode: 'pick', itemNo: line.ItemNo!, itemName: line.ItemName || '',
      store: line.StoreNo, requiredCount: need, current: line.Serials || [],
    });
    if (picked) line.Serials = picked;
  }

  /** Load the saved serials for the current voucher and attach them to lines (by item). */
  private loadSerials(): void {
    if (!this.serialSystem || !this.current.DocNo || !this.current.VType) return;
    this.serialSvc.list(this.current.DocNo, this.KIND, this.current.VType, this.current.Myear!).subscribe({
      next: (rows) => {
        const byItem = new Map<string, string[]>();
        (rows || []).forEach(r => {
          const k = (r.ItemNo || '').trim();
          if (!byItem.has(k)) byItem.set(k, []);
          byItem.get(k)!.push(r.SerialNo);
        });
        this.current.Lines.forEach(l => {
          const k = (l.ItemNo || '').trim();
          if (byItem.has(k)) { l.Serials = byItem.get(k); byItem.delete(k); }
        });
      },
      error: () => {},
    });
  }

  /** After the voucher is saved, persist its serials. */
  private postSerials(docNo: string): void {
    if (!this.serialSystem) return;
    const serials: SerialLine[] = [];
    this.savableLines().forEach(l => {
      (l.Serials || []).forEach(sn => serials.push({
        ItemNo: (l.ItemNo || '').trim(), StoreNo: l.StoreNo!, BatchNo: l.BatchNo || '', SerialNo: sn,
      }));
    });
    this.serialSvc.save({
      DocNo: docNo, Kind: this.KIND, VType: this.current.VType!, Myear: this.current.Myear!,
      DocType: this.DOCTYPE, Branch: this.current.BrNo || 1, DocDate: this.current.TransDate || '',
      Serials: serials,
    }).subscribe({
      next: () => {},
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('Serials.SaveFailed')),
    });
  }

  /** VB6 Store_array serial guard: every item that already has serials must still be
   *  present in the grid — otherwise editing would orphan those serials. */
  private async serialItemsIntact(): Promise<boolean> {
    try {
      const rows = await firstValueFrom(
        this.serialSvc.list(this.current.DocNo!, this.KIND, this.current.VType!, this.current.Myear!));
      const serialItems = new Set((rows || []).map(r => (r.ItemNo || '').trim()).filter(Boolean));
      if (!serialItems.size) return true;
      const gridItems = new Set(this.savableLines().map(l => (l.ItemNo || '').trim()));
      for (const it of serialItems) if (!gridItems.has(it)) return false;
      return true;
    } catch { return true; }   // fail open — backend re-validates on serial save
  }

  /** VB6 DeleteSerialTrans guard: block voucher delete while it still has serials. */
  private async voucherHasSerials(): Promise<boolean> {
    try {
      const rows = await firstValueFrom(
        this.serialSvc.list(this.current.DocNo!, this.KIND, this.current.VType!, this.current.Myear!));
      return (rows?.length || 0) > 0;
    } catch { return false; }   // fail open — don't lock the user out on a serials API error
  }

  // ─── save / delete / new ──────────────────────────────────────
  /** Lines that actually count: an item picked and a positive quantity. */
  private savableLines(): OutboundLine[] {
    return this.current.Lines.filter(l => (l.ItemNo || '').trim() && +(l.Qty || 0) > 0);
  }

  private validate(): boolean {
    if (!this.current.VType) { this.toastr.warning(this.translate.instant('Outbound.SelectSerial')); return false; }
    if (!this.current.DocNo?.trim()) { this.toastr.warning(this.translate.instant('Outbound.EnterDocNo')); return false; }
    // Validate every row the user actually started (item picked) — otherwise an
    // item with a missing/zero/negative quantity would be silently dropped.
    const itemLines = this.current.Lines.filter(l => (l.ItemNo || '').trim());
    if (!itemLines.length) { this.toastr.warning(this.translate.instant('Outbound.NoLines')); return false; }
    if (itemLines.some(l => !(+(l.Qty || 0) > 0))) { this.toastr.warning(this.translate.instant('Outbound.QtyRequired')); return false; }
    if (itemLines.some(l => !l.StoreNo)) { this.toastr.warning(this.translate.instant('Outbound.StoreRequired')); return false; }
    if (itemLines.some(l => !l.UnitNo)) { this.toastr.warning(this.translate.instant('Outbound.UnitRequired')); return false; }
    // Serial system: each line must carry exactly one serial per physical unit.
    if (this.serialSystem) {
      const bad = itemLines.find(l => (l.Serials?.length || 0) !== this.baseQty(l));
      if (bad) { this.toastr.warning(this.translate.instant('Serials.LineCountMismatch', { item: bad.ItemNo })); return false; }
    }
    return true;
  }

  async save(): Promise<void> {
    if (!this.validate()) return;
    // Serial edit-guard: block a save that would orphan an item's serials.
    if (this.serialSystem && this.isExisting && !(await this.serialItemsIntact())) {
      this.toastr.warning(this.translate.instant('Serials.EditBlockedItemsChanged'));
      return;
    }
    this.saving = true;
    const payload: OutboundVoucher = {
      ...this.current,
      Lines: this.savableLines(),
    };
    this.svc.save(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.current.DocNo = res.docNo;
        this.isExisting = true;
        this.listLoaded = false;   // list may be stale
        this.postSerials(res.docNo);
        this.toastr.success(res.message || this.translate.instant('General.SaveSuccess'));
      },
      error: (err) => { this.saving = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
    });
  }

  async delete(): Promise<void> {
    if (!this.isExisting || !this.current.VType || !this.current.DocNo) return;
    // Serial guard (VB6 DeleteSerialTrans): can't delete a voucher that still has serials.
    if (this.serialSystem && await this.voucherHasSerials()) {
      this.toastr.warning(this.translate.instant('Serials.DeleteBlockedHasSerials'));
      return;
    }
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.svc.delete(this.current.VType!, this.current.DocNo!, this.current.Myear!).subscribe({
      next: (res: any) => { this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess')); this.reset(); },
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('General.Error'))
    });
  }

  reset(): void {
    const vtype = this.current.VType, myear = this.current.Myear;
    this.current = this.init();
    this.current.VType = vtype; this.current.Myear = myear;
    this.isExisting = false;
    this.listLoaded = false;
    if (vtype) { this.onSerialChange(); }
  }

  // ─── print / Excel / Word export ──────────────────────────────
  /** Route the export split-button to the current voucher or the vouchers list. */
  onExport(): void {
    if (this.activeTab === 'list') this.printList();
    else this.print();
  }

  /** Export the vouchers list (قائمة السندات). */
  printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const num = (n: any) => (n == null || n === '' ? '' : (+n).toLocaleString());
    const showCost = this.canViewCost;
    const cols = [
      { label: t('Outbound.DocNo') }, { label: t('Outbound.Serial') }, { label: t('Outbound.Date') },
      { label: t('Outbound.Entity') },
      ...(showCost ? [{ label: t('Outbound.GrandTotal') }] : []), { label: t('Outbound.LinesCount') },
    ];
    const rows = this.filteredVouchers.map(v =>
      `<tr><td>${v.DocNo ?? ''}</td><td>${v.VTypeName ?? ''}</td>` +
      `<td>${v.TransDate ? String(v.TransDate).slice(0, 10) : ''}</td>` +
      `<td>${v.TgName ?? ''}</td>` + (showCost ? `<td>${num(v.Total)}</td>` : ``) + `<td>${v.Lines ?? ''}</td></tr>`).join('');
    const grand = this.filteredVouchers.reduce((s, v) => s + (+(v.Total || 0)), 0);
    const totRow = showCost
      ? `<tr style="font-weight:700;background:#eef2ff"><td colspan="4" style="text-align:end">${t('Outbound.GrandTotal')}</td><td>${num(grand)}</td><td></td></tr>`
      : '';
    const filtersHtml =
      `<div class="filter-item"><span class="filter-label">${t('Outbound.Year')}:</span><span class="filter-value">${this.current.Myear ?? ''}</span></div>`;
    this.reportService.printReport(t('Outbound.ListTab'), cols, rows + totRow, filtersHtml);
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const num = (n: any) => (n == null || n === '' ? '' : (+n).toLocaleString());
    const lines = this.current.Lines.filter(l => (l.ItemNo || '').trim());

    const showCost = this.canViewCost;
    const cols = [
      { label: t('Outbound.ItemCode') }, { label: t('Outbound.ItemName') }, { label: t('Outbound.Unit') },
      { label: t('Outbound.Store') }, { label: t('Outbound.Qty') },
      ...(showCost ? [{ label: t('Outbound.Cost') }, { label: t('Outbound.Total') }] : []),
      { label: t('Outbound.Expiry') }, { label: t('Outbound.Batch') },
    ];
    const rows = lines.map(l =>
      `<tr><td>${l.ItemNo ?? ''}</td><td>${l.ItemName ?? ''}</td><td>${l.UnitName ?? ''}</td>` +
      `<td>${l.StoreName ?? ''}</td><td>${num(l.Qty)}</td>` +
      (showCost ? `<td>${num(l.Cost)}</td><td>${num(l.ItemTot)}</td>` : ``) +
      `<td>${l.ExpDate ?? ''}</td><td>${l.BatchNo ?? ''}</td></tr>`).join('');
    const totRow = showCost
      ? `<tr style="font-weight:700;background:#eef2ff"><td colspan="6" style="text-align:end">${t('Outbound.GrandTotal')}</td><td>${num(this.grandTotal)}</td><td colspan="2"></td></tr>`
      : '';

    const fi = (label: string, val: any) =>
      `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('Outbound.DocNo'), this.current.DocNo) +
      fi(t('Outbound.Serial'), this.current.VTypeName) +
      fi(t('Outbound.Date'), this.current.TransDate) +
      fi(t('Outbound.Entity'), this.current.TgName) +
      fi(t('Outbound.Year'), this.current.Myear) +
      fi(t('Outbound.Notes'), this.current.Des);
    const footerHtml = showCost
      ? `<b>${t('Outbound.TotalWeight')}:</b> ${num(this.totalWeight)} &nbsp;&nbsp;&nbsp; <b>${t('Outbound.GrandTotal')}:</b> ${num(this.grandTotal)}`
      : `<b>${t('Outbound.TotalWeight')}:</b> ${num(this.totalWeight)}`;

    this.reportService.printReport(t('Outbound.Title'), cols, rows + totRow, filtersHtml, footerHtml);
  }
}
