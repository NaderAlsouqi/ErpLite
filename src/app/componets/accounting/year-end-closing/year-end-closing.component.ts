import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ChartOfAccountsService, ChartOfAccountDto } from '../../../shared/services/chart-of-accounts.service';
import {
  YearEndClosingService,
} from '../../../shared/services/year-end-closing.service';

@Component({
  selector: 'app-year-end-closing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule, ConfirmationModalComponent, HasPermissionDirective],
  templateUrl: './year-end-closing.component.html',
  styleUrl: './year-end-closing.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class YearEndClosingComponent implements OnInit, OnDestroy {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  // ─── Form ──────────────────────────────────────────────────
  year = new Date().getFullYear();
  readonly currentYear = new Date().getFullYear();
  pnlAcc: ChartOfAccountDto | null = null;
  closeInventory = false;
  openingInvAcc: ChartOfAccountDto | null = null;
  openingInvValue: number | null = null;
  closingInvAcc: ChartOfAccountDto | null = null;
  closingInvValue: number | null = null;

  accounts: ChartOfAccountDto[] = [];
  lookupLoading = false;

  // ─── Progress / state ──────────────────────────────────────
  busy = false;
  progress = 0;
  statusKey = '';                 // i18n key shown under the progress bar
  pending: 'execute' | 'delete' | null = null;
  private timer: any = null;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t)
      || (item.name  ?? '').toLowerCase().includes(t)
      || (item.Ename ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:         YearEndClosingService,
    private accountsSvc: ChartOfAccountsService,
    private translate:   TranslateService,
    private toastr:      ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.accountsSvc.getAll().subscribe({
      next: data => { this.accounts = (data ?? []).sort((a, b) => a.no - b.no); this.lookupLoading = false; },
      error: () => { this.lookupLoading = false; },
    });
  }

  ngOnDestroy(): void { this.stopTimer(); }

  // ─── Actions ───────────────────────────────────────────────
  askExecute(): void {
    if (this.busy) return;
    if (!this.year) { this.toastr.warning(this.translate.instant('YearEndClosing.YearRequired')); return; }
    if (!this.pnlAcc) { this.toastr.warning(this.translate.instant('YearEndClosing.PnlRequired')); return; }
    if (this.closeInventory) {
      if (!this.openingInvAcc || !this.closingInvAcc) {
        this.toastr.warning(this.translate.instant('YearEndClosing.InvAccRequired')); return;
      }
    }
    this.pending = 'execute';
    this.confirmModal.show();
  }

  askDelete(): void {
    if (this.busy) return;
    if (!this.year) { this.toastr.warning(this.translate.instant('YearEndClosing.YearRequired')); return; }
    this.pending = 'delete';
    this.confirmModal.show();
  }

  onConfirm(): void {
    if (this.pending === 'execute') this.runExecute();
    else if (this.pending === 'delete') this.runDelete();
    this.pending = null;
  }

  onCancel(): void { this.pending = null; }

  private runExecute(): void {
    this.busy = true;
    this.statusKey = 'YearEndClosing.Processing';
    this.startProgress();

    this.svc.execute({
      Year:            this.year,
      PnlAcc:          this.pnlAcc!.no,
      CloseInventory:  this.closeInventory,
      OpeningInvAcc:   this.closeInventory ? (this.openingInvAcc?.no ?? 0) : 0,
      OpeningInvValue: this.closeInventory ? (this.openingInvValue ?? 0) : 0,
      ClosingInvAcc:   this.closeInventory ? (this.closingInvAcc?.no ?? 0) : 0,
      ClosingInvValue: this.closeInventory ? (this.closingInvValue ?? 0) : 0,
    }).subscribe({
      next: res => {
        this.finishProgress();
        this.statusKey = 'YearEndClosing.Done';
        this.busy = false;
        this.toastr.success(
          this.translate.instant('YearEndClosing.SuccessLines', { count: res?.LinesCreated ?? 0 }));
        this.toastr.info(this.translate.instant('YearEndClosing.RestartHint'));
      },
      error: err => {
        this.stopTimer();
        this.progress = 0;
        this.statusKey = '';
        this.busy = false;
        this.toastr.error(err?.error?.message || err?.error?.Message || this.translate.instant('YearEndClosing.Error'));
      },
    });
  }

  private runDelete(): void {
    this.busy = true;
    this.statusKey = 'YearEndClosing.Deleting';
    this.startProgress();

    this.svc.deleteEntry(this.year).subscribe({
      next: res => {
        this.finishProgress();
        this.statusKey = '';
        this.busy = false;
        this.toastr.success(this.translate.instant('YearEndClosing.DeleteSuccess'));
      },
      error: err => {
        this.stopTimer();
        this.progress = 0;
        this.statusKey = '';
        this.busy = false;
        this.toastr.error(err?.error?.message || this.translate.instant('YearEndClosing.Error'));
      },
    });
  }

  // ─── Progress bar (simulated while the request runs) ───────
  private startProgress(): void {
    this.progress = 4;
    this.stopTimer();
    this.timer = setInterval(() => {
      // Ease toward 90% while we wait for the server.
      if (this.progress < 90) this.progress += Math.max(1, Math.round((90 - this.progress) / 12));
    }, 250);
  }
  private finishProgress(): void {
    this.stopTimer();
    this.progress = 100;
  }
  private stopTimer(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  get confirmTitleKey(): string {
    return this.pending === 'delete' ? 'YearEndClosing.ConfirmDeleteTitle' : 'YearEndClosing.ConfirmTitle';
  }
  get confirmMsgKey(): string {
    return this.pending === 'delete' ? 'YearEndClosing.ConfirmDeleteMsg' : 'YearEndClosing.ConfirmMsg';
  }
}
