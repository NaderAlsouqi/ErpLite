import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import {
  IncomingChequeMovementService,
  IncomingChequeDto,
  ChequeSerialTypeDto,
  IncomingChequeMovementRowDto,
} from '../../../shared/services/incoming-cheque-movement.service';

@Component({
  selector: 'app-incoming-cheque-movement-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './incoming-cheque-movement-report.component.html',
  styleUrl: './incoming-cheque-movement-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class IncomingChequeMovementReportComponent implements OnInit {

  // ─── Filter ────────────────────────────────────────────────
  cheques: IncomingChequeDto[] = [];
  /** نوع التسلسل options — all receipt/beginning serials from VoucherSerial. */
  serialTypes: ChequeSerialTypeDto[] = [];
  selectedSerial: ChequeSerialTypeDto | null = null;
  /** Cheques shown in the picker — STABLE reference (a getter would reset ng-select). */
  filteredCheques: IncomingChequeDto[] = [];
  selectedCheque: IncomingChequeDto | null = null;
  lookupLoading = false;

  // ─── Results ───────────────────────────────────────────────
  rows: IncomingChequeMovementRowDto[] = [];
  loading = false;
  fetched = false;
  /** The cheque the displayed rows belong to (for the header card). */
  shownCheque: IncomingChequeDto | null = null;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  chequeSearchFn = (term: string, item: IncomingChequeDto): boolean => {
    const t = term.toLowerCase();
    return (item.ChequeNum ?? '').toLowerCase().includes(t)
      || String(item.BankNum).includes(t)
      || (item.Draw ?? '').toLowerCase().includes(t)
      || String(item.Amount).includes(t);
  };

  constructor(
    private svc:         IncomingChequeMovementService,
    private reportPrint: ReportService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    // نوع التسلسل options come from VoucherSerial (all defined receipt /
    // beginning serials), independent of which cheques exist.
    this.svc.getSerialTypes().subscribe({
      next: data => { this.serialTypes = data ?? []; },
    });
    this.svc.getCheques().subscribe({
      next: data => {
        this.cheques = data ?? [];
        this.filteredCheques = this.cheques;
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
  }

  /** Filter the cheque picker by the chosen نوع التسلسل. */
  onSerialChange(): void {
    this.filteredCheques = this.selectedSerial
      ? this.cheques.filter(c =>
          c.SerialTypeNo === this.selectedSerial!.SerialTypeNo &&
          c.SerialNo     === this.selectedSerial!.SerialNo)
      : this.cheques;
    this.selectedCheque = null;
    this.onFilterChange();
  }

  /** Clear stale results when the selected cheque changes. */
  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
    this.shownCheque = null;
  }

  serialLabel(s: ChequeSerialTypeDto): string {
    const name   = this.isAr ? s.SerialName : (s.SerialEName || s.SerialName);
    const branch = this.isAr ? s.BranchName : (s.BranchEName || s.BranchName);
    return `${s.SerialNo} — ${name}${branch ? ' / ' + branch : ''}`;
  }

  /** Localized label for a transaction-type code. */
  typeLabel(code: string): string {
    return code ? this.translate.instant('IncomingChequeMovement.Types.' + code) : '';
  }

  chequeLabel(c: IncomingChequeDto): string {
    const name = this.isAr ? c.CustAccName : (c.CustAccEName || c.CustAccName);
    return `${c.ChequeNum} — ${c.Amount} — ${c.Draw}${name ? ' — ' + name : ''}`;
  }

  generate(): void {
    if (!this.selectedCheque) {
      this.toastr.warning(this.translate.instant('IncomingChequeMovement.SelectRequired'));
      return;
    }
    const c = this.selectedCheque;
    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getMovement(c.ChequeNum, c.BankNum, c.Draw).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.shownCheque = c;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('IncomingChequeMovement.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  print(): void {
    if (this.rows.length === 0 || !this.shownCheque) return;
    const t   = (k: string) => this.translate.instant(k);
    const c   = this.shownCheque;

    const cols = [
      { label: t('IncomingChequeMovement.DocNo') },
      { label: t('IncomingChequeMovement.DocDate') },
      { label: t('IncomingChequeMovement.TransType') },
      { label: t('IncomingChequeMovement.Account') },
      { label: t('IncomingChequeMovement.Note') },
    ];

    const body = this.rows.map(r => `<tr>
      <td>${r.DocNum}</td>
      <td>${r.DocDate}</td>
      <td>${this.typeLabel(r.TransType)}</td>
      <td>${this.isAr ? r.AccName : (r.AccEName || r.AccName)}</td>
      <td>${r.Note}</td>
    </tr>`).join('');

    const serialTxt = `${c.SerialNo} — ${this.isAr ? c.SerialName : (c.SerialEName || c.SerialName)}`;
    const branchTxt = this.isAr ? c.BranchName : (c.BranchEName || c.BranchName);
    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.SerialType')}:</span><span class="filter-value">${serialTxt}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.Branch')}:</span><span class="filter-value">${branchTxt}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.ChequeNo')}:</span><span class="filter-value">${c.ChequeNum}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.BankNo')}:</span><span class="filter-value">${c.BankNum}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.Amount')}:</span><span class="filter-value">${(c.Amount ?? 0).toFixed(3)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.DueDate')}:</span><span class="filter-value">${c.DueDate}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.ReceiptDate')}:</span><span class="filter-value">${c.ReceiptDate}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.Drawer')}:</span><span class="filter-value">${c.Draw}</span></div>
      <div class="filter-item"><span class="filter-label">${t('IncomingChequeMovement.Receiver')}:</span><span class="filter-value">${this.isAr ? c.CustAccName : (c.CustAccEName || c.CustAccName)}</span></div>`;

    this.reportPrint.printReport(t('IncomingChequeMovement.Title'), cols, body, filtersHtml);
  }
}
