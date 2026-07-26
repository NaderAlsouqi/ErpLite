import { ActivatedRoute } from '@angular/router';

/**
 * Applies URL query parameters onto a component's own filter fields and,
 * if any were applied, invokes the run/generate callback.
 *
 * Used by report pages so that a workflow "View report" deep-link
 * (e.g. ?dateFrom=2026-01-01&dateTo=2026-12-31&level=1) pre-fills the
 * filters and auto-runs the report. Only keys that already exist on the
 * target component are assigned, and each value is coerced to the current
 * field's type (number / boolean / string), so nothing unexpected is set.
 */
export function applyQueryParams(route: ActivatedRoute, target: any, run?: () => void): boolean {
  const qp = route.snapshot.queryParamMap;
  if (!qp.keys.length) return false;

  let applied = false;
  for (const key of qp.keys) {
    if (!(key in target)) continue;
    const raw = qp.get(key);
    if (raw == null) continue;

    const current = target[key];
    let value: any = raw;
    if (typeof current === 'number') {
      const n = Number(raw);
      if (!isNaN(n)) value = n;
    } else if (typeof current === 'boolean') {
      value = raw === 'true' || raw === '1';
    }
    target[key] = value;
    applied = true;
  }

  if (applied && run) {
    // defer so bindings settle before the report runs
    setTimeout(() => run(), 0);
  }
  return applied;
}
