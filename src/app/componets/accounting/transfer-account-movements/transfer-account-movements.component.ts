import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';

@Component({
  selector: 'app-transfer-account-movements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgSelectModule,
    ConfirmationModalComponent,
  ],
  templateUrl: './transfer-account-movements.component.html',
  styleUrl: './transfer-account-movements.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TransferAccountMovementsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  accounts: ChartOfAccountDto[] = [];
  fromAccountNo: number | null = null;
  toAccountNo: number | null = null;
  deleteOldAccount = false;

  loading = false;
  transferring = false;

  constructor(
    private accountsService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.accountsService.getAll().subscribe({
      next: (data) => {
        this.accounts = data.filter(a => !a.branch || a.branch === 0).sort((a, b) => a.no - b.no);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  getAccountName(no: number | null): string {
    if (!no) return '';
    return this.accounts.find(a => a.no === no)?.name ?? '';
  }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t) ||
      (item.name?.toLowerCase().includes(t) ?? false) ||
      (item.Ename?.toLowerCase().includes(t) ?? false);
  };

  transfer(): void {
    if (!this.fromAccountNo) {
      this.toastr.warning(this.translate.instant('TransferAccountMovements.EnterFromAccount'));
      return;
    }
    if (!this.toAccountNo) {
      this.toastr.warning(this.translate.instant('TransferAccountMovements.EnterToAccount'));
      return;
    }
    if (this.fromAccountNo === this.toAccountNo) {
      this.toastr.warning(this.translate.instant('TransferAccountMovements.SameAccountError'));
      return;
    }

    this.confirmModal.title   = this.translate.instant('TransferAccountMovements.ConfirmTitle');
    this.confirmModal.message = this.translate.instant('TransferAccountMovements.ConfirmMessage');
    this.confirmModal.confirmButtonText = this.translate.instant('TransferAccountMovements.Confirm');
    this.confirmModal.cancelButtonText  = this.translate.instant('General.Cancel');
    this.confirmModal.confirmButtonClass = 'btn-danger';
    this.confirmModal.details = [
      { label: this.translate.instant('TransferAccountMovements.FromAccount'), value: `${this.fromAccountNo} — ${this.getAccountName(this.fromAccountNo)}` },
      { label: this.translate.instant('TransferAccountMovements.ToAccount'),   value: `${this.toAccountNo} — ${this.getAccountName(this.toAccountNo)}` },
    ];
    this.confirmModal.show();
  }

  onConfirm(): void {
    this.confirmModal.hide();
    this.transferring = true;
    this.accountsService.transferAccountMovements(this.fromAccountNo!, this.toAccountNo!, this.deleteOldAccount).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('TransferAccountMovements.Success'));
        this.fromAccountNo = null;
        this.toAccountNo   = null;
        this.deleteOldAccount = false;
        this.transferring = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('TransferAccountMovements.Error'));
        this.transferring = false;
      },
    });
  }

  onCancel(): void {}
}
