import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { AccountGroupsService, AccountGroupDto } from '../../../shared/services/account-groups.service';
import {
  AccountsGroupsReportService,
  AccountsGroupsReportRowDto,
} from '../../../shared/services/accounts-groups-report.service';

@Component({
  selector: 'app-accounts-groups-report',
  standalone: true,
  imports: [
    ReportExportComponent,CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, PaginatorComponent, PaginatePipe],
  templateUrl: './accounts-groups-report.component.html',
  styleUrl: './accounts-groups-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AccountsGroupsReportComponent implements OnInit {

  // ─── Filters (mirroring the VB6 form) ──────────────────────
  selectedGroup: AccountGroupDto | null = null;
  groups: AccountGroupDto[] = [];
  lookupLoading = false;

  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());

  // ─── Results ───────────────────────────────────────────────
  rows: AccountsGroupsReportRowDto[] = [];
  loading = false;
  fetched = false;
  page = 1;
  pageSize = 10;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  get totBegDebit():    number { return this.rows.reduce((s, r) => s + r.BegDebit,   0); }
  get totBegCredit():   number { return this.rows.reduce((s, r) => s + r.BegCredit,  0); }
  get totDebitTrans():  number { return this.rows.reduce((s, r) => s + r.DebitTrans, 0); }
  get totCreditTrans(): number { return this.rows.reduce((s, r) => s + r.CreditTrans,0); }
  get totEndDebit():    number { return this.rows.reduce((s, r) => s + r.EndDebit,   0); }
  get totEndCredit():   number { return this.rows.reduce((s, r) => s + r.EndCredit,  0); }

  groupSearchFn = (term: string, item: AccountGroupDto): boolean => {
    const t = term.toLowerCase();
    return String(item.GroupNo).includes(t)
      || (item.GroupName  ?? '').toLowerCase().includes(t)
      || (item.GroupEname ?? '').toLowerCase().includes(t);
  };

  constructor(
    private svc:        AccountsGroupsReportService,
    private groupsSvc:  AccountGroupsService,
    public reportPrint: ReportService,
    private translate:  TranslateService,
    private toastr:     ToastrService,
  ) {}

  ngOnInit(): void {
    this.lookupLoading = true;
    this.groupsSvc.getAll().subscribe({
      next: data => {
        this.groups = (data ?? []).sort((a, b) => a.GroupNo - b.GroupNo);
        this.lookupLoading = false;
      },
      error: () => { this.lookupLoading = false; },
    });
  }

  groupLabel(g: AccountGroupDto): string {
    return this.isAr ? g.GroupName : (g.GroupEname || g.GroupName);
  }

  generate(): void {
    if (!this.selectedGroup) {
      this.toastr.warning(this.translate.instant('AccountsGroupsReport.GroupRequired'));
      return;
    }
    if (this.dateFrom > this.dateTo) {
      this.toastr.warning(this.translate.instant('AccountsGroupsReport.DateError'));
      return;
    }

    this.loading = true;
    this.fetched = false;
    this.rows = [];

    this.svc.getReport({
      GroupNo:  this.selectedGroup.GroupNo,
      DateFrom: this.dateFrom,
      DateTo:   this.dateTo,
    }).subscribe({
      next: data => {
        this.rows = data ?? [];
        this.page = 1;
        this.fetched = true;
        this.loading = false;
        if (this.rows.length === 0) {
          this.toastr.info(this.translate.instant('AccountsGroupsReport.NoData'));
        }
      },
      error: () => { this.loading = false; },
    });
  }

  onFilterChange(): void {
    this.fetched = false;
    this.rows = [];
  }

  print(): void {
    if (this.rows.length === 0) return;
    const t   = (k: string) => this.translate.instant(k);
    const fmt = (n: number) => (n ?? 0).toFixed(3);

    const cols = [
      { label: t('AccountsGroupsReport.AccNo') },
      { label: t('AccountsGroupsReport.AccName') },
      { label: t('AccountsGroupsReport.BegDebit') },
      { label: t('AccountsGroupsReport.BegCredit') },
      { label: t('AccountsGroupsReport.DebitTrans') },
      { label: t('AccountsGroupsReport.CreditTrans') },
      { label: t('AccountsGroupsReport.EndDebit') },
      { label: t('AccountsGroupsReport.EndCredit') },
    ];

    const rowsHtml = this.rows.map(r => `<tr>
      <td>${r.AccNo}</td>
      <td>${this.isAr ? r.AccName : (r.AccEName || r.AccName)}</td>
      <td style="text-align:end">${fmt(r.BegDebit)}</td>
      <td style="text-align:end">${fmt(r.BegCredit)}</td>
      <td style="text-align:end">${fmt(r.DebitTrans)}</td>
      <td style="text-align:end">${fmt(r.CreditTrans)}</td>
      <td style="text-align:end">${fmt(r.EndDebit)}</td>
      <td style="text-align:end">${fmt(r.EndCredit)}</td>
    </tr>`).join('');

    const totRow = `<tr style="font-weight:700;background:#dbeafe">
      <td colspan="2">${t('General.Total')}</td>
      <td style="text-align:end">${fmt(this.totBegDebit)}</td>
      <td style="text-align:end">${fmt(this.totBegCredit)}</td>
      <td style="text-align:end">${fmt(this.totDebitTrans)}</td>
      <td style="text-align:end">${fmt(this.totCreditTrans)}</td>
      <td style="text-align:end">${fmt(this.totEndDebit)}</td>
      <td style="text-align:end">${fmt(this.totEndCredit)}</td>
    </tr>`;

    const filtersHtml = `
      <div class="filter-item"><span class="filter-label">${t('AccountsGroupsReport.Group')}:</span><span class="filter-value">${this.selectedGroup!.GroupNo} — ${this.groupLabel(this.selectedGroup!)}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateFrom')}:</span><span class="filter-value">${this.dateFrom}</span></div>
      <div class="filter-item"><span class="filter-label">${t('General.DateTo')}:</span><span class="filter-value">${this.dateTo}</span></div>`;

    this.reportPrint.printReport(t('AccountsGroupsReport.Title'), cols, rowsHtml + totRow, filtersHtml);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
