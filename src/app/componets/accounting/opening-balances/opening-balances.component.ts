import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccfDto, AccfService } from '../../../shared/services/accf.service';
import { CurrencyDto, CurrencyService } from '../../../shared/services/currency.service';
import { ReportService } from '../../../shared/services/report.service';
import { ComfService } from '../../../shared/services/comf.service';
import { AccountingStateService } from '../../../shared/services/accounting-state.service';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

export interface AccfRow extends AccfDto {
  _creditInput: number | null;
  _debitInput: number | null;
  _dirty: boolean;
  _currencyName: string;
}

@Component({
  selector: 'app-opening-balances',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgbModule,
    NgSelectModule,
  ],
  templateUrl: './opening-balances.component.html',
  styleUrl: './opening-balances.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class OpeningBalancesComponent implements OnInit {
  @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;

  rows: AccfRow[] = [];
  currencies: CurrencyDto[] = [];
  mainCurrency: CurrencyDto | null = null;
  openingDate: string | null = null;
  chartOfAccountsDirty = false;
  loading = false;
  saving = false;
  searchTerm = '';

  constructor(
    private accfService: AccfService,
    private currencyService: CurrencyService,
    private reportService: ReportService,
    private comfService: ComfService,
    private accountingState: AccountingStateService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.chartOfAccountsDirty = this.accountingState.isChartOfAccountsDirty;
    this.accountingState.chartOfAccountsDirty$.subscribe(
      dirty => this.chartOfAccountsDirty = dirty
    );
    this.loadData();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    forkJoin({
      accf: this.accfService.getAll(),
      currencies: this.currencyService.getAll(),
      comf: this.comfService.getAll(),
    }).subscribe({
      next: ({ accf, currencies, comf }) => {
        this.currencies = currencies;
        this.mainCurrency = currencies.find(c => (c.lrate ?? 0) === 1) ?? currencies[0] ?? null;
        const bbdRaw = comf?.[0]?.bbd ?? null;
        this.openingDate = bbdRaw ? new Date(bbdRaw).toLocaleDateString('en-CA') : null;
        this.rows = accf
          .filter(r => !r.branch || r.branch === 0)
          .sort((a, b) => a.no - b.no)
          .map(r => this.toRow(r));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private toRow(dto: AccfDto): AccfRow {
    const bb = dto.bb ?? 0;
    const cur = this.currencies.find(c => c.cur_no === dto.CurNo);
    return {
      ...dto,
      _creditInput: bb < 0 ? Math.abs(bb) : null,
      _debitInput:  bb > 0 ? bb : null,
      _dirty: false,
      _currencyName: cur?.cur ?? '',
    };
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get filteredRows(): AccfRow[] {
    if (!this.searchTerm.trim()) return this.rows;
    const t = this.searchTerm.trim().toLowerCase();
    return this.rows.filter(r =>
      String(r.no).includes(t) ||
      r.name?.toLowerCase().includes(t) ||
      r.Ename?.toLowerCase().includes(t)
    );
  }

  get totalDebit(): number {
    return this.rows.reduce((s, r) => s + ((r.bb ?? 0) > 0 ? (r.bb ?? 0) : 0), 0);
  }

  get totalCredit(): number {
    return this.rows.reduce((s, r) => s + ((r.bb ?? 0) < 0 ? Math.abs(r.bb ?? 0) : 0), 0);
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

  // ── Inline input handlers ─────────────────────────────────────────────────

  onDebitChange(row: AccfRow): void {
    if ((row._debitInput ?? 0) > 0) {
      row._creditInput = null;
      row.bb = row._debitInput;
    } else {
      row.bb = 0;
    }
    row._dirty = true;
  }

  onCreditChange(row: AccfRow): void {
    if ((row._creditInput ?? 0) > 0) {
      row._debitInput = null;
      row.bb = -Math.abs(row._creditInput!);
    } else {
      row.bb = 0;
    }
    row._dirty = true;
  }

  onCurrencyChange(row: AccfRow): void {
    const cur = this.currencies.find(c => c.cur_no === row.CurNo);
    row._currencyName = cur?.cur ?? '';
    row.LRate = cur?.lrate ?? 1;
    row._dirty = true;
  }

  onFieldChange(row: AccfRow): void {
    row._dirty = true;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  save(): void {
    const dirty = this.rows.filter(r => r._dirty);
    if (dirty.length === 0) return;

    if (!this.isBalanced) {
      this.toastr.error(
        this.translate.instant('ChartOfAccounts.BalanceMismatch', { diff: this.balanceDiff.toFixed(3) }),
        undefined,
        { timeOut: 5000 }
      );
      return;
    }

    this.saving = true;
    const dtos: AccfDto[] = dirty.map(r => {
      const { _creditInput, _debitInput, _dirty, _currencyName, ...dto } = r;
      return dto;
    });
    this.accfService.updateBatch(dtos).subscribe({
      next: () => {
        this.rows.forEach(r => r._dirty = false);
        this.toastr.success(this.translate.instant('OpeningBalances.SaveSuccess'));
        this.saving = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? 'Save failed');
        this.saving = false;
      },
    });
  }

  discard(): void {
    this.loadData();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isCredit(bb: number | null | undefined): boolean {
    return (bb ?? 0) < 0;
  }

  isDebit(bb: number | null | undefined): boolean {
    return (bb ?? 0) > 0;
  }

  getCurrencyName(curNo: number | null | undefined): string {
    if (curNo == null) return '—';
    return this.currencies.find(c => c.cur_no === curNo)?.cur ?? String(curNo);
  }

  /**
   * Mirrors VB6 BalCol logic:
   *  - If lrate = 1 → abs(bb)  (main currency, no conversion)
   *  - Else if f_bb is set (non-null, non-zero) → f_bb  (explicit override)
   *  - Else if lrate = 0 → abs(bb)
   *  - Else → abs(bb) / lrate
   */
  calcForeignAmount(row: AccfRow): number {
    const bb    = Math.abs(row.bb ?? 0);
    const lrate = row.LRate ?? 1;
    if (lrate === 1)                        return bb;
    if (row.f_bb != null && row.f_bb !== 0) return Math.abs(row.f_bb);
    if (lrate === 0)                        return bb;
    return bb / lrate;
  }

  trackByNo(_: number, row: AccfRow): number {
    return row.no;
  }

  // ── Excel Import ──────────────────────────────────────────────────────────

  triggerImport(): void {
    this.importFileInput.nativeElement.value = '';
    this.importFileInput.nativeElement.click();
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
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

        // Map header → column index (case-insensitive)
        const headerRow = (jsonRows[0] as any[]).map((h: any) => String(h ?? '').trim().toLowerCase());
        const col = (candidates: string[]) =>
          candidates.reduce((found, c) => found !== -1 ? found : headerRow.indexOf(c.toLowerCase()), -1);

        const iNo     = col(['no', 'رقم الحساب', 'account no']);
        const iCredit = col(['credit', 'دائن']);
        const iDebit  = col(['debit', 'مدين']);
        const iCurName= col(['currencyname', 'currency name', 'اسم العملة', 'العملة']);
        const iFbb    = col(['foreignamount', 'foreign amount', 'المبلغ للعملة الأجنبية', 'f_bb']);

        // Positional fallback (matches export column order)
        const cNo     = iNo     !== -1 ? iNo     : 0;
        const cDebit  = iDebit  !== -1 ? iDebit  : 2;
        const cCredit = iCredit !== -1 ? iCredit : 3;
        const cCurName= iCurName!== -1 ? iCurName: 4;
        const cFbb    = iFbb    !== -1 ? iFbb    : 6;

        let updated = 0;
        for (const dataRow of jsonRows.slice(1)) {
          const no = parseFloat(String(dataRow[cNo] ?? ''));
          if (isNaN(no) || no <= 0) continue;

          const target = this.rows.find(r => r.no === no);
          if (!target) continue;

          const debit  = parseFloat(String(dataRow[cDebit]  ?? '')) || 0;
          const credit = parseFloat(String(dataRow[cCredit] ?? '')) || 0;

          if (debit > 0) {
            target.bb = debit;
            target._debitInput  = debit;
            target._creditInput = null;
          } else if (credit > 0) {
            target.bb = -Math.abs(credit);
            target._creditInput = credit;
            target._debitInput  = null;
          } else {
            target.bb = 0;
            target._debitInput  = null;
            target._creditInput = null;
          }

          // Currency by name lookup
          const curNameRaw = String(dataRow[cCurName] ?? '').trim();
          if (curNameRaw) {
            const cur = this.currencies.find(c =>
              c.cur?.toLowerCase() === curNameRaw.toLowerCase() ||
              c.ename?.toLowerCase() === curNameRaw.toLowerCase()
            );
            if (cur) {
              target.CurNo = cur.cur_no;
              target.LRate = cur.lrate ?? 1;
              target._currencyName = cur.cur ?? '';
            }
          }

          const fbb = parseFloat(String(dataRow[cFbb] ?? ''));
          if (!isNaN(fbb)) target.f_bb = fbb;

          target._dirty = true;
          updated++;
        }

        if (updated === 0) {
          this.toastr.warning(this.translate.instant('ChartOfAccounts.ImportNoRows'));
          return;
        }
        this.toastr.success(
          this.translate.instant('OpeningBalances.ImportSuccess', { count: updated })
        );
      } catch {
        this.toastr.error(this.translate.instant('ChartOfAccounts.ImportInvalidFile'));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Print ──────────────────────────────────────────────────────────────────

  printTable(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('OpeningBalances.No') },
      { label: t('OpeningBalances.AccountName') },
      { label: t('OpeningBalances.Debit') },
      { label: t('OpeningBalances.Credit') },
      { label: t('OpeningBalances.CurrencyName') },
      { label: t('OpeningBalances.Rate') },
      { label: t('OpeningBalances.ForeignAmount') },
    ];
    const rows = this.rows.map(r => {
      const bb = r.bb ?? 0;
      const cells = [
        r.no,
        r.name ?? '—',
        bb > 0 ? bb.toFixed(3) : '—',
        bb < 0 ? Math.abs(bb).toFixed(3) : '—',
        this.getCurrencyName(r.CurNo),
        (r.LRate ?? 1).toFixed(3),
        this.calcForeignAmount(r).toFixed(3),
      ];
      return `<tr><td>${cells.join('</td><td>')}</td></tr>`;
    }).join('');
    this.reportService.printReport(t('OpeningBalances.Title'), cols, rows);
  }

  // ── Excel Export ──────────────────────────────────────────────────────────

  exportToExcel(): void {
    const t = (k: string) => this.translate.instant(k);
    const headers = [
      t('OpeningBalances.No'),
      t('OpeningBalances.AccountName'),
      t('OpeningBalances.Debit'),
      t('OpeningBalances.Credit'),
      t('OpeningBalances.CurrencyName'),
      t('OpeningBalances.Rate'),
      t('OpeningBalances.ForeignAmount'),
    ];
    const dataRows = this.rows.map(r => {
      const bb = r.bb ?? 0;
      return [
        r.no,
        r.name ?? '',
        bb > 0 ? bb : '',
        bb < 0 ? Math.abs(bb) : '',
        this.getCurrencyName(r.CurNo),
        r.LRate ?? 1,
        this.calcForeignAmount(r),
      ];
    });

    // Totals row
    dataRows.push([
      '', t('OpeningBalances.Total'),
      this.totalDebit, this.totalCredit,
      '', '', '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('OpeningBalances.Title'));
    XLSX.writeFile(wb, `opening-balances-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
