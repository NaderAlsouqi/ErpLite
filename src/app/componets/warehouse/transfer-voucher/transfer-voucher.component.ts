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
import { TransferVoucher, TransferLine, TransferLookups, TransferListRow, TransferGLRow, TrnCategoryItem, TrnItemBatch, TransferVoucherService } from '../../../shared/services/transfer-voucher.service';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import { CostCenterService, CostCenterDto } from '../../../shared/services/cost-center.service';
import { SerialsService, SerialLine } from '../../../shared/services/serials.service';
import { SerialEntryModalComponent } from '../../../shared/components/serial-entry-modal/serial-entry-modal.component';
import { AuthService } from '../../../shared/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-transfer-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule, ConfirmationModalComponent, HasPermissionDirective, ReportExportComponent, SerialEntryModalComponent],
  templateUrl: './transfer-voucher.component.html',
  styleUrls: ['./transfer-voucher.component.scss'],
})
export class TransferVoucherComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;
  @ViewChild('serialModal') serialModal!: SerialEntryModalComponent;

  // serial-number system — a transfer moves serials, so record BOTH legs:
  //   OUT (issue from source) then IN (receive at destination) so the serial follows the goods.
  private readonly KIND = 2;          // DocKind = 2 (OUT / issue from FromStore) — source of truth for the picker/guards
  private readonly DOCTYPE = '25';    // DT_Trns_Out
  private readonly KIND_IN = 1;       // DocKind = 1 (IN / receive at ToStore)
  private readonly DOCTYPE_IN = '24'; // DT_Trns_In

  activeTab: 'form' | 'list' = 'form';
  readonly currentYear = new Date().getFullYear();

  current: TransferVoucher = this.init();
  lookups: TransferLookups = { SerialTypes: [], Stores: [], Currencies: [], Categories: [] };
  allItems: ItemListRow[] = [];
  accounts: ChartOfAccountDto[] = [];
  postableAccounts: ChartOfAccountDto[] = [];   // leaf accounts only — for the dropdowns
  costCenters: CostCenterDto[] = [];
  isExisting = false;
  saving = false;

  vouchers: TransferListRow[] = [];
  listFilter = '';
  listLoading = false;
  listLoaded = false;

  glEntries: TransferGLRow[] = [];
  glLoading = false;
  showGL = false;

  showBring = false;
  bringCategory: number | null = null;

  // batch/expiry picker (VB6 ShowGrid2)
  showBatch = false;
  batchLine: TransferLine | null = null;
  batchList: TrnItemBatch[] = [];
  batchLoading = false;

  constructor(
    private svc: TransferVoucherService,
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
  get perpetual(): boolean { return !!this.lookups.Perpetual; }
  /** الكلفة column visibility — hides Cost + line Total + grand total when the user lacks it. */
  get canViewCost(): boolean { return this.auth.hasPermission('Transfer.ViewCost'); }
  get serialSystem(): boolean { return !!this.lookups.SerialSystem; }

  ngOnInit(): void {
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

  // ─── account / cost-center dropdowns ──────────────────────────
  accSearchFn = (term: string, a: ChartOfAccountDto): boolean => {
    term = (term || '').toLowerCase();
    return String(a.no).includes(term) || (a.name || '').toLowerCase().includes(term) || (a.Ename || '').toLowerCase().includes(term);
  };
  ccSearchFn = (term: string, c: CostCenterDto): boolean => {
    term = (term || '').toLowerCase();
    return String(c.CcntrNo).includes(term) || (c.CcAname || '').toLowerCase().includes(term) || (c.Ccename || '').toLowerCase().includes(term);
  };
  private accName(no: number | null | undefined): string {
    const a = this.accounts.find(x => x.no === no);
    return a ? (this.isAr ? (a.name || '') : (a.Ename || a.name || '')) : '';
  }
  onDebitAccChange(): void { this.current.DebitAccName = this.accName(this.current.DebitAcc); }
  onCreditAccChange(): void { this.current.CreditAccName = this.accName(this.current.CreditAcc); }
  onLineAccChange(line: TransferLine): void { line.AccountName = this.accName(line.AccountNo); }
  private setAccounts(r: ChartOfAccountDto[]): void {
    this.accounts = r || [];
    const parents = new Set<number>();
    this.accounts.forEach(a => { if (a.belong != null && +a.belong !== 0) parents.add(+a.belong); });
    this.postableAccounts = this.accounts.filter(a => !parents.has(+a.no));
  }

  // ─── tabs / list ──────────────────────────────────────────────
  switchTab(t: 'form' | 'list'): void { this.activeTab = t; if (t === 'list' && !this.listLoaded) this.loadList(); }
  loadList(): void {
    if (!this.current.Myear) return;
    this.listLoading = true;
    this.svc.list(this.current.Myear).subscribe({
      next: (r) => { this.vouchers = r || []; this.listLoaded = true; this.listLoading = false; },
      error: () => { this.listLoading = false; }
    });
  }
  get filteredVouchers(): TransferListRow[] {
    const t = (this.listFilter || '').toLowerCase().trim();
    if (!t) return this.vouchers;
    return this.vouchers.filter(v =>
      (v.DocNo || '').toLowerCase().includes(t) || (v.VTypeName || '').toLowerCase().includes(t) ||
      (v.FromStoreName || '').toLowerCase().includes(t) || (v.ToStoreName || '').toLowerCase().includes(t));
  }
  openVoucher(row: TransferListRow): void {
    this.current.VType = row.VType; this.current.DocNo = row.DocNo; this.current.Myear = row.Myear ?? this.current.Myear;
    this.activeTab = 'form'; this.load();
  }

  private init(): TransferVoucher {
    return {
      TransNo: null, DocNo: '', VType: null, VTypeName: '', Myear: new Date().getFullYear(),
      TransDate: this.todayIso(), FromStore: null, ToStore: null, AdditionalCost: 0,
      CurNo: 1, Rate: 1, DebitAcc: null, DebitAccName: '', CreditAcc: null, CreditAccName: '',
      DbCostCenter: null, CrCostCenter: null, BrNo: null, Des: '',
      Lines: [this.newLine()],
    };
  }
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  newLine(): TransferLine {
    return {
      ItemNo: '', ItemName: '', UnitNo: 0, UnitName: '', UnitRate: 1, Qty: null, Weight: null,
      Wcost: 0, Cost: null, ItemTot: 0, ExpDate: '', BatchNo: '', AccountNo: null, CostCenter: null,
      OrderId: '', Expired: false, Units: [], MaxQty: null,
    };
  }

  itemSearchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term) || (item.ItemName || '').toLowerCase().includes(term) || (item.Ename || '').toLowerCase().includes(term);
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

  /** من مستودع — credit account = FromStore inventory account; availability recomputes. */
  onFromStoreChange(): void {
    if (this.current.FromStore && this.current.FromStore === this.current.ToStore) {
      this.toastr.warning(this.translate.instant('Transfer.SameStore'));
      this.current.FromStore = null; this.current.FromStoreName = ''; return;
    }
    const s = this.lookups.Stores.find(x => x.StoreNo === this.current.FromStore);
    this.current.FromStoreName = s ? (this.isAr ? s.Name : (s.Ename || s.Name)) : '';
    this.current.CreditAcc = s?.AccountNo || null;
    this.current.CreditAccName = s?.AccountName || '';
    (this.current.Lines || []).forEach(l => { if ((l.ItemNo || '').trim()) { this.loadItemStock(l); this.updateFifoCost(l); } });
  }
  /** إلى مستودع — debit account = ToStore inventory account (per-line default too). */
  onToStoreChange(): void {
    if (this.current.ToStore && this.current.ToStore === this.current.FromStore) {
      this.toastr.warning(this.translate.instant('Transfer.SameStore'));
      this.current.ToStore = null; this.current.ToStoreName = ''; return;
    }
    const s = this.lookups.Stores.find(x => x.StoreNo === this.current.ToStore);
    this.current.ToStoreName = s ? (this.isAr ? s.Name : (s.Ename || s.Name)) : '';
    this.current.DebitAcc = s?.AccountNo || null;
    this.current.DebitAccName = s?.AccountName || '';
    (this.current.Lines || []).forEach(l => { if ((l.ItemNo || '').trim() && !l.AccountNo) { l.AccountNo = this.current.DebitAcc || null; l.AccountName = this.current.DebitAccName; } });
  }

  load(): void {
    if (!this.current.VType) { this.toastr.warning(this.translate.instant('Transfer.SelectSerial')); return; }
    if (!this.current.DocNo) { this.toastr.warning(this.translate.instant('Transfer.EnterDocNo')); return; }
    this.svc.get(this.current.VType, this.current.DocNo, this.current.Myear!).subscribe({
      next: (v) => {
        const lines = (v.Lines || []).map(l => ({ ...l, RawWcost: l.Wcost, Units: [{ UnitNo: l.UnitNo, UnitName: l.UnitName, Operand: l.UnitRate }] } as TransferLine));
        this.current = { ...v, Lines: lines.length ? lines : [this.newLine()] };
        this.isExisting = true;
        this.loadSerials();
        this.toastr.success(this.translate.instant('Transfer.Loaded'));
      },
      error: (err) => {
        if (err.status === 404) this.toastr.info(this.translate.instant('Transfer.NotFound'));
        else this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  // ─── detail grid ──────────────────────────────────────────────
  onItemPick(line: TransferLine): void {
    const code = (line.ItemNo || '').trim();
    if (!code) { line.ItemName = ''; line.Units = []; line.UnitNo = 0; return; }
    const it = this.allItems.find(x => x.ItemNo === code);
    line.ItemName = it ? (this.isAr ? it.ItemName : (it.Ename || it.ItemName)) : '';
    if (!line.AccountNo && this.current.DebitAcc) { line.AccountNo = this.current.DebitAcc; line.AccountName = this.current.DebitAccName; }
    this.loadItemStock(line);
    this.svc.getItemInfo(code).subscribe({
      next: (info) => {
        line.Units = info.Units || [];
        line.Expired = !!info.Expired;
        line.RawWcost = info.DefaultCost ?? 0;   // weighted default; refined by FIFO on qty
        line.Wcost = info.DefaultCost ?? 0;
        const u = line.Units[0];
        if (u) { line.UnitNo = u.UnitNo; line.UnitName = this.isAr ? u.UnitName : (u.UnitEname || u.UnitName); line.UnitRate = u.Operand; }
        this.updateFifoCost(line);
        this.autoFillExpiry(line);
      },
      error: () => {}
    });
  }
  onUnitChange(line: TransferLine): void {
    const u = (line.Units || []).find(x => x.UnitNo === line.UnitNo);
    if (u) { line.UnitName = this.isAr ? u.UnitName : (u.UnitEname || u.UnitName); line.UnitRate = u.Operand; }
    this.setMaxQty(line);
    this.updateFifoCost(line);
  }

  /** VB6 FIFO_COST / GetWCostNew — fetch the issue cost (FIFO or weighted per tenant)
   *  from the source store as of the voucher date; qty in base units. */
  updateFifoCost(line: TransferLine): void {
    const item = (line.ItemNo || '').trim();
    const store = this.current.FromStore || 0;
    const rate = +(line.UnitRate || 1) || 1;
    const qtyBase = (+(line.Qty || 0)) * rate;
    if (!item || !store || qtyBase <= 0) { this.recompute(); return; }
    this.svc.fifoCost(item, qtyBase, store, this.current.TransDate || '').subscribe({
      next: (r) => { if (r && +r.cost > 0) line.RawWcost = +r.cost; this.recompute(); },
      error: () => this.recompute(),
    });
  }

  /** VB6 GETEXPDATE — auto-fill an expiry-tracked line's expiry from available stock. */
  autoFillExpiry(line: TransferLine): void {
    if (!line.Expired || !(line.ItemNo || '').trim() || !this.current.FromStore) return;
    this.svc.itemBatches(line.ItemNo!, this.current.FromStore, this.current.TransDate || '').subscribe({
      next: (bs) => { if (bs && bs.length && !(line.ExpDate || '').trim()) line.ExpDate = this.toIsoDate(bs[0].ExpDate); },
      error: () => {},
    });
  }
  private toIsoDate(s?: string): string {
    const t = (s || '').trim();
    return t ? t.replace(/\//g, '-').slice(0, 10) : '';
  }

  // ─── batch/expiry picker (VB6 ShowGrid2) ──────────────────────
  openBatch(line: TransferLine): void {
    if (!(line.ItemNo || '').trim()) { this.toastr.warning(this.translate.instant('Transfer.PickItemFirst')); return; }
    if (!this.current.FromStore) { this.toastr.warning(this.translate.instant('Transfer.FromStoreRequired')); return; }
    this.batchLine = line; this.showBatch = true; this.batchLoading = true; this.batchList = [];
    this.svc.itemBatches(line.ItemNo!, this.current.FromStore, this.current.TransDate || '').subscribe({
      next: (bs) => { this.batchList = bs || []; this.batchLoading = false; },
      error: () => { this.batchLoading = false; },
    });
  }
  pickBatch(b: TrnItemBatch): void {
    if (this.batchLine) { this.batchLine.BatchNo = b.BatchNo; this.batchLine.ExpDate = this.toIsoDate(b.ExpDate); }
    this.showBatch = false;
  }
  closeBatch(): void { this.showBatch = false; }

  // ─── serial numbers (نظام الأرقام التسلسلية) ─────────────────────
  /** Physical unit count for a line = qty × unit rate (serials are 1-per-unit). */
  baseQty(line: TransferLine): number { return Math.round((+(line.Qty || 0)) * (+(line.UnitRate || 1) || 1)); }

  /** Pick in-stock serials from the SOURCE store (VB6 records transfer serials on the OUT leg). */
  async openSerials(line: TransferLine): Promise<void> {
    if (!(line.ItemNo || '').trim()) { this.toastr.warning(this.translate.instant('Transfer.PickItemFirst')); return; }
    if (!this.current.FromStore) { this.toastr.warning(this.translate.instant('Transfer.FromStoreRequired')); return; }
    const need = this.baseQty(line);
    if (need <= 0) { this.toastr.warning(this.translate.instant('Transfer.QtyRequired')); return; }
    const picked = await this.serialModal.open({
      mode: 'pick', itemNo: line.ItemNo!, itemName: line.ItemName || '',
      store: this.current.FromStore, requiredCount: need, current: line.Serials || [],
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

  /** After the voucher is saved, persist its serials on BOTH legs: OUT (issued from
   *  the source store) then IN (received at the destination store), so the serial
   *  moves with the goods and stays in stock at ToStore. */
  private postSerials(docNo: string): void {
    if (!this.serialSystem) return;
    const outSerials: SerialLine[] = [];
    const inSerials: SerialLine[] = [];
    this.savableLines().forEach(l => {
      const item = (l.ItemNo || '').trim(), batch = l.BatchNo || '';
      (l.Serials || []).forEach(sn => {
        outSerials.push({ ItemNo: item, StoreNo: this.current.FromStore!, BatchNo: batch, SerialNo: sn });
        inSerials.push({ ItemNo: item, StoreNo: this.current.ToStore!, BatchNo: batch, SerialNo: sn });
      });
    });
    const base = {
      DocNo: docNo, VType: this.current.VType!, Myear: this.current.Myear!,
      Branch: this.current.BrNo || 1, DocDate: this.current.TransDate || '',
    };
    // OUT first (validates the serial is in stock at the source), then IN (receive at dest).
    this.serialSvc.save({ ...base, Kind: this.KIND, DocType: this.DOCTYPE, Serials: outSerials }).subscribe({
      next: () => {
        this.serialSvc.save({ ...base, Kind: this.KIND_IN, DocType: this.DOCTYPE_IN, Serials: inSerials }).subscribe({
          next: () => {},
          error: (err) => this.toastr.error(err.error?.message || this.translate.instant('Serials.SaveFailed')),
        });
      },
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('Serials.SaveFailed')),
    });
  }

  /** VB6 serial guard: every item that already has serials must still be in the grid. */
  private async serialItemsIntact(): Promise<boolean> {
    try {
      const rows = await firstValueFrom(this.serialSvc.list(this.current.DocNo!, this.KIND, this.current.VType!, this.current.Myear!));
      const serialItems = new Set((rows || []).map(r => (r.ItemNo || '').trim()).filter(Boolean));
      if (!serialItems.size) return true;
      const gridItems = new Set(this.savableLines().map(l => (l.ItemNo || '').trim()));
      for (const it of serialItems) if (!gridItems.has(it)) return false;
      return true;
    } catch { return true; }
  }
  /** VB6 DeleteSerialTrans guard: block voucher delete while it still has serials. */
  private async voucherHasSerials(): Promise<boolean> {
    try {
      const rows = await firstValueFrom(this.serialSvc.list(this.current.DocNo!, this.KIND, this.current.VType!, this.current.Myear!));
      return (rows?.length || 0) > 0;
    } catch { return false; }
  }

  /** Available qty of the item in the FromStore (source) → line.MaxQty. */
  loadItemStock(line: TransferLine): void {
    const item = (line.ItemNo || '').trim();
    if (!item || !this.current.FromStore) { line.MaxQty = null; return; }
    this.svc.itemStock(item, this.current.TransDate || '').subscribe({
      next: (stores) => {
        const st = (stores || []).find(s => s.StoreNo === this.current.FromStore);
        const ur = +(line.UnitRate || 1) || 1;
        line.MaxQty = st ? st.OnHand / ur : 0;
      },
      error: () => { line.MaxQty = null; },
    });
  }
  setMaxQty(line: TransferLine): void {
    const item = (line.ItemNo || '').trim();
    if (item && this.current.FromStore) this.loadItemStock(line);
  }
  onQtyChange(line: TransferLine): void {
    if (line.MaxQty != null && +(line.Qty || 0) > line.MaxQty) {
      line.Qty = line.MaxQty;
      this.toastr.warning(this.translate.instant('Transfer.QtyExceedsStock', { n: line.MaxQty }));
    }
    this.updateFifoCost(line);   // FIFO cost is qty-dependent
  }

  /** Voucher date changed → availability + issue cost are date-dependent. */
  onDateChange(): void {
    (this.current.Lines || []).forEach(l => { if ((l.ItemNo || '').trim()) { this.loadItemStock(l); this.updateFifoCost(l); } });
  }

  /** Recompute per-line cost from the pristine (FIFO/weighted) cost, then distribute
   *  AdditionalCost proportionally (VB6 Costing). Wcost is adjusted to include the share. */
  recompute(): void {
    const lines = this.current.Lines.filter(l => (l.ItemNo || '').trim());
    lines.forEach(l => {
      const rate = +(l.UnitRate || 1) || 1;
      l.Wcost = +(l.RawWcost || 0);
      l.Cost = (+(l.Wcost || 0)) * rate;
      l.ItemTot = (+(l.Qty || 0)) * (+(l.Cost || 0));
    });
    const add = +(this.current.AdditionalCost || 0);
    const base = lines.reduce((s, l) => s + (+(l.ItemTot || 0)), 0);
    if (add > 0 && base > 0) {
      lines.forEach(l => {
        const qty = +(l.Qty || 0), rate = +(l.UnitRate || 1) || 1;
        if (qty <= 0) return;
        const newTot = (+(l.ItemTot || 0)) + ((+(l.ItemTot || 0)) / base) * add;
        l.Cost = newTot / qty;
        l.Wcost = l.Cost / rate;
        l.ItemTot = newTot;
      });
    }
  }
  onAdditionalCostChange(): void { this.recompute(); }

  addLine(): void { this.current.Lines.push(this.newLine()); }
  removeLine(i: number): void {
    const line = this.current.Lines[i];
    if (this.serialSystem && (line?.Serials?.length || 0) > 0) {
      this.toastr.warning(this.translate.instant('Serials.LineHasSerials'));
      return;
    }
    this.current.Lines.splice(i, 1);
    if (!this.current.Lines.length) this.current.Lines.push(this.newLine());
    this.recompute();
  }

  get totalWeight(): number { return this.current.Lines.reduce((s, l) => s + (+(l.Weight || 0)) * (+(l.Qty || 0)), 0); }
  get grandTotal(): number { return this.current.Lines.reduce((s, l) => s + (+(l.ItemTot || 0)), 0); }

  // ─── احضار (bring by category) ────────────────────────────────
  openBring(): void { this.bringCategory = null; this.showBring = true; }
  closeBring(): void { this.showBring = false; }
  doBring(): void {
    if (!this.bringCategory) { this.toastr.warning(this.translate.instant('Transfer.SelectCategory')); return; }
    this.svc.itemsByCategory(this.bringCategory).subscribe({
      next: (items: TrnCategoryItem[]) => {
        if (!items.length) { this.toastr.info(this.translate.instant('Transfer.NoItemsInCategory')); return; }
        this.current.Lines = items.map(it => ({
          ItemNo: it.ItemNo, ItemName: this.isAr ? it.ItemName : (it.Ename || it.ItemName),
          UnitNo: it.UnitNo, UnitName: this.isAr ? it.UnitName : (it.UnitEname || it.UnitName), UnitRate: it.Operand,
          Qty: null, Weight: null, Wcost: it.DefaultCost ?? 0, RawWcost: it.DefaultCost ?? 0, Cost: 0, ItemTot: 0, ExpDate: '', BatchNo: '',
          AccountNo: this.current.DebitAcc || null, AccountName: this.current.DebitAccName, CostCenter: null, OrderId: '',
          Expired: !!it.Expired, Units: [{ UnitNo: it.UnitNo, UnitName: it.UnitName, Operand: it.Operand }], MaxQty: null,
        } as TransferLine));
        this.current.Lines.forEach(l => this.loadItemStock(l));
        this.recompute();
        this.showBring = false;
        this.toastr.success(this.translate.instant('Transfer.Brought'));
      },
      error: (err) => this.toastr.error(err.error?.message || this.translate.instant('General.Error'))
    });
  }

  // ─── GL entries ───────────────────────────────────────────────
  showGLEntries(): void {
    if (!this.isExisting || !this.current.VType || !this.current.DocNo) { this.toastr.info(this.translate.instant('Transfer.SaveFirstGL')); return; }
    this.glLoading = true; this.glEntries = []; this.showGL = true;
    this.svc.getGL(this.current.VType, this.current.DocNo, this.current.Myear!).subscribe({
      next: (r) => { this.glEntries = r || []; this.glLoading = false; },
      error: (err) => { this.glLoading = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
    });
  }
  closeGL(): void { this.showGL = false; }
  get glDebit(): number { return this.glEntries.reduce((s, e) => s + (+e.Debit || 0), 0); }
  get glCredit(): number { return this.glEntries.reduce((s, e) => s + (+e.Credit || 0), 0); }

  // ─── save / delete / new ──────────────────────────────────────
  private savableLines(): TransferLine[] {
    return this.current.Lines.filter(l => (l.ItemNo || '').trim() && +(l.Qty || 0) > 0);
  }
  private validate(): boolean {
    if (!this.current.VType) { this.toastr.warning(this.translate.instant('Transfer.SelectSerial')); return false; }
    if (!this.current.DocNo?.trim()) { this.toastr.warning(this.translate.instant('Transfer.EnterDocNo')); return false; }
    if (!this.current.FromStore) { this.toastr.warning(this.translate.instant('Transfer.FromStoreRequired')); return false; }
    if (!this.current.ToStore) { this.toastr.warning(this.translate.instant('Transfer.ToStoreRequired')); return false; }
    if (this.current.FromStore === this.current.ToStore) { this.toastr.warning(this.translate.instant('Transfer.SameStore')); return false; }
    const itemLines = this.current.Lines.filter(l => (l.ItemNo || '').trim());
    if (!itemLines.length) { this.toastr.warning(this.translate.instant('Transfer.NoLines')); return false; }
    if (itemLines.some(l => !(+(l.Qty || 0) > 0))) { this.toastr.warning(this.translate.instant('Transfer.QtyRequired')); return false; }
    if (itemLines.some(l => !l.UnitNo)) { this.toastr.warning(this.translate.instant('Transfer.UnitRequired')); return false; }
    if (this.perpetual && itemLines.some(l => !(+(l.AccountNo || 0)))) { this.toastr.warning(this.translate.instant('Transfer.LineAccountRequired')); return false; }
    if (this.serialSystem) {
      const bad = itemLines.find(l => (l.Serials?.length || 0) !== this.baseQty(l));
      if (bad) { this.toastr.warning(this.translate.instant('Serials.LineCountMismatch', { item: bad.ItemNo })); return false; }
    }
    return true;
  }
  async save(): Promise<void> {
    if (!this.validate()) return;
    if (this.serialSystem && this.isExisting && !(await this.serialItemsIntact())) {
      this.toastr.warning(this.translate.instant('Serials.EditBlockedItemsChanged'));
      return;
    }
    this.saving = true;
    const payload: TransferVoucher = { ...this.current, Lines: this.savableLines() };
    this.svc.save(payload).subscribe({
      next: (res) => {
        this.saving = false; this.current.DocNo = res.docNo; this.isExisting = true; this.listLoaded = false;
        this.postSerials(res.docNo);
        this.toastr.success(res.message || this.translate.instant('General.SaveSuccess'));
      },
      error: (err) => { this.saving = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
    });
  }
  async delete(): Promise<void> {
    if (!this.isExisting || !this.current.VType || !this.current.DocNo) return;
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
    this.isExisting = false; this.listLoaded = false;
    if (vtype) this.onSerialChange();
  }

  // ─── print / export ───────────────────────────────────────────
  onExport(): void { if (this.activeTab === 'list') this.printList(); else this.print(); }
  printList(): void {
    const t = (k: string) => this.translate.instant(k);
    const num = (n: any) => (n == null || n === '' ? '' : (+n).toLocaleString());
    const showCost = this.canViewCost;
    const cols = [
      { label: t('Transfer.DocNo') }, { label: t('Transfer.Serial') }, { label: t('Transfer.Date') },
      { label: t('Transfer.FromStore') }, { label: t('Transfer.ToStore') },
      ...(showCost ? [{ label: t('Transfer.GrandTotal') }] : []), { label: t('Transfer.LinesCount') },
    ];
    const rows = this.filteredVouchers.map(v =>
      `<tr><td>${v.DocNo ?? ''}</td><td>${v.VTypeName ?? ''}</td>` +
      `<td>${v.TransDate ? String(v.TransDate).slice(0, 10) : ''}</td>` +
      `<td>${v.FromStoreName ?? ''}</td><td>${v.ToStoreName ?? ''}</td>` + (showCost ? `<td>${num(v.Total)}</td>` : ``) + `<td>${v.Lines ?? ''}</td></tr>`).join('');
    const filtersHtml = `<div class="filter-item"><span class="filter-label">${t('Transfer.Year')}:</span><span class="filter-value">${this.current.Myear ?? ''}</span></div>`;
    this.reportService.printReport(t('Transfer.ListTab'), cols, rows, filtersHtml);
  }
  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const num = (n: any) => (n == null || n === '' ? '' : (+n).toLocaleString());
    const lines = this.current.Lines.filter(l => (l.ItemNo || '').trim());
    const showCost = this.canViewCost;
    const cols = [
      { label: t('Transfer.ItemCode') }, { label: t('Transfer.ItemName') }, { label: t('Transfer.Unit') },
      { label: t('Transfer.Qty') },
      ...(showCost ? [{ label: t('Transfer.Cost') }, { label: t('Transfer.Total') }] : []),
      { label: t('Transfer.Expiry') }, { label: t('Transfer.Batch') },
    ];
    const rows = lines.map(l =>
      `<tr><td>${l.ItemNo ?? ''}</td><td>${l.ItemName ?? ''}</td><td>${l.UnitName ?? ''}</td>` +
      `<td>${num(l.Qty)}</td>` + (showCost ? `<td>${num(l.Cost)}</td><td>${num(l.ItemTot)}</td>` : ``) +
      `<td>${l.ExpDate ?? ''}</td><td>${l.BatchNo ?? ''}</td></tr>`).join('');
    const totRow = showCost
      ? `<tr style="font-weight:700;background:#eef2ff"><td colspan="5" style="text-align:end">${t('Transfer.GrandTotal')}</td><td>${num(this.grandTotal)}</td><td colspan="2"></td></tr>`
      : '';
    const fi = (label: string, val: any) => `<div class="filter-item"><span class="filter-label">${label}:</span><span class="filter-value">${val ?? ''}</span></div>`;
    const filtersHtml =
      fi(t('Transfer.DocNo'), this.current.DocNo) + fi(t('Transfer.Serial'), this.current.VTypeName) +
      fi(t('Transfer.Date'), this.current.TransDate) + fi(t('Transfer.FromStore'), this.current.FromStoreName) +
      fi(t('Transfer.ToStore'), this.current.ToStoreName) + fi(t('Transfer.Year'), this.current.Myear) +
      fi(t('Transfer.Notes'), this.current.Des);
    const footerHtml = showCost ? `<b>${t('Transfer.GrandTotal')}:</b> ${num(this.grandTotal)}` : '';
    this.reportService.printReport(t('Transfer.Title'), cols, rows + totRow, filtersHtml, footerHtml);
  }
}
