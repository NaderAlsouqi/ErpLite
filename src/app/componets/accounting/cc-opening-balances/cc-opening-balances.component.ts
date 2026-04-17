import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { AccfDto, AccfService } from '../../../shared/services/accf.service';
import { CostCenterDto, CostCenterService } from '../../../shared/services/cost-center.service';
import { CenterBalService } from '../../../shared/services/center-bal.service';
import { ComfService } from '../../../shared/services/comf.service';
import { CurrencyDto, CurrencyService } from '../../../shared/services/currency.service';
import { ReportService } from '../../../shared/services/report.service';

export interface CcBalRow {
  accNo: number;
  accName: string;
  bb: number;
  _debitInput:  number | null;
  _creditInput: number | null;
  _dirty: boolean;
}

@Component({
  selector: 'app-cc-opening-balances',
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
  templateUrl: './cc-opening-balances.component.html',
  styleUrl:    './cc-opening-balances.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CcOpeningBalancesComponent implements OnInit {

  @ViewChild('deleteConfirmModal') deleteConfirmModal!: ConfirmationModalComponent;

  private pendingDeleteRow: CcBalRow | null = null;

  costCenters:  CostCenterDto[] = [];
  leafAccounts: AccfDto[]       = [];
  currencies:   CurrencyDto[]   = [];
  mainCurrency: CurrencyDto | null = null;
  openingDate:  string | null   = null;

  selectedCcntrNo:    number | null  = null;
  selectedAccountAdd: AccfDto | null = null;
  rows:               CcBalRow[]     = [];
  availableAccounts:  AccfDto[]      = [];

  loading      = false;
  loadingRows  = false;
  saving       = false;

  constructor(
    private costCenterService: CostCenterService,
    private accfService:       AccfService,
    private centerBalService:  CenterBalService,
    private comfService:       ComfService,
    private currencyService:   CurrencyService,
    private reportService:     ReportService,
    private toastr:            ToastrService,
    private translate:         TranslateService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      costCenters: this.costCenterService.getAll(),
      accf:        this.accfService.getAll(),
      comf:        this.comfService.getAll(),
      currencies:  this.currencyService.getAll(),
    }).subscribe({
      next: ({ costCenters, accf, comf, currencies }) => {
        this.costCenters  = costCenters.sort((a, b) => (a.CcntrNo ?? 0) - (b.CcntrNo ?? 0));
        this.leafAccounts = accf
          .filter(r => !r.branch || r.branch === 0)
          .sort((a, b) => a.no - b.no);
        this.currencies   = currencies;
        this.mainCurrency = currencies.find(c => (c.lrate ?? 0) === 1) ?? currencies[0] ?? null;
        const bbdRaw = comf?.[0]?.bbd ?? null;
        this.openingDate = bbdRaw ? new Date(bbdRaw).toLocaleDateString('en-CA') : null;
        this.refreshAvailableAccounts();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Cost center selection ───────────────────────────────────────────────────

  onCostCenterChange(): void {
    this.selectedAccountAdd = null;
    if (!this.selectedCcntrNo) {
      this.rows = [];
      this.refreshAvailableAccounts();
      return;
    }
    this.loadingRows = true;
    this.centerBalService.getByCcNo(this.selectedCcntrNo).subscribe({
      next: (entries) => {
        // Only load accounts that exist in centerbal (non-zero saved entries)
        this.rows = entries
          .filter(e => e.Bb !== null && e.Bb !== 0)
          .map(e => {
            const acc = this.leafAccounts.find(a => a.no === Number(e.AccNo));
            const bb  = e.Bb ?? 0;
            return {
              accNo:        Number(e.AccNo),
              accName:      acc?.name ?? acc?.Ename ?? String(e.AccNo),
              bb,
              _debitInput:  bb > 0 ? bb : null,
              _creditInput: bb < 0 ? Math.abs(bb) : null,
              _dirty: false,
            };
          });
        this.refreshAvailableAccounts();
        this.loadingRows = false;
      },
      error: () => { this.loadingRows = false; },
    });
  }

  private refreshAvailableAccounts(): void {
    const addedNos = new Set(this.rows.map(r => r.accNo));
    this.availableAccounts = this.leafAccounts.filter(a => !addedNos.has(a.no));
  }

  accountSearchFn(term: string, acc: AccfDto): boolean {
    const t = term.toLowerCase();
    return (
      String(acc.no).includes(t) ||
      (acc.name ?? '').toLowerCase().includes(t) ||
      (acc.Ename ?? '').toLowerCase().includes(t)
    );
  }

  onAccountSelect(acc: AccfDto | null): void {
    if (!acc) return;
    if (!this.rows.some(r => r.accNo === acc.no)) {
      this.rows = [
        ...this.rows,
        {
          accNo:        acc.no,
          accName:      acc.name ?? acc.Ename ?? String(acc.no),
          bb:           0,
          _debitInput:  null,
          _creditInput: null,
          _dirty:       true,
        },
      ];
    }
    this.refreshAvailableAccounts();
    // Reset the ng-select after adding
    setTimeout(() => { this.selectedAccountAdd = null; });
  }

  confirmDelete(row: CcBalRow): void {
    this.pendingDeleteRow = row;
    this.deleteConfirmModal.show();
  }

  onConfirmDelete(): void {
    if (!this.pendingDeleteRow || !this.selectedCcntrNo) return;

    const remaining = this.rows.filter(r => r.accNo !== this.pendingDeleteRow!.accNo);
    const entries   = remaining
      .filter(r => r.bb !== 0)
      .map(r => ({ accNo: r.accNo, bb: r.bb }));

    this.saving = true;
    this.centerBalService.saveBatch({ ccNo: this.selectedCcntrNo, entries }).subscribe({
      next: () => {
        this.rows = remaining;
        this.refreshAvailableAccounts();
        this.pendingDeleteRow = null;
        this.saving = false;
        this.toastr.success(this.translate.instant('General.DeletedSuccessfully'));
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.pendingDeleteRow = null;
        this.saving = false;
      },
    });
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  get totalDebit(): number {
    return this.rows.reduce((s, r) => s + (r.bb > 0 ? r.bb : 0), 0);
  }

  get totalCredit(): number {
    return this.rows.reduce((s, r) => s + (r.bb < 0 ? Math.abs(r.bb) : 0), 0);
  }

  get balanceDiff(): number {
    return Math.abs(this.totalDebit - this.totalCredit);
  }

  get isBalanced(): boolean {
    return this.balanceDiff < 0.001;
  }

  get dirtyCount(): number {
    return this.rows.filter(r => r._dirty).length;
  }

  // ── Input handlers ──────────────────────────────────────────────────────────

  onDebitChange(row: CcBalRow): void {
    if ((row._debitInput ?? 0) > 0) {
      row._creditInput = null;
      row.bb = row._debitInput!;
    } else {
      row.bb = 0;
    }
    row._dirty = true;
  }

  onCreditChange(row: CcBalRow): void {
    if ((row._creditInput ?? 0) > 0) {
      row._debitInput = null;
      row.bb = -Math.abs(row._creditInput!);
    } else {
      row.bb = 0;
    }
    row._dirty = true;
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.selectedCcntrNo) {
      this.toastr.warning(this.translate.instant('CcOpeningBalances.SelectCostCenterFirst'));
      return;
    }

    this.saving = true;
    const entries = this.rows
      .filter(r => r.bb !== 0)
      .map(r => ({ accNo: r.accNo, bb: r.bb }));

    this.centerBalService.saveBatch({ ccNo: this.selectedCcntrNo, entries }).subscribe({
      next: () => {
        this.rows.forEach(r => r._dirty = false);
        this.toastr.success(this.translate.instant('CcOpeningBalances.SaveSuccess'));
        this.saving = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.saving = false;
      },
    });
  }

  discard(): void {
    this.onCostCenterChange();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  trackByAccNo(_: number, row: CcBalRow): number {
    return row.accNo;
  }

  printTable(): void {
    if (!this.selectedCcntrNo) return;
    const t = (k: string) => this.translate.instant(k);
    const cc = this.costCenters.find(c => c.CcntrNo === this.selectedCcntrNo);
    const title = `${t('CcOpeningBalances.Title')} — ${cc?.CcAname ?? this.selectedCcntrNo}`;
    const cols = [
      { label: t('CcOpeningBalances.AccountNo') },
      { label: t('CcOpeningBalances.AccountName') },
      { label: t('CcOpeningBalances.Debit') },
      { label: t('CcOpeningBalances.Credit') },
    ];
    const rowsHtml = this.rows
      .filter(r => r.bb !== 0)
      .map(r => {
        const cells = [
          r.accNo,
          r.accName,
          r.bb > 0 ? r.bb.toFixed(3) : '—',
          r.bb < 0 ? Math.abs(r.bb).toFixed(3) : '—',
        ];
        return `<tr><td>${cells.join('</td><td>')}</td></tr>`;
      }).join('');
    this.reportService.printReport(title, cols, rowsHtml);
  }
}
