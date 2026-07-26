import { Pipe, PipeTransform } from '@angular/core';

/**
 * Client-side pagination slice. Usage:
 *   *ngFor="let r of rows | paginate:page:pageSize"
 * Impure so it also reflects in-place mutations (CRUD add/delete, in-place sort)
 * — client-side pagination implies modest arrays, so re-slicing per CD tick is
 * cheap, and only the visible page's pipes run. Footer totals should be computed
 * from the full array, not this slice.
 */
@Pipe({ name: 'paginate', standalone: true, pure: false })
export class PaginatePipe implements PipeTransform {
  transform<T>(items: T[] | null | undefined, page: number, pageSize: number): T[] {
    if (!items || items.length === 0) { return []; }
    const size = pageSize && pageSize > 0 ? pageSize : items.length;
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const p = Math.min(Math.max(1, page || 1), totalPages);
    const start = (p - 1) * size;
    return items.slice(start, start + size);
  }
}
