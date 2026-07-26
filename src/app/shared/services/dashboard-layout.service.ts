import { Injectable } from '@angular/core';
import { DashWidget } from './dashboard-charts';

/** Persists the user's custom home2 dashboard layout (per browser). */
@Injectable({ providedIn: 'root' })
export class DashboardLayoutService {
  private readonly KEY = 'home2.dashboardLayout';

  getLayout(): DashWidget[] {
    try {
      const raw = localStorage.getItem(this.KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(w => w && w.id && w.key && w.chartType) : [];
    } catch { return []; }
  }

  saveLayout(widgets: DashWidget[]): void {
    try { localStorage.setItem(this.KEY, JSON.stringify(widgets ?? [])); } catch {}
  }

  newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
}
