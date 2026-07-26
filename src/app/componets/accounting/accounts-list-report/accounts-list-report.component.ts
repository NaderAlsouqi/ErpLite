import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import {
  ChartOfAccountsService,
  ChartOfAccountDto,
} from '../../../shared/services/chart-of-accounts.service';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

interface AccountsListRow {
  no:       number;
  level:    number | null;
  name:     string;
  Ename:    string;
  belong:   number | null;
  branched: boolean;
}

@Component({
  selector: 'app-accounts-list-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, PaginatorComponent, PaginatePipe],
  templateUrl: './accounts-list-report.component.html',
  styleUrl: './accounts-list-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountsListReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  /** حتى المستوى — include accounts at this level or shallower. */
  maxLevel: number | null = 2;
  /** كل الحسابات (false) vs لحساب معين (true). */
  specificAccount = false;
  selectedAcc: ChartOfAccountDto | null = null;

  // ─── Data ──────────────────────────────────────────────────
  allAccounts: ChartOfAccountDto[] = [];
  rows: AccountsListRow[] = [];
  lookupLoading = false;
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private accountsSvc: ChartOfAccountsService,
    public reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accountsSvc.getAll().subscribe({
      next: data => {
        this.allAccounts = (data ?? []).sort((a, b) => a.no - b.no);
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
  }

  onModeChange(): void {
    if (!this.specificAccount) this.selectedAcc = null;
    this.fetched = false;
    this.rows = [];
  }

  generate(): void {
    if (this.specificAccount && !this.selectedAcc) {
      this.toastr.warning(this.translate.instant('AccountsListReport.AccRequired'));
      return;
    }

    this.loading = true;
    this.fetched = false;

    // Build the full chart in hierarchical (depth-first) order: every parent
    // is immediately followed by its descendants. Filters are applied on top
    // afterwards, which preserves this ordering.
    let ordered = this.buildHierarchicalOrder();

    // "لحساب معين" — restrict to the chosen account and its descendants
    // (matched via accorder prefix, falling back to the belong tree).
    if (this.specificAccount && this.selectedAcc) {
      const root = this.selectedAcc;
      const prefix = root.accorder ?? null;
      if (prefix) {
        ordered = ordered.filter(a => (a.accorder ?? '').startsWith(prefix));
      } else {
        const ids = this.collectSubtree(root.no);
        ordered = ordered.filter(a => ids.has(a.no));
      }
    }

    // "حتى المستوى" — keep accounts at or above the requested depth.
    const max = this.maxLevel;
    if (max != null && max > 0) {
      ordered = ordered.filter(a => (a.level ?? 0) <= max);
    }

    this.rows = ordered.map(a => ({
      no:       a.no,
      level:    a.level ?? null,
      name:     a.name  ?? '',
      Ename:    a.Ename ?? '',
      belong:   (a.belong && a.belong > 0) ? a.belong : null,
      branched: a.branch === 1,
    }));

    this.page = 1;
    this.fetched = true;
    this.loading = false;

    if (this.rows.length === 0) {
      this.toastr.info(this.translate.instant('AccountsListReport.NoData'));
    }
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  /**
   * Depth-first ordering of the whole chart: roots first (sorted by no),
   * each followed immediately by its children (recursively). This produces
   * "parent then its children under it" layout.
   */
  private buildHierarchicalOrder(): ChartOfAccountDto[] {
    const childrenOf = new Map<number, ChartOfAccountDto[]>();
    const roots: ChartOfAccountDto[] = [];

    for (const a of this.allAccounts) {
      const parent = (a.belong && a.belong > 0) ? a.belong : 0;
      if (parent === 0) {
        roots.push(a);
      } else {
        const list = childrenOf.get(parent);
        if (list) list.push(a);
        else childrenOf.set(parent, [a]);
      }
    }

    const byNo = (a: ChartOfAccountDto, b: ChartOfAccountDto) => a.no - b.no;
    roots.sort(byNo);
    for (const list of childrenOf.values()) list.sort(byNo);

    const result: ChartOfAccountDto[] = [];
    const visited = new Set<number>();
    const walk = (acc: ChartOfAccountDto) => {
      if (visited.has(acc.no)) return;   // cycle-safe
      visited.add(acc.no);
      result.push(acc);
      for (const child of (childrenOf.get(acc.no) ?? [])) walk(child);
    };
    for (const r of roots) walk(r);

    // Append any orphans whose parent is missing (defensive — keeps them visible).
    for (const a of this.allAccounts) {
      if (!visited.has(a.no)) result.push(a);
    }

    return result;
  }

  /** Collect an account and all of its descendants via the belong tree. */
  private collectSubtree(rootNo: number): Set<number> {
    const childrenOf = new Map<number, number[]>();
    for (const a of this.allAccounts) {
      if (a.belong && a.belong > 0) {
        (childrenOf.get(a.belong) ?? childrenOf.set(a.belong, []).get(a.belong)!).push(a.no);
      }
    }
    const ids = new Set<number>();
    const walk = (no: number) => {
      if (ids.has(no)) return;
      ids.add(no);
      for (const c of (childrenOf.get(no) ?? [])) walk(c);
    };
    walk(rootNo);
    return ids;
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t = (k: string) => this.translate.instant(k);

    const cols = [
      { label: t('AccountsListReport.AccNo') },
      { label: t('AccountsListReport.Level') },
      { label: t('AccountsListReport.AccName') },
      { label: t('AccountsListReport.Belong') },
      { label: t('AccountsListReport.BranchState') },
    ];

    const branchedTxt    = t('AccountsListReport.Branched');
    const notBranchedTxt = t('AccountsListReport.NotBranched');

    const rowsHtml = this.rows.map(r => `<tr>
      <td>${r.no}</td>
      <td style="text-align:center">${r.level ?? ''}</td>
      <td>${this.isAr ? r.name : r.Ename}</td>
      <td style="text-align:center">${r.belong ?? '___'}</td>
      <td style="text-align:center">${r.branched ? branchedTxt : notBranchedTxt}</td>
    </tr>`).join('');

    const accLabel = this.specificAccount && this.selectedAcc
      ? `${this.selectedAcc.no} — ${this.isAr ? this.selectedAcc.name : this.selectedAcc.Ename}`
      : t('AccountsListReport.AllAccounts');

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('AccountsListReport.MaxLevel')}:</span><span class="filter-value">${this.maxLevel ?? '—'}</span></div>
      <div class="filter-item"><span class="filter-label">${t('AccountsListReport.Scope')}:</span><span class="filter-value">${accLabel}</span></div>`;

    this.reportPrint.printReport(t('AccountsListReport.Title'), cols, rowsHtml, filtersHtml);
  }
}
