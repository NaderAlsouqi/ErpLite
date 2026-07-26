import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Reusable client-side paginator control (Bootstrap). Presentational only —
 * it owns no data, just the current page / page size, and works with the
 * `paginate` pipe on the host's row *ngFor.
 *
 *   <app-paginator [total]="rows.length" [(page)]="page" [(pageSize)]="pageSize"></app-paginator>
 *   <tr *ngFor="let r of rows | paginate:page:pageSize"> ... </tr>
 *
 * Bilingual/RTL-safe (the chevrons use logical prev/next, not left/right).
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  encapsulation: ViewEncapsulation.None,
  template: `
  <div *ngIf="total > 0"
       class="app-paginator d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">

    <div class="d-flex align-items-center gap-2 flex-wrap">
      <span class="text-muted small">
        {{ 'Paginator.Showing' | translate }} {{ startRow }}–{{ endRow }} {{ 'Paginator.Of' | translate }} {{ total }}
      </span>
      <div class="d-flex align-items-center gap-1">
        <select class="form-select form-select-sm app-paginator-size" [ngModel]="pageSize" (ngModelChange)="onSize($event)">
          <option *ngFor="let s of pageSizeOptions" [ngValue]="s">{{ s }}</option>
        </select>
        <span class="text-muted small">{{ 'Paginator.PerPage' | translate }}</span>
      </div>
    </div>

    <nav *ngIf="totalPages > 1" aria-label="pagination">
      <ul class="pagination pagination-sm mb-0 flex-wrap">
        <li class="page-item" [class.disabled]="currentPage === 1">
          <a class="page-link" role="button" (click)="go(currentPage - 1)" aria-label="Previous">
            <i class="ti ti-chevron-right d-none-ltr"></i><span aria-hidden="true">‹</span>
          </a>
        </li>
        <li class="page-item" *ngFor="let n of pages" [class.active]="n === currentPage" [class.disabled]="n < 0">
          <a class="page-link" role="button" *ngIf="n > 0" (click)="go(n)">{{ n }}</a>
          <span class="page-link" *ngIf="n < 0">…</span>
        </li>
        <li class="page-item" [class.disabled]="currentPage === totalPages">
          <a class="page-link" role="button" (click)="go(currentPage + 1)" aria-label="Next">
            <span aria-hidden="true">›</span>
          </a>
        </li>
      </ul>
    </nav>
  </div>
  `,
})
export class PaginatorComponent {
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number { return Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 1))); }
  get currentPage(): number { return Math.min(Math.max(1, this.page || 1), this.totalPages); }
  get startRow(): number { return this.total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get endRow(): number { return Math.min(this.currentPage * this.pageSize, this.total); }

  /** Windowed page list; negative entries render as an ellipsis. */
  get pages(): number[] {
    const tp = this.totalPages, cur = this.currentPage;
    if (tp <= 7) { return Array.from({ length: tp }, (_, i) => i + 1); }
    const out: number[] = [1];
    const from = Math.max(2, cur - 1), to = Math.min(tp - 1, cur + 1);
    if (from > 2) { out.push(-1); }
    for (let i = from; i <= to; i++) { out.push(i); }
    if (to < tp - 1) { out.push(-2); }
    out.push(tp);
    return out;
  }

  go(p: number): void {
    const np = Math.min(Math.max(1, p), this.totalPages);
    if (np !== this.currentPage) { this.pageChange.emit(np); }
  }

  onSize(size: number): void {
    this.pageSizeChange.emit(size);
    this.pageChange.emit(1);   // reset to first page when page size changes
  }
}
