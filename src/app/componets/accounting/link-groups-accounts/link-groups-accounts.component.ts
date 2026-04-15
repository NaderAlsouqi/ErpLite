import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { AccGroupLinkDto, AccGroupLinkService } from '../../../shared/services/acc-group-link.service';
import { AccountGroupDto, AccountGroupsService } from '../../../shared/services/account-groups.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ReportService } from '../../../shared/services/report.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-link-groups-accounts',
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
  templateUrl: './link-groups-accounts.component.html',
  styleUrl: './link-groups-accounts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LinkGroupsAccountsComponent implements OnInit {
  @ViewChild('deleteConfirmModal') deleteConfirmModal!: ConfirmationModalComponent;

  links: AccGroupLinkDto[] = [];
  accounts: ChartOfAccountDto[] = [];
  groups: AccountGroupDto[] = [];

  selectedAccNo: number | null = null;
  selectedGroupNo: number | null = null;

  searchTerm = '';
  loading = false;
  saving = false;

  pendingDelete: AccGroupLinkDto | null = null;

  constructor(
    private linkService: AccGroupLinkService,
    private accountsService: ChartOfAccountsService,
    private groupsService: AccountGroupsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      accounts: this.accountsService.getAll(),
      groups:   this.groupsService.getAll(),
    }).subscribe({
      next: ({ accounts, groups }) => {
        this.accounts = accounts.filter(a => !a.branch || a.branch === 0).sort((a, b) => a.no - b.no);
        this.groups = groups.sort((a, b) => a.GroupNo - b.GroupNo);
        this.loading = false;
        this.reloadLinks();
      },
      error: () => { this.loading = false; },
    });
  }

  private reloadLinks(): void {
    this.linkService.getAll().subscribe({
      next: (links) => { this.links = links; },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.ConnectionError'));
      },
    });
  }

  get filteredLinks(): AccGroupLinkDto[] {
    if (!this.searchTerm.trim()) return this.links;
    const t = this.searchTerm.trim().toLowerCase();
    return this.links.filter(l =>
      String(l.AccNo).includes(t) ||
      l.AccountName?.toLowerCase().includes(t) ||
      String(l.GroupNo).includes(t) ||
      l.GroupName?.toLowerCase().includes(t)
    );
  }

  getAccountLabel(accNo: number): string {
    const acc = this.accounts.find(a => a.no === accNo);
    return acc ? `${accNo} — ${acc.name ?? ''}` : String(accNo);
  }

  getGroupLabel(groupNo: number): string {
    const g = this.groups.find(g => g.GroupNo === groupNo);
    return g ? `${groupNo} — ${g.GroupName ?? ''}` : String(groupNo);
  }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t) ||
      (item.name?.toLowerCase().includes(t) ?? false) ||
      (item.Ename?.toLowerCase().includes(t) ?? false);
  };

  groupSearchFn = (term: string, item: AccountGroupDto): boolean => {
    const t = term.toLowerCase();
    return String(item.GroupNo).includes(t) ||
      (item.GroupName?.toLowerCase().includes(t) ?? false) ||
      (item.GroupEname?.toLowerCase().includes(t) ?? false);
  };

  addLink(): void {
    if (this.selectedAccNo == null || this.selectedGroupNo == null) {
      this.toastr.warning(this.translate.instant('LinkGroupsAccounts.SelectBoth'));
      return;
    }

    const exists = this.links.some(
      l => l.AccNo === this.selectedAccNo && l.GroupNo === this.selectedGroupNo
    );
    if (exists) {
      this.toastr.warning(this.translate.instant('LinkGroupsAccounts.AlreadyLinked'));
      return;
    }

    this.saving = true;
    const dto: AccGroupLinkDto = { AccNo: this.selectedAccNo, GroupNo: this.selectedGroupNo };
    this.linkService.add(dto).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('LinkGroupsAccounts.AddSuccess'));
        this.selectedAccNo = null;
        this.selectedGroupNo = null;
        this.saving = false;
        this.reloadLinks();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.saving = false;
      },
    });
  }

  confirmDelete(link: AccGroupLinkDto): void {
    this.pendingDelete = link;
    this.deleteConfirmModal.title   = this.translate.instant('LinkGroupsAccounts.DeleteConfirmTitle');
    this.deleteConfirmModal.message = this.translate.instant('LinkGroupsAccounts.DeleteConfirmMessage');
    this.deleteConfirmModal.confirmButtonText = this.translate.instant('General.Delete');
    this.deleteConfirmModal.cancelButtonText  = this.translate.instant('General.Cancel');
    this.deleteConfirmModal.confirmButtonClass = 'btn-danger';
    this.deleteConfirmModal.details = [
      { label: this.translate.instant('LinkGroupsAccounts.Account'), value: this.getAccountLabel(link.AccNo) },
      { label: this.translate.instant('LinkGroupsAccounts.Group'),   value: this.getGroupLabel(link.GroupNo) },
    ];
    this.deleteConfirmModal.show();
  }

  onDeleteConfirm(): void {
    if (!this.pendingDelete) return;
    const { AccNo, GroupNo } = this.pendingDelete;
    this.deleteConfirmModal.hide();
    this.linkService.delete(AccNo, GroupNo).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('LinkGroupsAccounts.DeleteSuccess'));
        this.pendingDelete = null;
        this.reloadLinks();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('General.Error'));
        this.pendingDelete = null;
      },
    });
  }

  onDeleteCancel(): void {
    this.pendingDelete = null;
  }

  trackByLink(_: number, link: AccGroupLinkDto): string {
    return `${link.AccNo}_${link.GroupNo}`;
  }

  printTable(): void {
    const title = this.translate.instant('LinkGroupsAccounts.Title');
    const cols = [
      { label: this.translate.instant('LinkGroupsAccounts.AccountNo') },
      { label: this.translate.instant('LinkGroupsAccounts.AccountName') },
      { label: this.translate.instant('LinkGroupsAccounts.GroupNo') },
      { label: this.translate.instant('LinkGroupsAccounts.GroupName') },
      { label: this.translate.instant('LinkGroupsAccounts.GroupEname') },
    ];
    const rows = this.filteredLinks.map(l =>
      `<tr><td>${l.AccNo}</td><td>${l.AccountName ?? '—'}</td><td>${l.GroupNo}</td><td>${l.GroupName ?? '—'}</td><td>${l.GroupEname ?? ''}</td></tr>`
    ).join('');
    this.reportService.printReport(title, cols, rows);
  }
}
