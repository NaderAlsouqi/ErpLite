import { Component, ElementRef, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalConfig, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CostCenterDto, CostCenterService } from '../../../shared/services/cost-center.service';
import { ReportService } from '../../../shared/services/report.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { forkJoin } from 'rxjs';

export interface CostCenterNode {
  data: CostCenterDto;
  expanded: boolean;
  hasChildren: boolean;
}

export interface CcInlineRow {
  _tempId?: number;
  CcntrNo: number;
  CcAname: string;
  Ccename: string;
  belong: number | null;
  level: number | null;
  accorder: string | null;
  fatherorder: string | null;
  branch: number | null;
  bb: number | null;
  CurNo: number | null;
  LRate: number | null;
  budgetF: number | null;
  ProfL: number | null;
  total: number | null;
  balance1: number | null;
}

export interface DisplayItem {
  kind: 'existing' | 'new';
  node?: CostCenterNode;
  row?: CcInlineRow;
}

@Component({
  selector: 'app-clear-cost-centers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgbModule,
    NgSelectModule,
    ConfirmationModalComponent,
  ],
  providers: [NgbModalConfig, NgbModal],
  templateUrl: './clear-cost-centers.component.html',
  styleUrl: './clear-cost-centers.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ClearCostCentersComponent implements OnInit {
  @ViewChild('clearModal') clearModalTpl!: TemplateRef<any>;
  @ViewChild('transferConfirmModal') transferConfirmModal!: ConfirmationModalComponent;

  allData: CostCenterDto[] = [];
  private nodeMap     = new Map<number, CostCenterNode>();
  private childrenMap = new Map<number, CostCenterNode[]>();
  visibleNodes: CostCenterNode[] = [];
  focusedNode: CostCenterNode | null = null;

  loading = false;
  saving  = false;
  submitted = false;
  pendingTransferRow: CcInlineRow | null = null;
  searchTerm  = '';
  searchMode  = false;
  searchResults: CostCenterNode[] = [];

  pendingFromNode: CostCenterNode | null = null;
  targetCcntrNo: number | null = null;
  flatList: CostCenterDto[] = [];

  // ── Inline editing state ────────────────────────────────────────────────────
  editingRows: { [no: number]: CcInlineRow } = {};
  newRows: CcInlineRow[] = [];
  private nextTempId = -1;

  // Stored display list — rebuilt explicitly, never computed as a getter
  displayItems: DisplayItem[] = [];

  private modalRef!: NgbModalRef;

  constructor(
    private costCenterService: CostCenterService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private reportService: ReportService,
    private el: ElementRef<HTMLElement>,
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.costCenterService.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.flatList = [...data].sort((a, b) => (a.CcntrNo ?? 0) - (b.CcntrNo ?? 0));
        this.buildTree();
        this.buildVisibleList();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Tree Building ───────────────────────────────────────────────────────────

  private buildTree(): void {
    this.nodeMap.clear();
    this.childrenMap.clear();

    for (const cc of this.allData) {
      this.nodeMap.set(cc.CcntrNo, { data: cc, expanded: false, hasChildren: false });
    }

    for (const cc of this.allData) {
      const parentKey = (cc.belong && cc.belong > 0) ? cc.belong : 0;
      if (!this.childrenMap.has(parentKey)) this.childrenMap.set(parentKey, []);
      const node = this.nodeMap.get(cc.CcntrNo);
      if (node) this.childrenMap.get(parentKey)!.push(node);
    }

    for (const [, children] of this.childrenMap) {
      children.sort((a, b) => (a.data.CcntrNo ?? 0) - (b.data.CcntrNo ?? 0));
    }

    for (const [parentKey, children] of this.childrenMap) {
      if (parentKey !== 0 && children.length > 0) {
        const parentNode = this.nodeMap.get(parentKey);
        if (parentNode) parentNode.hasChildren = true;
      }
    }
  }

  private buildVisibleList(): void {
    const result: CostCenterNode[] = [];
    if (this.focusedNode) {
      result.push(this.focusedNode);
      if (this.focusedNode.expanded && this.focusedNode.hasChildren) {
        this.traverseVisible(this.focusedNode.data.CcntrNo, result);
      }
    } else {
      this.traverseVisible(0, result);
    }
    this.visibleNodes = result;
    this.rebuildDisplayItems();
  }

  private traverseVisible(parentKey: number, result: CostCenterNode[]): void {
    const children = this.childrenMap.get(parentKey) || [];
    for (const node of children) {
      result.push(node);
      if (node.expanded && node.hasChildren) {
        this.traverseVisible(node.data.CcntrNo, result);
      }
    }
  }

  // ── Tree Interactions ───────────────────────────────────────────────────────

  toggleExpand(node: CostCenterNode, event: Event): void {
    event.stopPropagation();
    const expanding = !node.expanded;
    node.expanded = expanding;
    if (expanding) {
      this.focusedNode = node;
    } else if (this.focusedNode === node) {
      this.focusedNode = null;
    }
    this.buildVisibleList();
  }

  expandAll(): void {
    for (const [, node] of this.nodeMap) {
      if (node.hasChildren) node.expanded = true;
    }
    this.buildVisibleList();
  }

  collapseAll(): void {
    for (const [, node] of this.nodeMap) {
      node.expanded = false;
    }
    this.focusedNode = null;
    this.buildVisibleList();
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.searchMode = false;
      this.buildVisibleList();
      return;
    }
    this.searchMode = true;
    this.searchResults = [];
    for (const [, node] of this.nodeMap) {
      const d = node.data;
      if (
        d.CcAname?.toLowerCase().includes(term) ||
        d.Ccename?.toLowerCase().includes(term) ||
        d.CcntrNo?.toString().includes(term)
      ) {
        this.searchResults.push(node);
      }
    }
    this.rebuildDisplayItems();
  }

  get displayedNodes(): CostCenterNode[] {
    return this.searchMode ? this.searchResults : this.visibleNodes;
  }

  getIndent(node: CostCenterNode): number {
    return ((node.data.level ?? 1) - 1) * 20;
  }

  // ── Display Items — rebuilt explicitly, never recomputed as a getter ─────────

  private rebuildDisplayItems(): void {
    const result: DisplayItem[] = [];
    const inserted = new Set<number>();

    for (const node of this.displayedNodes) {
      result.push({ kind: 'existing', node });
      for (const row of this.newRows) {
        if (row.belong === node.data.CcntrNo && row._tempId != null) {
          result.push({ kind: 'new', row });
          inserted.add(row._tempId);
        }
      }
    }

    // Orphan new rows (no parent set, or parent not visible in current tree)
    for (const row of this.newRows) {
      if (row._tempId != null && !inserted.has(row._tempId)) {
        result.push({ kind: 'new', row });
      }
    }

    this.displayItems = result;
  }

  trackByDisplayItem(_: number, item: DisplayItem): string {
    return item.kind === 'existing'
      ? `e-${item.node!.data.CcntrNo}`
      : `n-${item.row!._tempId}`;
  }

  get isDirty(): boolean {
    return Object.keys(this.editingRows).length > 0 || this.newRows.length > 0;
  }

  // ── Inline: Add New Row ─────────────────────────────────────────────────────

  addNewRow(parentNode?: CostCenterNode): void {
    const parent = parentNode?.data ?? null;
    const nextNo = this.getNextCcntrNo();
    const row: CcInlineRow = {
      _tempId: this.nextTempId--,
      CcntrNo: nextNo,
      CcAname: `مركز كلفة ${nextNo}`,
      Ccename: `Cost Center ${nextNo}`,
      belong: parent?.CcntrNo ?? null,
      level: parent != null ? (parent.level ?? 1) + 1 : 1,
      accorder: null,
      fatherorder: parent?.accorder ?? null,
      branch: 0,
      bb: 0,
      CurNo: 1,
      LRate: 1,
      budgetF: null,
      ProfL: null,
      total: null,
      balance1: null,
    };
    this.generateAccorderForDraft(row, row.belong);
    this.newRows = [...this.newRows, row];
    this.rebuildDisplayItems();
    setTimeout(() => {
      const rows = this.el.nativeElement.querySelectorAll<HTMLInputElement>('tr.row-new input[type="number"]');
      if (rows.length > 0) rows[rows.length - 1].focus();
    });
  }

  private getNextCcntrNo(): number {
    const savedMax   = this.allData.reduce((m, cc) => Math.max(m, cc.CcntrNo ?? 0), 0);
    const pendingMax = this.newRows.reduce((m, r)  => Math.max(m, r.CcntrNo  ?? 0), 0);
    return Math.max(savedMax, pendingMax) + 1;
  }

  removeNewRow(tempId: number): void {
    this.newRows = this.newRows.filter(r => r._tempId !== tempId);
    this.rebuildDisplayItems();
  }

  // ── Inline: Edit Existing Row ───────────────────────────────────────────────

  startEdit(data: CostCenterDto): void {
    this.editingRows = {
      ...this.editingRows,
      [data.CcntrNo]: {
        _tempId: undefined,
        CcntrNo: data.CcntrNo,
        CcAname: data.CcAname ?? '',
        Ccename: data.Ccename ?? '',
        belong: data.belong ?? null,
        level: data.level ?? null,
        accorder: data.accorder ?? null,
        fatherorder: data.fatherorder ?? null,
        branch: data.branch ?? null,
        bb: data.bb ?? null,
        CurNo: data.CurNo ?? null,
        LRate: data.LRate ?? null,
        budgetF: data.budgetF ?? null,
        ProfL: data.ProfL ?? null,
        total: data.total ?? null,
        balance1: data.balance1 ?? null,
      },
    };
  }

  cancelEdit(no: number): void {
    const updated = { ...this.editingRows };
    delete updated[no];
    this.editingRows = updated;
  }

  // ── Inline: Belong changed — update level and fatherorder ────────────────────

  onBelongChange(row: CcInlineRow): void {
    if (!row.belong || row.belong <= 0) {
      row.level = 1;
      row.fatherorder = '';
    } else {
      const parent = this.allData.find(cc => cc.CcntrNo === row.belong);
      if (parent) {
        row.level = (parent.level ?? 1) + 1;
        row.fatherorder = parent.accorder ?? '';
      } else {
        row.level = 1;
        row.fatherorder = '';
      }
    }
    this.generateAccorderForDraft(row, row.belong);
  }

  private generateAccorderForDraft(draft: CcInlineRow, parentNo: number | null): void {
    if (!parentNo || parentNo <= 0) {
      // VB6 GetMaxOrder logic
      let maxId = 0;
      let lastAccorder = '';

      const allItems = [...this.allData, ...this.newRows.filter(nr => nr !== draft)];
      for (const item of allItems) {
        const id = (item as any).CcntrNo ?? 0;
        if (id > maxId) {
          maxId = id;
          lastAccorder = (item as any).accorder ?? '';
        }
      }

      if (!lastAccorder || lastAccorder.trim() === '' || lastAccorder.trim() === 'Z') {
        draft.accorder = 'AA';
      } else {
        const prefix = lastAccorder.substring(0, 2).toUpperCase();
        draft.accorder = this.getNextAlphaOrder(prefix);
      }
      draft.fatherorder = null;
      return;
    }

    const parentNode = this.nodeMap.get(parentNo);
    const parentAccorder = parentNode?.data.accorder ?? String(Math.round(parentNo));
    draft.fatherorder = parentAccorder;

    let maxChildIdx = 0;
    const allSiblings = [
      ...this.allData.filter(cc => cc.belong === parentNo),
      ...this.newRows.filter(nr => nr !== draft && nr.belong === parentNo)
    ];

    for (const cc of allSiblings) {
      if (!cc.accorder) continue;
      const parts = cc.accorder.split('-');
      const lastPart = parts[parts.length - 1];
      const n = parseInt(lastPart, 10);
      if (!isNaN(n) && n > maxChildIdx) maxChildIdx = n;
    }

    draft.accorder = `${parentAccorder}-${maxChildIdx + 1}`;
  }

  private getNextAlphaOrder(current: string): string {
    if (current.length < 2) return 'AA';
    const c1 = current.charCodeAt(0);
    const c2 = current.charCodeAt(1);

    if (c2 < 90) { // 'Z'
      return String.fromCharCode(c1) + String.fromCharCode(c2 + 1);
    } else {
      if (c1 < 90) {
        return String.fromCharCode(c1 + 1) + 'A';
      } else {
        return 'AA'; // Reset or fallback
      }
    }
  }

  // ── Inline: Save New Row ────────────────────────────────────────────────────

  saveNewRow(row: CcInlineRow): void {
    this.submitted = true;
    if (!row.CcAname?.trim() || !row.Ccename?.trim() || !row.CcntrNo || isNaN(row.CcntrNo) || row.CcntrNo <= 0) return;

    // VB6 Warning: If branching (clearing) a leaf that has transactions
    if (row.belong && row.belong > 0) {
      this.costCenterService.hasTransactions(row.belong).subscribe({
        next: (res) => {
          if (res.hasTransactions) {
            this.pendingTransferRow = row;
            const parent = this.allData.find(cc => cc.CcntrNo === row.belong);
            this.transferConfirmModal.message = this.translate.instant('CostCenters.ConfirmTransferTransactions', {
              from: parent?.CcAname ?? row.belong,
              to: row.CcAname
            });
            this.transferConfirmModal.show();
          } else {
            this.executeSaveNewRow(row);
          }
        },
        error: () => this.executeSaveNewRow(row)
      });
    } else {
      this.executeSaveNewRow(row);
    }
  }

  onConfirmTransfer(): void {
    if (!this.pendingTransferRow) return;
    this.executeSaveNewRow(this.pendingTransferRow, true);
    this.pendingTransferRow = null;
  }

  onCancelTransfer(): void {
    this.pendingTransferRow = null;
  }

  private executeSaveNewRow(row: CcInlineRow, shouldTransfer: boolean = false): void {
    this.saving = true;
    const dto: CostCenterDto = {
      CcntrNo: row.CcntrNo,
      CcAname: row.CcAname.trim(),
      Ccename: row.Ccename.trim(),
      belong: row.belong ?? 0,
      level: row.level ?? 1,
      accorder: row.accorder,
      fatherorder: row.fatherorder ?? '',
      branch: 0,
      bb: row.bb ?? 0,
      CurNo: row.CurNo ?? 1,
      LRate: row.LRate ?? 1,
      budgetF: row.budgetF,
      ProfL: row.ProfL,
      total: row.total,
      balance1: row.balance1,
    };

    this.costCenterService.add(dto).subscribe({
      next: (added) => {
        this.toastr.success(this.translate.instant('CostCenters.AddSuccess'));
        this.removeNewRow(row._tempId!);
        this.submitted = false;

        const newId = added?.CcntrNo;
        if (shouldTransfer && newId && row.belong) {
          this.costCenterService.transferTransactions(row.belong, newId).subscribe({
            next: () => {
              this.toastr.info(this.translate.instant('CostCenters.TransactionsTransferred', { from: row.belong, to: newId }));
              this.syncParentStatus(row.belong, true, null, () => this.loadData());
            },
            error: () => this.syncParentStatus(row.belong, true, null, () => this.loadData())
          });
        } else {
          this.syncParentStatus(row.belong, true, null, () => this.loadData());
        }
        this.saving = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.saving = false;
      },
    });
  }

  /**
   * Updates parent branch and fatherorder status.
   * @param parentNo The parent to check
   * @param isChildAdded True if we just added/moved a child TO this parent
   * @param childMovedFromNo The ID of the child that was moved FROM this parent (if any)
   * @param onDone Callback
   */
  private syncParentStatus(parentNo: number | null, isChildAdded: boolean, childMovedFromNo: number | null, onDone: () => void): void {
    if (!parentNo || parentNo <= 0) { onDone(); return; }

    const parent = this.allData.find(cc => cc.CcntrNo === parentNo);
    if (!parent) { onDone(); return; }

    // 1. Determine shouldBeBranch
    let shouldBeBranch = 0;
    if (isChildAdded) {
      shouldBeBranch = 1;
    } else {
      // Counting children excluding the one being moved away
      const currentChildren = this.allData.filter(cc => cc.belong === parentNo);
      const remainingCount = currentChildren.filter(cc => cc.CcntrNo !== childMovedFromNo).length;
      shouldBeBranch = remainingCount > 0 ? 1 : 0;
    }

    // 2. Determine fatherorder if missing
    const grandparent = (parent.belong && parent.belong > 0)
      ? this.allData.find(cc => cc.CcntrNo === parent.belong)
      : null;
    const shouldBeFatherOrder = parent.fatherorder && parent.fatherorder.trim() 
      ? parent.fatherorder 
      : (grandparent?.accorder?.trim() ?? '');

    // 3. Update if needed
    if (parent.branch !== shouldBeBranch || parent.fatherorder !== shouldBeFatherOrder) {
      const updated: CostCenterDto = {
        ...parent,
        branch: shouldBeBranch,
        fatherorder: shouldBeFatherOrder
      };
      this.costCenterService.update(parent.CcntrNo, updated).subscribe({
        next: () => onDone(),
        error: () => onDone()
      });
    } else {
      onDone();
    }
  }

  // ── Inline: Save Edited Row ─────────────────────────────────────────────────
  // When belong changes → level is already auto-updated by onBelongChange().
  // After save, loadData() rebuilds the tree so hasChildren reflects reality.

  saveEditedRow(no: number): void {
    this.submitted = true;
    const row = this.editingRows[no];
    if (!row) return;
    if (!row.CcAname?.trim() || !row.Ccename?.trim()) return;

    const dto: CostCenterDto = {
      CcntrNo: row.CcntrNo,
      CcAname: row.CcAname.trim(),
      Ccename: row.Ccename.trim(),
      belong: row.belong,
      level: row.level,
      accorder: row.accorder,
      fatherorder: row.fatherorder,
      branch: row.branch,
      bb: row.bb,
      CurNo: row.CurNo,
      LRate: row.LRate,
      budgetF: row.budgetF,
      ProfL: row.ProfL,
      total: row.total,
      balance1: row.balance1,
    };

    this.saving = true;
    const original = this.allData.find(cc => cc.CcntrNo === no);
    const oldParentNo = original?.belong ?? null;

    this.costCenterService.update(no, dto).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('CostCenters.UpdateSuccess'));
        this.cancelEdit(no);
        this.submitted = false;
        
        // Sync both parents
        const newParentNo = dto.belong ?? null;
        if (newParentNo !== oldParentNo) {
          this.syncParentStatus(newParentNo, true, null, () => {
            this.syncParentStatus(oldParentNo, false, no, () => {
              this.loadData();
              this.saving = false;
            });
          });
        } else {
          // Parent didn't change, but it might still need its first branch=1 set
          this.syncParentStatus(newParentNo, true, null, () => {
            this.loadData();
            this.saving = false;
          });
        }
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.saving = false;
      },
    });
  }

  // ── Clear Operation ─────────────────────────────────────────────────────────

  initiateClear(node: CostCenterNode): void {
    this.pendingFromNode = node;
    this.targetCcntrNo  = null;
    this.modalRef = this.modalService.open(this.clearModalTpl, {
      centered: true,
      size: 'md',
      windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  confirmClear(): void {
    if (!this.targetCcntrNo) {
      this.toastr.warning(this.translate.instant('ClearCostCenters.SelectTarget'));
      return;
    }
    if (this.pendingFromNode?.data.CcntrNo === this.targetCcntrNo) {
      this.toastr.warning(this.translate.instant('ClearCostCenters.SameCenter'));
      return;
    }
    this.saving = true;
    this.costCenterService.clearCostCenter(
      this.pendingFromNode!.data.CcntrNo,
      this.targetCcntrNo
    ).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('ClearCostCenters.Success'));
        this.saving = false;
        this.modalRef?.close();
        this.pendingFromNode = null;
        this.targetCcntrNo  = null;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('ClearCostCenters.Error'));
        this.saving = false;
      },
    });
  }

  cancelClear(): void {
    this.pendingFromNode = null;
    this.targetCcntrNo  = null;
    this.modalRef?.close();
  }

  printTable(): void {
    const title = this.translate.instant('ClearCostCenters.Title');
    const cols = [
      { label: this.translate.instant('ClearCostCenters.CcntrNo') },
      { label: this.translate.instant('ClearCostCenters.ArabicName') },
      { label: this.translate.instant('ClearCostCenters.EnglishName') },
      { label: this.translate.instant('ClearCostCenters.Level') },
      { label: this.translate.instant('ClearCostCenters.Belong') },
    ];
    const nodes = this.searchMode ? this.searchResults : this.visibleNodes;
    const rows = nodes.map(n =>
      `<tr><td>${n.data.CcntrNo}</td><td>${n.data.CcAname ?? '—'}</td><td>${n.data.Ccename ?? '—'}</td><td>${n.data.level ?? '—'}</td><td>${n.data.belong ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(title, cols, rows);
  }
}
