import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccfService, RenameAccountDto } from '../../../shared/services/accf.service';
import { ReportService } from '../../../shared/services/report.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

interface EditRow {
  no: number;
  name: string | null;
  Ename: string | null;
  level: number | null;
  belong: number | null;
  Stopped: number | null;
  _origName: string | null;
  _origEname: string | null;
}

@Component({
  selector: 'app-edit-account-name',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    MatPaginatorModule,
    HasPermissionDirective,
  ],
  templateUrl: './edit-account-name.component.html',
  styleUrl: './edit-account-name.component.scss',
})
export class EditAccountNameComponent implements OnInit {

  allRows:   EditRow[] = [];
  pagedRows: EditRow[] = [];
  selected:  EditRow | null = null;

  pageSize        = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex       = 0;
  totalItems      = 0;

  loading   = false;
  saving    = false;
  searchTerm = '';

  get isFormDirty(): boolean {
    return this.selected !== null && this.isDirty(this.selected);
  }

  isDirty(row: EditRow): boolean {
    return row.name !== row._origName || row.Ename !== row._origEname;
  }

  constructor(
    private accfService:   AccfService,
    private toastr:        ToastrService,
    private translate:     TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.accfService.getAllNames().subscribe({
      next: (data) => {
        this.allRows = data.map(d => ({
          no:       d.no,
          name:     d.name    ?? null,
          Ename:    d.Ename   ?? null,
          level:    d.level   ?? null,
          belong:   d.belong  ?? null,
          Stopped:  d.Stopped ?? null,
          _origName:  d.name  ?? null,
          _origEname: d.Ename ?? null,
        }));
        this.totalItems = this.allRows.length;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || err?.message || 'Failed to load accounts');
      },
    });
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  onSelectRow(row: EditRow): void {
    if (this.selected === row) return;
    this.selected = row;
  }

  saveSelected(): void {
    if (!this.selected || !this.isDirty(this.selected)) return;
    this.saving = true;
    const row = this.selected;
    const payload: RenameAccountDto[] = [{
      no:    row.no,
      name:  row.name,
      Ename: row.Ename?.trim() ? row.Ename : row.name,
    }];
    this.accfService.renameBatch(payload).subscribe({
      next: () => {
        row._origName  = row.name;
        row._origEname = row.Ename;
        this.toastr.success(this.translate.instant('EditAccountName.SaveSuccess', { count: 1 }));
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.message || err?.message || 'Save failed');
      },
    });
  }

  discardSelected(): void {
    if (!this.selected) return;
    this.selected.name  = this.selected._origName;
    this.selected.Ename = this.selected._origEname;
  }

  // ── Search / Paging ──────────────────────────────────────────────────────────

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const filtered = term
      ? this.allRows.filter(r =>
          r.no.toString().includes(term) ||
          r.name?.toLowerCase().includes(term) ||
          r.Ename?.toLowerCase().includes(term)
        )
      : [...this.allRows];

    this.totalItems = filtered.length;
    const start = this.pageIndex * this.pageSize;
    this.pagedRows = filtered.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.applyFilter();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  trackByNo(_: number, row: EditRow): number {
    return row.no;
  }

  printTable(): void {
    const title = this.translate.instant('EditAccountName.Title');
    const cols = [
      { label: this.translate.instant('EditAccountName.AccountNo')   },
      { label: this.translate.instant('EditAccountName.ArabicName')  },
      { label: this.translate.instant('EditAccountName.EnglishName') },
      { label: this.translate.instant('EditAccountName.Level')       },
      { label: this.translate.instant('EditAccountName.BelongTo')    },
    ];
    const rows = this.allRows
      .map(r => `<tr><td>${r.no}</td><td>${r.name ?? '—'}</td><td>${r.Ename ?? '—'}</td><td>${r.level ?? '—'}</td><td>${r.belong ?? '—'}</td></tr>`)
      .join('');
    this.reportService.printReport(title, cols, rows);
  }
}
