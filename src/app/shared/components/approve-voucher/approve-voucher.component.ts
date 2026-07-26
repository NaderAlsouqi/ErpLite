import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { VoucherPostingService } from '../../services/voucher-posting.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmationModalComponent } from '../../common/confirmation-modal/confirmation-modal.component';

/**
 * Reusable "اعتماد" (post/approve) control for any screen that stores GL
 * movements in Transf1. Posts every UNPOSTED movement within the given date
 * period (omit the dates to cover everything), then shows a "معتمد" badge when
 * no unposted movement remains in scope. Gated by the Vouchers.Post permission.
 *
 *   <app-approve-voucher [fromDate]="startDate" [toDate]="endDate"
 *                        (changed)="loadData()"></app-approve-voucher>
 */
@Component({
  selector: 'app-approve-voucher',
  standalone: true,
  imports: [CommonModule, TranslateModule, ConfirmationModalComponent],
  template: `
    <ng-container *ngIf="!loading">
      <span *ngIf="unposted === 0" class="approve-badge posted">
        <i class="ti ti-discount-check"></i> {{ 'Vouchers.Posted' | translate }}
      </span>

      <button *ngIf="unposted > 0 && canPost"
        class="btn btn-success btn-sm approve-btn" (click)="confirmModal.show()" [disabled]="posting">
        <span *ngIf="posting" class="spinner-border spinner-border-sm me-1"></span>
        <i *ngIf="!posting" class="ti ti-circle-check me-1"></i>
        {{ 'Vouchers.Approve' | translate }}
        <span class="approve-count">{{ unposted }}</span>
      </button>

      <span *ngIf="unposted > 0 && !canPost" class="approve-badge pending">
        <i class="ti ti-alert-circle"></i> {{ 'Vouchers.Unposted' | translate }}
        <span class="approve-count pending-count">{{ unposted }}</span>
      </span>
    </ng-container>

    <app-confirmation-modal #confirmModal
      [title]="'Vouchers.Approve' | translate"
      [message]="('Vouchers.ApproveConfirm' | translate) + ' (' + unposted + ')'"
      [confirmButtonText]="'Vouchers.Approve' | translate"
      [cancelButtonText]="'General.Cancel' | translate"
      confirmButtonClass="btn-success"
      [processing]="posting"
      (confirm)="approve()">
    </app-confirmation-modal>
  `,
  styles: [`
    .approve-badge.posted {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(34,197,94,.12); color: #15803d;
      border: 1px solid rgba(34,197,94,.35);
      border-radius: 16px; padding: 3px 12px; font-weight: 700; font-size: .8rem;
    }
    .approve-badge.pending {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(245,158,11,.12); color: #b45309;
      border: 1px solid rgba(245,158,11,.35);
      border-radius: 16px; padding: 3px 12px; font-weight: 700; font-size: .8rem;
    }
    .approve-btn { display: inline-flex; align-items: center; }
    .approve-count {
      background: rgba(255,255,255,.85); color: #15803d; font-weight: 700;
      border-radius: 10px; padding: 0 7px; margin-inline-start: 6px; font-size: .75rem;
    }
    .approve-count.pending-count { color: #b45309; }
  `],
})
export class ApproveVoucherComponent implements OnInit, OnChanges {
  @Input() fromDate?: string | Date | null;
  @Input() toDate?: string | Date | null;
  /** Emitted after a successful اعتماد, so the host can reload its list. */
  @Output() changed = new EventEmitter<void>();

  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  unposted = 0;
  loading = false;
  posting = false;
  canPost = false;

  constructor(
    private postingService: VoucherPostingService,
    private auth: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.canPost = this.auth.hasPermission('Vouchers.Post');
    this.refresh();
  }
  ngOnChanges(): void { this.refresh(); }

  private fmt(d: string | Date | null | undefined): string | null {
    if (!d) return null;
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  refresh(): void {
    this.loading = true;
    this.postingService.getUnpostedCount(this.fmt(this.fromDate), this.fmt(this.toDate)).subscribe({
      next: (r) => { this.unposted = r?.unpostedCount ?? 0; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  approve(): void {
    this.posting = true;
    this.postingService.post(this.fmt(this.fromDate), this.fmt(this.toDate)).subscribe({
      next: (r: any) => {
        this.toastr.success(r?.message || this.translate.instant('Vouchers.ApproveSuccess'));
        this.unposted = 0;
        this.posting = false;
        this.changed.emit();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
        this.posting = false;
      }
    });
  }
}
