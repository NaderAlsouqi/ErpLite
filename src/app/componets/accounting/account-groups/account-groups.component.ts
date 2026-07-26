import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccountGroupDto, AccountGroupsService } from '../../../shared/services/account-groups.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-account-groups',
  standalone: true,
  imports: [
    ReportExportComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
    PaginatorComponent,
    PaginatePipe,
  ],
  templateUrl: './account-groups.component.html',
  styleUrl: './account-groups.component.scss',
})
export class AccountGroupsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  groups: AccountGroupDto[] = [];
  filteredGroups: AccountGroupDto[] = [];
  filterName: string = '';

  currentGroup: AccountGroupDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private groupsService: AccountGroupsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  private initForm(): AccountGroupDto {
    return { GroupNo: 0, GroupName: '', GroupEname: '' };
  }

  loadGroups(): void {
    this.loading = true;
    this.groupsService.getAll().subscribe({
      next: (data) => {
        this.groups = data;
        this.applyFilters();
        this.setNextGroupNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextGroupNo(): void {
    const max = this.groups.length > 0
      ? Math.max(...this.groups.map(g => g.GroupNo))
      : 0;
    this.currentGroup.GroupNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredGroups = this.groups.filter(g =>
      !term ||
      g.GroupNo.toString().includes(term) ||
      g.GroupName?.toLowerCase().includes(term) ||
      g.GroupEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onGroupNoChange(): void {
    const no = +this.currentGroup.GroupNo;
    if (!no) return;
    const existing = this.groups.find(g => +g.GroupNo === no);
    if (existing) {
      this.currentGroup = { ...existing };
    }
  }

  onSelectGroup(group: AccountGroupDto): void {
    this.currentGroup = { ...group };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;

    const isEdit = this.groups.some(g => +g.GroupNo === +this.currentGroup.GroupNo);
    this.saving = true;

    const request = isEdit
      ? this.groupsService.update(this.currentGroup.GroupNo, this.currentGroup)
      : this.groupsService.add(this.currentGroup);

    request.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.loadGroups();
        this.reset();
        this.saving = false;
      },
      error: (err: any) => {
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg);
        this.saving = false;
      }
    });
  }

  delete(): void {
    if (!this.currentGroup.GroupNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.groupsService.delete(this.currentGroup.GroupNo).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess'));
        this.loadGroups();
        this.reset();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  reset(): void {
    this.currentGroup = this.initForm();
    this.setNextGroupNo();
  }

  validate(): boolean {
    if (!this.currentGroup.GroupNo || this.currentGroup.GroupNo <= 0) {
      this.toastr.warning(this.translate.instant('AccountGroups.GroupNoRequired'));
      return false;
    }
    if (!this.currentGroup.GroupName?.trim()) {
      this.toastr.warning(this.translate.instant('AccountGroups.ArabicNameRequired'));
      return false;
    }
    if (!this.currentGroup.GroupEname?.trim()) {
      this.toastr.warning(this.translate.instant('AccountGroups.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('AccountGroups.GroupNo') },
      { label: t('AccountGroups.ArabicName') },
      { label: t('AccountGroups.EnglishName') },
    ];
    const rows = this.filteredGroups.map(g =>
      `<tr><td>${g.GroupNo ?? '—'}</td><td>${g.GroupName ?? '—'}</td><td>${g.GroupEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('AccountGroups.Title'), cols, rows);
  }
}
