import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AccfService, RenameAccountDto } from '../../../shared/services/accf.service';
import { ReportService } from '../../../shared/services/report.service';

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
    RouterModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './edit-account-name.component.html',
  styleUrl: './edit-account-name.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EditAccountNameComponent implements OnInit {
  displayedColumns: string[] = ['no', 'name', 'Ename', 'level', 'belong', 'Stopped'];
  dataSource = new MatTableDataSource<EditRow>([]);

  allRows: EditRow[] = [];
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 0;
  totalItems = 0;

  loading = false;
  saving = false;
  searchTerm = '';

  get dirtyCount(): number {
    return this.allRows.filter(r => this.isDirty(r)).length;
  }

  isDirty(row: EditRow): boolean {
    return row.name !== row._origName || row.Ename !== row._origEname;
  }

  constructor(
    private accfService: AccfService,
    private toastr: ToastrService,
    private translate: TranslateService,
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
          no: d.no,
          name: d.name ?? null,
          Ename: d.Ename ?? null,
          level: d.level ?? null,
          belong: d.belong ?? null,
          Stopped: d.Stopped ?? null,
          _origName: d.name ?? null,
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

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const filtered = term
      ? this.allRows.filter(
          r =>
            r.no.toString().includes(term) ||
            r.name?.toLowerCase().includes(term) ||
            r.Ename?.toLowerCase().includes(term)
        )
      : [...this.allRows];

    this.totalItems = filtered.length;
    const start = this.pageIndex * this.pageSize;
    this.dataSource.data = filtered.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilter();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.applyFilter();
      return;
    }
    this.allRows.sort((a, b) => {
      const asc = sort.direction === 'asc';
      switch (sort.active) {
        case 'no':     return this.compare(a.no, b.no, asc);
        case 'name':   return this.compare(a.name, b.name, asc);
        case 'Ename':  return this.compare(a.Ename, b.Ename, asc);
        case 'level':  return this.compare(a.level, b.level, asc);
        case 'belong': return this.compare(a.belong, b.belong, asc);
        default: return 0;
      }
    });
    this.pageIndex = 0;
    this.applyFilter();
  }

  private compare(a: any, b: any, asc: boolean): number {
    if (a == null) return asc ? 1 : -1;
    if (b == null) return asc ? -1 : 1;
    return (a < b ? -1 : a > b ? 1 : 0) * (asc ? 1 : -1);
  }

  saveAll(): void {
    const dirty = this.allRows.filter(r => this.isDirty(r));
    if (!dirty.length) {
      this.toastr.info(this.translate.instant('EditAccountName.NoChanges'));
      return;
    }
    this.saving = true;
    const payload: RenameAccountDto[] = dirty.map(r => ({
      no: r.no,
      name: r.name,
      // Mirror VB6 logic: if English name is blank, copy Arabic name
      Ename: r.Ename?.trim() ? r.Ename : r.name,
    }));
    this.accfService.renameBatch(payload).subscribe({
      next: () => {
        dirty.forEach(r => {
          r._origName = r.name;
          r._origEname = r.Ename;
        });
        this.toastr.success(
          this.translate.instant('EditAccountName.SaveSuccess', { count: dirty.length })
        );
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
        this.toastr.error(err?.error?.message || err?.message || 'Save failed');
      },
    });
  }

  discardAll(): void {
    this.allRows.forEach(r => {
      r.name = r._origName;
      r.Ename = r._origEname;
    });
    this.applyFilter();
  }

  printTable(): void {
    const title = this.translate.instant('EditAccountName.Title');
    const cols = [
      { label: this.translate.instant('EditAccountName.AccountNo'),   key: 'no' },
      { label: this.translate.instant('EditAccountName.ArabicName'),  key: 'name' },
      { label: this.translate.instant('EditAccountName.EnglishName'), key: 'Ename' },
      { label: this.translate.instant('EditAccountName.Level'),       key: 'level' },
      { label: this.translate.instant('EditAccountName.BelongTo'),    key: 'belong' },
    ];
    const rows = this.allRows
      .map(r => cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>'))
      .map(r => `<tr><td>${r}</td></tr>`)
      .join('');
    this.reportService.printReport(title, cols, rows);
  }
}
