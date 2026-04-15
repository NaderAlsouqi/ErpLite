import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalConfig, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccountGroupDto, AccountGroupsService } from '../../../shared/services/account-groups.service';
import { ReportService } from '../../../shared/services/report.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-account-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgbModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    ConfirmationModalComponent,
  ],
  providers: [NgbModalConfig, NgbModal],
  templateUrl: './account-groups.component.html',
  styleUrl: './account-groups.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountGroupsComponent implements OnInit {
  @ViewChild('groupFormModal') groupFormModal!: TemplateRef<any>;
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  displayedColumns: string[] = ['GroupNo', 'GroupName', 'GroupEname', 'Actions'];
  dataSource = new MatTableDataSource<AccountGroupDto>([]);
  allData: AccountGroupDto[] = [];

  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  pageIndex = 0;
  totalItems = 0;

  loading = false;
  submitted = false;
  isEditMode = false;
  modalRef!: NgbModalRef;
  searchTerm = '';
  selectedId: number | null = null;

  groupForm: AccountGroupDto = { GroupNo: 0, GroupName: '', GroupEname: '' };

  constructor(
    private groupsService: AccountGroupsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private reportService: ReportService
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.groupsService.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.totalItems = data.length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.submitted = false;
    const nextNo = this.allData.length > 0
      ? Math.max(...this.allData.map(g => g.GroupNo)) + 1
      : 1;
    this.groupForm = { GroupNo: nextNo, GroupName: '', GroupEname: '' };
    this.modalRef = this.modalService.open(this.groupFormModal, {
      centered: true, size: 'md', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  openEditModal(group: AccountGroupDto): void {
    this.isEditMode = true;
    this.submitted = false;
    this.selectedId = group.GroupNo;
    this.groupForm = { ...group };
    this.modalRef = this.modalService.open(this.groupFormModal, {
      centered: true, size: 'md', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  saveGroup(): void {
    this.submitted = true;
    if (!this.groupForm.GroupName?.trim() || !this.groupForm.GroupEname?.trim()) return;
    if (!this.isEditMode && (!this.groupForm.GroupNo || this.groupForm.GroupNo <= 0)) return;

    this.loading = true;

    if (this.isEditMode && this.selectedId != null) {
      this.groupsService.update(this.selectedId, this.groupForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('AccountGroups.UpdateSuccess'));
          this.modalRef?.close();
          this.loadGroups();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    } else {
      this.groupsService.add(this.groupForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('AccountGroups.AddSuccess'));
          this.modalRef?.close();
          this.loadGroups();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    }
  }

  confirmDelete(group: AccountGroupDto): void {
    this.selectedId = group.GroupNo;
    this.confirmModal.show();
  }

  deleteGroup(): void {
    if (this.selectedId == null) return;
    this.loading = true;
    this.groupsService.delete(this.selectedId).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('AccountGroups.DeleteSuccess'));
        this.loadGroups();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    const filtered = term
      ? this.allData.filter(
          (g) =>
            g.GroupName?.toLowerCase().includes(term) ||
            g.GroupEname?.toLowerCase().includes(term) ||
            g.GroupNo?.toString().includes(term)
        )
      : [...this.allData];

    this.totalItems = filtered.length;
    const start = this.pageIndex * this.pageSize;
    this.dataSource.data = filtered.slice(start, start + this.pageSize);
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) return;
    this.allData.sort((a, b) => {
      const asc = sort.direction === 'asc';
      switch (sort.active) {
        case 'GroupNo':    return this.compare(a.GroupNo, b.GroupNo, asc);
        case 'GroupName':  return this.compare(a.GroupName, b.GroupName, asc);
        case 'GroupEname': return this.compare(a.GroupEname, b.GroupEname, asc);
        default: return 0;
      }
    });
    this.pageIndex = 0;
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilter();
  }

  private compare(a: any, b: any, asc: boolean): number {
    return (a < b ? -1 : 1) * (asc ? 1 : -1);
  }

  printTable(): void {
    const title = this.translate.instant('AccountGroups.Title');
    const cols = [
      { label: this.translate.instant('AccountGroups.GroupNo'),     key: 'GroupNo' },
      { label: this.translate.instant('AccountGroups.ArabicName'),  key: 'GroupName' },
      { label: this.translate.instant('AccountGroups.EnglishName'), key: 'GroupEname' },
    ];
    const rows = this.allData.map(r =>
      cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>')
    ).map(r => `<tr><td>${r}</td></tr>`).join('');
    
    this.reportService.printReport(title, cols, rows);
  }
}
