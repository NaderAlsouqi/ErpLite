import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { Branch, BranchesService } from '../../../../shared/services/branches.service';
import { ConfirmationModalComponent } from '../../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../../shared/services/report.service';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss'
})
export class BranchesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  branches: Branch[] = [];
  filteredBranches: Branch[] = [];
  filterName: string = '';

  currentBranch: Branch = this.initForm();
  loading = false;
  saving = false;

  constructor(
    private branchesService: BranchesService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadBranches();
  }

  private initForm(): Branch {
    return {
      BranchNo: 0,
      BranchArName: '',
      BranchEnName: ''
    };
  }

  loadBranches(): void {
    this.loading = true;
    this.branchesService.getAll().subscribe({
      next: (data) => {
        this.branches = data;
        this.applyFilters();
        this.setNextBranchNo();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  private setNextBranchNo(): void {
    const max = this.branches.length > 0
      ? Math.max(...this.branches.map(b => b.BranchNo))
      : 0;
    this.currentBranch.BranchNo = max + 1;
  }

  applyFilters(): void {
    this.filteredBranches = this.branches.filter(b => {
      if (!this.filterName) return true;
      const term = this.filterName.toLowerCase();
      return (
        b.BranchArName?.toLowerCase().includes(term) ||
        b.BranchEnName?.toLowerCase().includes(term) ||
        b.BranchNo.toString().includes(term)
      );
    });
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onBranchNoChange(): void {
    const existing = this.branches.find(b => b.BranchNo === +this.currentBranch.BranchNo);
    if (existing) {
      this.currentBranch = { ...existing };
    }
  }

  onSelectBranch(branch: Branch): void {
    this.currentBranch = { ...branch };
  }

  save(): void {
    if (!this.validate()) return;

    this.saving = true;
    this.branchesService.save(this.currentBranch).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || this.translate.instant('General.SaveSuccess'));
        this.loadBranches();
        this.reset();
        this.saving = false;
      },
      error: (err) => {
        const msg = err.error?.message || err.error?.Message || JSON.stringify(err.error) || this.translate.instant('General.Error');
        this.toastr.error(msg);
        this.saving = false;
      }
    });
  }

  delete(): void {
    if (!this.currentBranch.BranchNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.branchesService.delete(this.currentBranch.BranchNo).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || this.translate.instant('General.DeleteSuccess'));
        this.loadBranches();
        this.reset();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  reset(): void {
    this.currentBranch = this.initForm();
    this.setNextBranchNo();
  }

  validate(): boolean {
    if (!this.currentBranch.BranchNo) {
      this.toastr.warning(this.translate.instant('Branch.EnterBranchNo'));
      return false;
    }
    if (!this.currentBranch.BranchArName) {
      this.toastr.warning(this.translate.instant('Branch.EnterArabicName'));
      return false;
    }
    if (!this.currentBranch.BranchEnName) {
      this.toastr.warning(this.translate.instant('Branch.EnterEnglishName'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Branch.BranchNo') },
      { label: t('Branch.ArabicName') },
      { label: t('Branch.EnglishName') },
    ];
    const rows = this.filteredBranches.map(b =>
      `<tr><td>${b.BranchNo}</td><td>${b.BranchArName ?? '—'}</td><td>${b.BranchEnName ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Branch.List'), cols, rows);
  }
}
