import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { NgSelectModule } from '@ng-select/ng-select';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ReportService } from '../../../shared/services/report.service';
import { CostCenterDto, CostCenterService } from '../../../shared/services/cost-center.service';
import { ComfService } from '../../../shared/services/comf.service';
import { AccountingStateService } from '../../../shared/services/accounting-state.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { forkJoin } from 'rxjs';

export interface AccountNode {
  data: ChartOfAccountDto;
  expanded: boolean;
  hasChildren: boolean;
}

export interface InlineRow extends ChartOfAccountDto {
  _tempId?: number;
  _creditInput: number | null;
  _debitInput: number | null;
}

export interface DisplayItem {
  kind: 'existing' | 'new';
  node?: AccountNode;
  row?: InlineRow;
}

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgbModule,
    MatPaginatorModule,
    NgSelectModule,
    ConfirmationModalComponent,
  ],
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChartOfAccountsComponent implements OnInit {
  @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('transferConfirmModal') transferConfirmModal!: ConfirmationModalComponent;
  @ViewChild('deleteConfirmModal') deleteConfirmModal!: ConfirmationModalComponent;

  allData: ChartOfAccountDto[] = [];
  private nodeMap = new Map<number, AccountNode>();
  private childrenMap = new Map<number, AccountNode[]>();

  // Tree mode
  visibleNodes: AccountNode[] = [];
  focusedNode: AccountNode | null = null;

  // Search / flat mode
  searchMode = false;
  searchResults: AccountNode[] = [];
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 0;
  totalItems = 0;
  paginatedSearchResults: AccountNode[] = [];

  loading = false;
  searchTerm = '';
  costCenters: CostCenterDto[] = [];
  private firstCcntrNo: number | null = null;

  // ── Subtotals (account + all descendants) ────────────────────────────────
  subtotalMap = new Map<number, { credit: number; debit: number }>();

  // ── Inline editing state ──────────────────────────────────────────────────
  editingRows: { [no: number]: InlineRow } = {};
  newRows: InlineRow[] = [];
  private nextTempId = -1;
  submitted = false;
  private pendingParentsToTransfer: number[] = [];
  pendingDeleteNo: number | null = null;
  deleting = false;

  constructor(
    private accountsService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
    private costCenterService: CostCenterService,
    private comfService: ComfService,
    private accountingState: AccountingStateService,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.costCenterService.getAll().subscribe(data => {
      const sorted = data.sort((a, b) => (a.CcntrNo ?? 0) - (b.CcntrNo ?? 0));
      this.costCenters = sorted;
      this.firstCcntrNo = sorted.length > 0 ? (sorted[0].CcntrNo ?? null) : null;
    });
  }

  get isDirty(): boolean {
    return Object.keys(this.editingRows).length > 0 || this.newRows.length > 0;
  }

  get editingCount(): number {
    return Object.keys(this.editingRows).length;
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    this.accountsService.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.buildTree();
        this.computeSubtotals();
        this.buildVisibleList();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Tree Building ─────────────────────────────────────────────────────────

  private buildTree(): void {
    this.nodeMap.clear();
    this.childrenMap.clear();

    for (const acc of this.allData) {
      this.nodeMap.set(acc.no, { data: acc, expanded: false, hasChildren: false });
    }

    for (const acc of this.allData) {
      const parentKey = (acc.belong && acc.belong > 0) ? acc.belong : 0;
      if (!this.childrenMap.has(parentKey)) {
        this.childrenMap.set(parentKey, []);
      }
      const node = this.nodeMap.get(acc.no);
      if (node) this.childrenMap.get(parentKey)!.push(node);
    }

    for (const [, children] of this.childrenMap) {
      children.sort((a, b) => a.data.no - b.data.no);
    }

    for (const [parentKey, children] of this.childrenMap) {
      if (parentKey !== 0 && children.length > 0) {
        const parentNode = this.nodeMap.get(parentKey);
        if (parentNode) parentNode.hasChildren = true;
      }
    }
  }

  private computeSubtotals(): void {
    const bbOf      = new Map<number, number>();
    const childrenOf = new Map<number, number[]>();

    for (const acc of this.allData) {
      bbOf.set(acc.no, acc.bb != null ? acc.bb : 0);
      const belong = acc.belong;
      if (belong != null && belong > 0) {
        if (!childrenOf.has(belong)) childrenOf.set(belong, []);
        childrenOf.get(belong)!.push(acc.no);
      }
    }

    const collectAll = (no: number, visited = new Set<number>()): number[] => {
      if (visited.has(no)) return [];
      visited.add(no);
      const nodes: number[] = [no];
      for (const child of (childrenOf.get(no) ?? [])) {
        nodes.push(...collectAll(child, visited));
      }
      return nodes;
    };

    this.subtotalMap.clear();
    for (const acc of this.allData) {
      const group = collectAll(acc.no);
      let credit = 0, debit = 0;
      for (const no of group) {
        const bb = bbOf.get(no) ?? 0;
        if (bb < 0)      credit += Math.abs(bb);
        else if (bb > 0) debit  += bb;
      }
      this.subtotalMap.set(acc.no, { credit, debit });
    }
  }

  private buildVisibleList(): void {
    const result: AccountNode[] = [];
    if (this.focusedNode) {
      result.push(this.focusedNode);
      if (this.focusedNode.expanded && this.focusedNode.hasChildren) {
        this.traverseVisible(this.focusedNode.data.no, result);
      }
    } else {
      this.traverseVisible(0, result);
    }
    this.visibleNodes = result;
  }

  private traverseVisible(parentKey: number, result: AccountNode[]): void {
    const children = this.childrenMap.get(parentKey) || [];
    for (const node of children) {
      result.push(node);
      if (node.expanded && node.hasChildren) {
        this.traverseVisible(node.data.no, result);
      }
    }
  }

  // ── Tree Interactions ─────────────────────────────────────────────────────

  toggleExpand(node: AccountNode, event: Event): void {
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

  getIndent(node: AccountNode): number {
    return (node.data.level ?? 0) * 22;
  }

  // ── Search ────────────────────────────────────────────────────────────────

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      this.searchMode = true;
      const filtered = this.allData.filter(a =>
        a.name?.toLowerCase().includes(term) ||
        a.Ename?.toLowerCase().includes(term) ||
        a.no?.toString().includes(term)
      );
      this.searchResults = filtered.map(d => ({
        data: d,
        expanded: false,
        hasChildren: this.nodeMap.get(d.no)?.hasChildren ?? false,
      }));
      this.totalItems = this.searchResults.length;
      this.pageIndex = 0;
      this.applySearchPagination();
    } else {
      this.searchMode = false;
      this.buildVisibleList();
    }
  }

  private applySearchPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.paginatedSearchResults = this.searchResults.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applySearchPagination();
  }

  get currentRows(): AccountNode[] {
    return this.searchMode ? this.paginatedSearchResults : this.visibleNodes;
  }

  get displayRows(): DisplayItem[] {
    const result: DisplayItem[] = [];
    const inserted = new Set<number>();

    for (const node of this.currentRows) {
      result.push({ kind: 'existing', node });
      // Insert new rows whose parent is this node, right below it
      for (const row of this.newRows) {
        if (row.belong === node.data.no && row._tempId != null) {
          result.push({ kind: 'new', row });
          inserted.add(row._tempId);
        }
      }
    }

    // Append orphan new rows (no parent, or parent not visible in current list)
    for (const row of this.newRows) {
      if (row._tempId != null && !inserted.has(row._tempId)) {
        result.push({ kind: 'new', row });
      }
    }

    return result;
  }

  /** Totals based on VISIBLE rows only */
  get totalCredit(): number {
    let sum = 0;
    for (const item of this.displayRows) {
      const bb = item.kind === 'existing' ? (item.node!.data.bb ?? 0)
                                          : (item.row!.bb ?? 0);
      if (bb < 0) sum += Math.abs(bb);
    }
    return sum;
  }

  get totalDebit(): number {
    let sum = 0;
    for (const item of this.displayRows) {
      const bb = item.kind === 'existing' ? (item.node!.data.bb ?? 0)
                                          : (item.row!.bb ?? 0);
      if (bb > 0) sum += bb;
    }
    return sum;
  }

  /** Visible totals after applying pending edits + new rows */
  get pendingTotalCredit(): number {
    let sum = 0;
    for (const item of this.displayRows) {
      if (item.kind === 'existing') {
        const no = item.node!.data.no;
        const bb = (this.editingRows[no]?.bb ?? item.node!.data.bb ?? 0);
        if (bb < 0) sum += Math.abs(bb);
      } else {
        if ((item.row!.bb ?? 0) < 0) sum += Math.abs(item.row!.bb ?? 0);
      }
    }
    return sum;
  }

  get pendingTotalDebit(): number {
    let sum = 0;
    for (const item of this.displayRows) {
      if (item.kind === 'existing') {
        const no = item.node!.data.no;
        const bb = (this.editingRows[no]?.bb ?? item.node!.data.bb ?? 0);
        if (bb > 0) sum += bb;
      } else {
        if ((item.row!.bb ?? 0) > 0) sum += item.row!.bb ?? 0;
      }
    }
    return sum;
  }

  get isBalanced(): boolean {
    const c = this.isDirty ? this.pendingTotalCredit : this.totalCredit;
    const d = this.isDirty ? this.pendingTotalDebit  : this.totalDebit;
    return Math.abs(c - d) < 0.001;
  }

  get balanceDiff(): number {
    return Math.abs(this.pendingTotalCredit - this.pendingTotalDebit);
  }

  private validateParentBalance(): { valid: boolean; violatingParents: string[] } {
    // ── Step 1: effective bb & children — mirrors computeSubtotals() ───────
    //    but applies pending edits and new rows on top of saved data
    const bbOf       = new Map<number, number>();
    const childrenOf = new Map<number, number[]>();
    const belongOf   = new Map<number, number | null>();

    for (const acc of this.allData) {
      const draft  = this.editingRows[acc.no];
      const bb     = draft != null ? (draft.bb     != null ? draft.bb     : 0)
                                   : (acc.bb       != null ? acc.bb       : 0);
      const belong = draft != null ? (draft.belong != null ? draft.belong : null)
                                   : (acc.belong   != null ? acc.belong   : null);
      bbOf.set(acc.no, bb);
      belongOf.set(acc.no, belong);
      if (belong != null && belong > 0) {
        if (!childrenOf.has(belong)) childrenOf.set(belong, []);
        childrenOf.get(belong)!.push(acc.no);
      }
    }
    for (const row of this.newRows) {
      if (row.no > 0) {
        bbOf.set(row.no, row.bb != null ? row.bb : 0);
        const belong = row.belong != null ? row.belong : null;
        belongOf.set(row.no, belong);
        if (belong != null && belong > 0) {
          if (!childrenOf.has(belong)) childrenOf.set(belong, []);
          childrenOf.get(belong)!.push(row.no);
        }
      }
    }

    // ── Step 2: collect node + ALL descendants (cycle-safe) ───────────────
    const collectAll = (no: number, visited = new Set<number>()): number[] => {
      if (visited.has(no)) return [];
      visited.add(no);
      const nodes: number[] = [no];
      for (const child of (childrenOf.get(no) ?? [])) {
        nodes.push(...collectAll(child, visited));
      }
      return nodes;
    };

    // ── Step 3: compute effective subtotal for every account ──────────────
    //    (same formula as computeSubtotals / the new table columns)
    const effectiveSub = new Map<number, { credit: number; debit: number }>();
    for (const no of bbOf.keys()) {
      const group = collectAll(no);
      let credit = 0, debit = 0;
      for (const n of group) {
        const bb = bbOf.get(n) ?? 0;
        if (bb < 0)      credit += Math.abs(bb);
        else if (bb > 0) debit  += bb;
      }
      effectiveSub.set(no, { credit, debit });
    }

    // ── Step 4: find ancestors of every changed account ───────────────────
    //    Only check parents that are in the lineage of an edit or new row.
    //    Pre-existing imbalances elsewhere in the tree are not our concern.
    const changedNos = new Set<number>();
    for (const noStr of Object.keys(this.editingRows)) changedNos.add(Number(noStr));
    for (const row of this.newRows) { if (row.no > 0) changedNos.add(row.no); }

    const affectedAncestors = new Set<number>();
    for (const no of changedNos) {
      let curr = belongOf.get(no);
      while (curr != null && curr > 0) {
        affectedAncestors.add(curr);
        curr = belongOf.get(curr) ?? null;
      }
    }

    // ── Step 5: flag only ROOT ancestors whose subtotal is unbalanced ──────
    //    An account is a "root" if it has no parent (belong is null/0).
    //    Child accounts — even those that are parents themselves — are excluded.
    const violating: string[] = [];
    for (const parentNo of affectedAncestors) {
      const ownParent = belongOf.get(parentNo);
      if (ownParent != null && ownParent > 0) continue; // skip non-root ancestors
      if (!childrenOf.has(parentNo)) continue;           // skip leaf accounts
      const sub = effectiveSub.get(parentNo);
      if (sub && Math.abs(sub.credit - sub.debit) > 0.001) {
        const name = this.editingRows[parentNo]?.name
          ?? this.nodeMap.get(parentNo)?.data.name
          ?? String(parentNo);
        violating.push(name);
      }
    }

    return { valid: violating.length === 0, violatingParents: violating };
  }

  // ── Balance Helpers ───────────────────────────────────────────────────────

  isCredit(fBb: number | null | undefined): boolean {
    return (fBb ?? 0) < 0;
  }

  isDebit(fBb: number | null | undefined): boolean {
    return (fBb ?? 0) > 0;
  }

  // ── Inline Editing ────────────────────────────────────────────────────────

  startEdit(data: ChartOfAccountDto): void {
    const bb = data.bb ?? 0;
    this.editingRows = {
      ...this.editingRows,
      [data.no]: {
        ...data,
        _creditInput: bb < 0 ? Math.abs(bb) : null,
        _debitInput:  bb > 0 ? bb : null,
      },
    };
    this.accountingState.setChartOfAccountsDirty(true);
  }

  cancelEdit(no: number): void {
    const updated = { ...this.editingRows };
    delete updated[no];
    this.editingRows = updated;
    this.accountingState.setChartOfAccountsDirty(this.isDirty);
  }

  addNewRow(parentData?: ChartOfAccountDto): void {
    const tempId = this.nextTempId--;
    const row: InlineRow = {
      no: 0, name: '', Ename: '',
      belong: parentData?.no ?? null,
      branch: 0, bb: 0,
      level: parentData != null ? (parentData.level ?? 0) + 1 : null,
      balance1: 0, accorder: null, fatherorder: null,
      CurNo: 1, LRate: 1, CcntrNo: this.firstCcntrNo,
      budgetF: 0, ProfL: 0, BB_Tr: 0, br_no: null, f_bb: 0,
      Stopped: null, Celing: null,
      _tempId: tempId,
      _creditInput: null,
      _debitInput: null,
    };
    if (parentData) {
      this.generateAccountNoForDraft(row, parentData.no);
    } else {
      this.generateAccorderForDraft(row, null);
      this.autoGenerateName(row, null);
    }
    this.newRows = [...this.newRows, row];
    this.accountingState.setChartOfAccountsDirty(true);
    setTimeout(() => {
      const tr = this.el.nativeElement.querySelector(`tr[data-tempid="${tempId}"]`);
      (tr?.querySelector('input') as HTMLInputElement | null)?.focus();
    }, 50);
  }

  /** Auto-generates Arabic and English names based on parent and sibling count */
  private autoGenerateName(draft: InlineRow, parentData: ChartOfAccountDto | null): void {
    const siblingCount = parentData
      ? this.allData.filter(a => a.belong === parentData.no).length
        + this.newRows.filter(r => r !== draft && r.belong === parentData.no).length + 1
      : this.allData.filter(a => !a.belong || a.belong <= 0).length
        + this.newRows.filter(r => r !== draft && (!r.belong || r.belong <= 0)).length + 1;

    if (parentData) {
      const parentArName = parentData.name ?? '';
      const parentEnName = parentData.Ename ?? '';
      draft.name  = `${parentArName} - ${siblingCount}`;
      draft.Ename = `${parentEnName} - ${siblingCount}`;
    } else {
      draft.name  = `حساب رئيسي ${siblingCount}`;
      draft.Ename = `Main Account ${siblingCount}`;
    }
  }

  removeNewRow(tempId: number): void {
    this.newRows = this.newRows.filter(r => r._tempId !== tempId);
    this.accountingState.setChartOfAccountsDirty(this.isDirty);
  }

  onNewRowBelongChange(row: InlineRow): void {
    const parentNo = row.belong;
    if (parentNo && parentNo > 0) {
      const parent = this.nodeMap.get(parentNo);
      if (parent) row.level = (parent.data.level ?? 0) + 1;
      this.generateAccountNoForDraft(row, parentNo);
      // autoGenerateName is called inside generateAccountNoForDraft
    } else {
      row.level = null;
      this.generateAccorderForDraft(row, null);
      this.autoGenerateName(row, null);
    }
  }

  onInlineCreditChange(row: InlineRow): void {
    if (row._creditInput != null && row._creditInput > 0) {
      row._debitInput = null;
      row.bb = -Math.abs(row._creditInput);
    } else {
      row.bb = 0;
    }
  }

  onInlineDebitChange(row: InlineRow): void {
    if (row._debitInput != null && row._debitInput > 0) {
      row._creditInput = null;
      row.bb = row._debitInput;
    } else {
      row.bb = 0;
    }
  }

  private generateAccountNoForDraft(draft: InlineRow, parentNo: number): void {
    const parentStr = String(Math.round(parentNo));
    const suffixLen = 2;
    let maxCounter = 0;

    for (const acc of this.allData) {
      if (acc.belong !== parentNo) continue;
      const childStr = String(Math.round(acc.no));
      if (childStr.startsWith(parentStr) && childStr.length === parentStr.length + suffixLen) {
        const suffix = parseInt(childStr.substring(parentStr.length), 10);
        if (!isNaN(suffix) && suffix > maxCounter) maxCounter = suffix;
      }
    }
    // Also count other pending new rows under same parent
    for (const nr of this.newRows) {
      if (nr === draft || nr.belong !== parentNo) continue;
      const childStr = String(Math.round(nr.no));
      if (childStr.startsWith(parentStr) && childStr.length === parentStr.length + suffixLen) {
        const suffix = parseInt(childStr.substring(parentStr.length), 10);
        if (!isNaN(suffix) && suffix > maxCounter) maxCounter = suffix;
      }
    }

    draft.no = parseInt(parentStr + String(maxCounter + 1).padStart(suffixLen, '0'), 10);
    this.generateAccorderForDraft(draft, parentNo);
    const parentNode = this.nodeMap.get(parentNo);
    if (parentNode) this.autoGenerateName(draft, parentNode.data);
  }

  private generateAccorderForDraft(draft: InlineRow, parentNo: number | null): void {
    if (!parentNo || parentNo <= 0) {
      let maxVal = 0;
      for (const acc of this.allData) {
        if (!acc.belong || acc.belong <= 0) {
          const n = parseInt(acc.accorder ?? '', 10);
          if (!isNaN(n) && n > maxVal) maxVal = n;
        }
      }
      draft.accorder    = String(maxVal + 1);
      draft.fatherorder = null;
      return;
    }

    const parentNode     = this.nodeMap.get(parentNo);
    const parentAccorder = parentNode?.data.accorder ?? String(Math.round(parentNo));
    draft.fatherorder    = parentAccorder;

    const existingSiblings = this.allData.filter(a => a.belong === parentNo).length;
    const pendingSiblings  = this.newRows.filter(r => r !== draft && r.belong === parentNo).length;
    const total   = existingSiblings + pendingSiblings + 1;
    const recLen  = String(total).length;
    const formatted = (total / Math.pow(10, recLen)).toFixed(recLen);
    draft.accorder = parentAccorder + '-' + formatted;
  }

  // ── Save All ──────────────────────────────────────────────────────────────

  saveAll(): void {
    this.submitted = true;

    const newInvalid  = this.newRows.some(r => !r.name?.trim() || !r.Ename?.trim() || !r.no || r.no <= 0);
    const editInvalid = Object.values(this.editingRows).some(r => !r.name?.trim() || !r.Ename?.trim());

    if (newInvalid || editInvalid) {
      this.toastr.error(
        this.translate.instant('ChartOfAccounts.ArabicNameRequired') + ' / ' +
        this.translate.instant('ChartOfAccounts.EnglishNameRequired')
      );
      return;
    }

    if (!this.isBalanced) {
      this.toastr.error(
        this.translate.instant('ChartOfAccounts.BalanceMismatch', { diff: this.balanceDiff.toFixed(3) }),
        undefined,
        { timeOut: 5000 }
      );
      return;
    }

    const parentCheck = this.validateParentBalance();
    if (!parentCheck.valid) {
      this.toastr.error(
        this.translate.instant('ChartOfAccounts.ParentBalanceMismatch', {
          parents: parentCheck.violatingParents.join(' ، ')
        }),
        undefined,
        { timeOut: 7000 }
      );
      return;
    }

    if (!this.isDirty) return;

    // ── Step 1: collect unique parent account numbers from new rows ──────
    const parentNos = new Set<number>();
    for (const row of this.newRows) {
      if (row.belong && row.belong > 0) parentNos.add(row.belong);
    }

    if (parentNos.size === 0) {
      // No parents to check — save directly
      this.executeSave();
      return;
    }

    // ── Step 2: check all parents for transactions in parallel ───────────
    this.loading = true;
    const checks = Array.from(parentNos).map(no =>
      this.accountsService.hasTransactions(no)
    );

    forkJoin(checks).subscribe({
      next: (results) => {
        const parentsWithTx: number[] = [];
        const parentNosArr = Array.from(parentNos);
        results.forEach((res, i) => {
          if (res?.hasTransactions) parentsWithTx.push(parentNosArr[i]);
        });

        if (parentsWithTx.length > 0) {
          this.loading = false;
          // ── Step 3: show confirmation dialog ────────────────────────────
          this.pendingParentsToTransfer = parentsWithTx;
          const parentNames = parentsWithTx.map(no => {
            const node = this.nodeMap.get(no);
            return node ? `${no} - ${node.data.name}` : String(no);
          });

          this.transferConfirmModal.title = this.translate.instant('ChartOfAccounts.TransferConfirmTitle');
          this.transferConfirmModal.message = this.translate.instant('ChartOfAccounts.ConfirmTransferTransactions', {
            parents: parentNames.join(' ، ')
          });
          this.transferConfirmModal.confirmButtonText = this.translate.instant('ChartOfAccounts.TransferYes');
          this.transferConfirmModal.cancelButtonText = this.translate.instant('ChartOfAccounts.TransferNo');
          this.transferConfirmModal.confirmButtonClass = 'btn-primary';
          this.transferConfirmModal.details = parentNames.map(name => ({
            label: this.translate.instant('ChartOfAccounts.No'),
            value: name
          }));
          this.transferConfirmModal.show();
          // else — user cancelled, do nothing
        } else {
          // No parents have transactions — save directly
          this.executeSave();
        }
      },
      error: () => {
        this.loading = false;
        // If check fails, proceed with save anyway (non-critical)
        this.executeSave();
      }
    });
  }

  /** Called when the user clicks "Yes" in the transfer confirmation dialog */
  onTransferConfirm(): void {
    this.transferConfirmModal.hide();
    this.executeSave(this.pendingParentsToTransfer);
  }

  /** Called when the user clicks "No" in the transfer confirmation dialog */
  onTransferCancel(): void {
    this.pendingParentsToTransfer = [];
    // modal hides itself via onCancel()
  }

  /** Executes the actual save operation, optionally transferring transactions */
  private executeSave(parentsToTransfer: number[] = []): void {
    this.loading = true;
    const newRowsCopy = [...this.newRows];
    const ops = [
      ...newRowsCopy.map(row => {
        const { _tempId, _creditInput, _debitInput, ...dto } = row as any;
        return this.accountsService.add(dto as ChartOfAccountDto);
      }),
      ...Object.entries(this.editingRows).map(([noStr, draft]) => {
        const { _creditInput, _debitInput, ...dto } = draft as any;
        return this.accountsService.update(Number(noStr), dto as ChartOfAccountDto);
      }),
    ];

    forkJoin(ops).subscribe({
      next: () => {
        for (const row of newRowsCopy) {
          const { _tempId, _creditInput, _debitInput, ...dto } = row as any;
          this.syncCusfVenf(dto);
          const parentNo = (dto as ChartOfAccountDto).belong;
          const childNo  = (dto as ChartOfAccountDto).no;
          if (parentNo && parentNo > 0) {
            // Mark parent as branched
            const parentNode = this.nodeMap.get(parentNo);
            if (parentNode && parentNode.data.branch !== 1) {
              this.accountsService.update(parentNo, { ...parentNode.data, branch: 1 }).subscribe();
            }
            // Transfer transactions if this parent was flagged
            if (parentsToTransfer.includes(parentNo)) {
              this.accountsService.transferTransactions(parentNo, childNo).subscribe({
                next: () => {
                  this.toastr.info(
                    this.translate.instant('ChartOfAccounts.TransactionsTransferred',
                      { from: parentNo, to: childNo })
                  );
                  this.loadData();
                },
                error: () => { /* silent */ }
              });
            }
          }
        }
        this.editingRows = {};
        this.newRows     = [];
        this.submitted   = false;
        this.accountingState.setChartOfAccountsDirty(false);
        this.toastr.success(this.translate.instant('ChartOfAccounts.SaveAllSuccess'));
        this.loadData();
        this.loading = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? err?.error?.inner ?? 'Save failed');
        this.loading = false;
      },
    });
  }

  discardAll(): void {
    this.editingRows = {};
    this.newRows     = [];
    this.submitted   = false;
    this.accountingState.setChartOfAccountsDirty(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteAccount(node: AccountNode): void {
    if (node.data.no >= 1 && node.data.no <= 7) {
      this.toastr.warning(this.translate.instant('ChartOfAccounts.CannotDeleteSystemAccount'));
      return;
    }
    if (this.isDirty) {
      this.toastr.warning(this.translate.instant('ChartOfAccounts.CannotDeleteWhileDirty'));
      return;
    }

    this.accountsService.canDelete(node.data.no).subscribe({
      next: ({ canDelete, reason }) => {
        if (!canDelete) {
          this.toastr.error(reason ?? this.translate.instant('General.Error'), undefined, { timeOut: 6000 });
          return;
        }
        this.pendingDeleteNo = node.data.no;
        this.deleteConfirmModal.title   = this.translate.instant('ChartOfAccounts.DeleteConfirmTitle');
        this.deleteConfirmModal.message = this.translate.instant('ChartOfAccounts.DeleteConfirmation');
        this.deleteConfirmModal.confirmButtonText = this.translate.instant('ChartOfAccounts.DeleteConfirmBtn');
        this.deleteConfirmModal.cancelButtonText  = this.translate.instant('General.Cancel');
        this.deleteConfirmModal.confirmButtonClass = 'btn-danger';
        this.deleteConfirmModal.details = [
          { label: this.translate.instant('ChartOfAccounts.No'),          value: String(node.data.no) },
          { label: this.translate.instant('ChartOfAccounts.ArabicName'),  value: node.data.name ?? '' },
          { label: this.translate.instant('ChartOfAccounts.EnglishName'), value: node.data.Ename ?? '' },
        ];
        this.deleteConfirmModal.show();
      },
      error: () => {
        this.toastr.error(this.translate.instant('General.ConnectionError'));
      },
    });
  }

  onDeleteConfirm(): void {
    if (this.pendingDeleteNo == null) return;
    const no = this.pendingDeleteNo;
    this.deleteConfirmModal.hide();
    this.deleting = true;
    this.accountsService.delete(no).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('ChartOfAccounts.DeleteSuccess'));
        this.pendingDeleteNo = null;
        this.deleting = false;
        this.loadData();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? 'Delete failed');
        this.pendingDeleteNo = null;
        this.deleting = false;
      },
    });
  }

  onDeleteCancel(): void {
    this.pendingDeleteNo = null;
  }

  // ── Sync customers/vendors ────────────────────────────────────────────────

  private syncCusfVenf(newAcc: ChartOfAccountDto): void {
    const currentYear = new Date().getFullYear();
    const accNo       = Math.round(newAcc.no);
    const accNoStr    = String(accNo);

    this.comfService.getAll().subscribe(comfList => {
      for (const comf of comfList) {
        const custPrefix = comf.acc_debit  != null ? String(Math.round(comf.acc_debit))  : null;
        const vendPrefix = comf.acc_credit != null ? String(Math.round(comf.acc_credit)) : null;

        if (custPrefix && accNoStr.startsWith(custPrefix)) {
          this.comfService.upsertCusf({
            no: accNo, acc: accNo,
            name: newAcc.name ?? '', cename: newAcc.Ename ?? '',
            State: 0, year: currentYear,
          }).subscribe();
        }

        if (vendPrefix && accNoStr.startsWith(vendPrefix)) {
          this.comfService.upsertVenf({
            no: accNo, acc: accNo,
            name: newAcc.name ?? '', vename: newAcc.Ename ?? '',
            year: currentYear,
          }).subscribe();
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getCostCenterName(no: number | null | undefined): string {
    if (no == null) return '—';
    const cc = this.costCenters.find(c => c.CcntrNo === no);
    return cc ? (cc.CcAname ?? String(no)) : String(no);
  }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t) || (item.name?.toLowerCase().includes(t) ?? false);
  };

  trackByNo(_: number, node: AccountNode): number {
    return node.data.no;
  }

  trackByTempId(_: number, row: InlineRow): number {
    return row._tempId ?? row.no;
  }

  trackByDisplayItem(_: number, item: DisplayItem): string {
    return item.kind === 'existing'
      ? `e_${item.node!.data.no}`
      : `n_${item.row!._tempId}`;
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  printTable(): void {
    const title = this.translate.instant('ChartOfAccounts.Title');
    const cols = [
      { label: this.translate.instant('ChartOfAccounts.No'),           key: 'no' },
      { label: this.translate.instant('ChartOfAccounts.ArabicName'),   key: 'name' },
      { label: this.translate.instant('ChartOfAccounts.EnglishName'),  key: 'Ename' },
      { label: this.translate.instant('ChartOfAccounts.Level'),        key: 'level' },
      { label: this.translate.instant('ChartOfAccounts.Belong'),       key: 'belong' },
      { label: this.translate.instant('ChartOfAccounts.Balance'),      key: 'bb' },
      { label: this.translate.instant('ChartOfAccounts.BalanceType'),  key: '_balanceType' },
    ];
    const sorted = [...this.allData].sort((a, b) => a.no - b.no);
    const rows = sorted.map(r => {
      const balType = (r.bb ?? 0) > 0 ? 'دائن' : (r.bb ?? 0) < 0 ? 'مدين' : '—';
      const cells = [
        r.no ?? '—', r.name ?? '—', r.Ename ?? '—',
        r.level ?? '—', r.belong ?? '—',
        r.bb != null ? Math.abs(r.bb).toFixed(3) : '—',
        balType,
      ];
      return `<tr><td>${cells.join('</td><td>')}</td></tr>`;
    }).join('');
    this.reportService.printReport(title, cols, rows);
  }

  // ── Excel Export ──────────────────────────────────────────────────────────

  exportToExcel(): void {
    const t = (k: string) => this.translate.instant(k);
    const headers = [
      t('ChartOfAccounts.No'),
      t('ChartOfAccounts.ArabicName'),
      t('ChartOfAccounts.EnglishName'),
      t('ChartOfAccounts.Level'),
      t('ChartOfAccounts.Credit'),
      t('ChartOfAccounts.Debit'),
      t('ChartOfAccounts.CcntrNo'),
    ];

    const hints = [
      t('ChartOfAccounts.HintNo'),
      t('ChartOfAccounts.HintName'),
      t('ChartOfAccounts.HintEname'),
      t('ChartOfAccounts.HintLevel'),
      t('ChartOfAccounts.HintCredit'),
      t('ChartOfAccounts.HintDebit'),
      t('ChartOfAccounts.HintCcntr'),
    ];

    const sorted = [...this.allData].sort((a, b) => a.no - b.no);
    const rows = sorted.map(r => {
      const bb = r.bb ?? 0;
      return [
        r.no,
        r.name ?? '',
        r.Ename ?? '',
        r.level ?? '',
        bb < 0 ? Math.abs(bb) : '',
        bb > 0 ? bb : '',
        r.CcntrNo ?? '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, hints, ...rows]);

    // Style hint row cells as italic grey (best-effort — SheetJS community has limited style support)
    const hintRowIdx = 1; // 0-based
    headers.forEach((_, ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: hintRowIdx, c: ci });
      if (ws[cellRef]) {
        ws[cellRef].s = { font: { italic: true, color: { rgb: '888888' } } };
      }
    });

    ws['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 30 },
      { wch: 8 },  { wch: 22 }, { wch: 22 }, { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('ChartOfAccounts.ExportSheetName'));
    XLSX.writeFile(wb, `chart-of-accounts-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── Excel Import ──────────────────────────────────────────────────────────

  triggerImport(): void {
    this.importFileInput.nativeElement.value = '';
    this.importFileInput.nativeElement.click();
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      this.toastr.error(this.translate.instant('ChartOfAccounts.ImportInvalidFile'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (jsonRows.length < 2) {
          this.toastr.warning(this.translate.instant('ChartOfAccounts.ImportNoRows'));
          return;
        }

        // Map header row to column indices (case-insensitive, trimmed)
        const headerRow = (jsonRows[0] as any[]).map((h: any) => String(h ?? '').trim().toLowerCase());
        const col = (candidates: string[]) =>
          candidates.reduce((found, c) => found !== -1 ? found : headerRow.indexOf(c.toLowerCase()), -1);

        const iNo     = col(['no', 'رقم الحساب', 'account no', 'account number']);
        const iName   = col(['name', 'الاسم بالعربي', 'arabic name']);
        const iEname  = col(['ename', 'الاسم بالإنجليزي', 'english name']);
        const iBelong = col(['belong', 'ينتمي إلى', 'belongs to', 'parent']);
        const iCredit = col(['credit', 'دائن']);
        const iDebit  = col(['debit', 'مدين']);
        const iCcntr  = col(['ccntrno', 'مركز الكلفة', 'cost center']);

        // Fallback: positional (no, name, ename, level, credit, debit, ccntr)
        // Belong is optional — detected by header only; no positional fallback
        const getCol = (detected: number, fallback: number) =>
          detected !== -1 ? detected : fallback;
        const cNo     = getCol(iNo,     0);
        const cName   = getCol(iName,   1);
        const cEname  = getCol(iEname,  2);
        const cBelong = iBelong; // -1 when column is absent → treated as null
        const cCredit = getCol(iCredit, 4);
        const cDebit  = getCol(iDebit,  5);
        const cCcntr  = getCol(iCcntr,  6);

        const dataRows = jsonRows.slice(1);
        const imported: InlineRow[] = [];

        for (const row of dataRows) {
          const no = parseInt(String(row[cNo] ?? ''), 10);
          if (isNaN(no) || no <= 0) continue;

          const credit = parseFloat(String(row[cCredit] ?? '')) || 0;
          const debit  = parseFloat(String(row[cDebit]  ?? '')) || 0;
          const bb     = credit > 0 ? -Math.abs(credit) : debit > 0 ? debit : 0;
          const belong = cBelong !== -1 ? (parseInt(String(row[cBelong] ?? ''), 10) || null) : null;
          const ccntr  = parseInt(String(row[cCcntr]  ?? ''), 10) || this.firstCcntrNo;

          const parentNode = belong ? this.nodeMap.get(belong) : null;

          imported.push({
            no,
            name:   String(row[cName]  ?? '').trim(),
            Ename:  String(row[cEname] ?? '').trim(),
            belong: (belong && belong > 0) ? belong : null,
            level:  parentNode ? (parentNode.data.level ?? 0) + 1 : null,
            branch: 0, bb,
            balance1: 0, accorder: null, fatherorder: null,
            CurNo: 1, LRate: 1, CcntrNo: ccntr,
            budgetF: 0, ProfL: 0, BB_Tr: 0, br_no: null, f_bb: 0,
            Stopped: null, Celing: null,
            _tempId: this.nextTempId--,
            _creditInput: credit > 0 ? credit : null,
            _debitInput:  debit  > 0 ? debit  : null,
          });
        }

        if (imported.length === 0) {
          this.toastr.warning(this.translate.instant('ChartOfAccounts.ImportNoRows'));
          return;
        }

        this.newRows = [...this.newRows, ...imported];
        this.accountingState.setChartOfAccountsDirty(true);
        this.toastr.success(
          this.translate.instant('ChartOfAccounts.ImportSuccess', { count: imported.length })
        );
      } catch {
        this.toastr.error(this.translate.instant('ChartOfAccounts.ImportInvalidFile'));
      }
    };
    reader.readAsArrayBuffer(file);
  }
}
