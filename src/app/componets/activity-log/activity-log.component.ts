import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportService } from '../../shared/services/report.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../shared/common/sharedmodule';
import {
  ActivityLogService,
  ActivityLogDto,
  ActivityLogFilterDto,
} from '../../shared/services/activity-log.service';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatPaginatorModule,
    NgSelectModule,
    SharedModule,
  ],
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityLogComponent implements OnInit {
  rows: ActivityLogDto[] = [];

  loading = false;
  totalItems = 0;
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100];

  modules: string[] = [];

  filter: ActivityLogFilterDto = {
    PageNumber: 1,
    PageSize: 50,
  };

  readonly ACTIONS = ['Add', 'Update', 'Delete', 'Login', 'Logout'];

  readonly STATUS_OPTIONS = [
    { label: 'Success', value: true  },
    { label: 'Failed',  value: false },
  ];

  constructor(
    private activityLogService: ActivityLogService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadModules();
    this.load();
  }

  loadModules(): void {
    this.activityLogService.getModules().subscribe({
      next: (m) => (this.modules = m),
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.activityLogService.getAll({ ...this.filter, PageNumber: this.pageIndex + 1, PageSize: this.pageSize }).subscribe({
      next: (result) => {
        this.rows = result.Logs;
        this.totalItems = result.TotalCount;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilter(): void {
    this.filter = { PageNumber: 1, PageSize: this.pageSize };
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('ActivityLog.LoggedAt') },
      { label: t('ActivityLog.Username') },
      { label: t('ActivityLog.Action') },
      { label: t('ActivityLog.Module') },
      { label: t('ActivityLog.Details') },
      { label: t('ActivityLog.IPAddress') },
      { label: t('ActivityLog.Status') },
    ];
    const rows = this.rows.map(r => {
      const detailsCell = [
        r.Details      ? `<div>${r.Details}</div>` : '',
        r.NewValues    ? `<div style="color:#059669;font-size:0.8em"><strong>${t('ActivityLog.New')}:</strong> ${r.NewValues}</div>` : '',
        r.OldValues    ? `<div style="color:#d97706;font-size:0.8em"><strong>${t('ActivityLog.Old')}:</strong> ${r.OldValues}</div>` : '',
        r.ErrorDetails ? `<div style="color:#dc2626;font-size:0.8em">${r.ErrorDetails}</div>` : '',
      ].join('') || '—';
      return `<tr>
        <td>${r.LoggedAt ? new Date(r.LoggedAt).toLocaleString() : '—'}</td>
        <td>${r.Username ?? '—'}</td>
        <td>${r.Action ?? '—'}</td>
        <td>${r.Module ?? '—'}</td>
        <td>${detailsCell}</td>
        <td>${r.IPAddress ?? '—'}</td>
        <td>${r.IsSuccess ? t('ActivityLog.Success') : t('ActivityLog.Failed')}</td>
      </tr>`;
    }).join('');
    this.reportService.printReport(t('ActivityLog.Title'), cols, rows);
  }
}
