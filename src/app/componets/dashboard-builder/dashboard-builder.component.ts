import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SharedModule } from '../../shared/common/sharedmodule';
import { VoucherDashboardService } from '../../shared/services/voucher-dashboard.service';
import { WarehouseDashboardService } from '../../shared/services/warehouse-dashboard.service';
import { DashboardLayoutService } from '../../shared/services/dashboard-layout.service';
import {
  DASH_SOURCES, DashSource, DashWidget, DashChartType, dashSourceByKey, buildSeriesOptions,
} from '../../shared/services/dashboard-charts';

@Component({
  selector: 'app-dashboard-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, DragDropModule, NgApexchartsModule],
  templateUrl: './dashboard-builder.component.html',
  styleUrl: './dashboard-builder.component.scss',
})
export class DashboardBuilderComponent implements OnInit {

  readonly palette: DashSource[] = DASH_SOURCES;
  widgets: DashWidget[] = [];
  /** built chart option bundle per widget id (+ show flag for re-render). */
  boxes: Record<string, any> = {};
  loading = false;

  readonly CHART_TYPES: { value: DashChartType; labelKey: string; icon: string }[] = [
    { value: 'bar',   labelKey: 'Home2.ColumnChart', icon: 'ti ti-chart-bar' },
    { value: 'line',  labelKey: 'Home2.LineChart',   icon: 'ti ti-chart-line' },
    { value: 'area',  labelKey: 'Home2.AreaChart',   icon: 'ti ti-chart-area' },
    { value: 'pie',   labelKey: 'Home2.PieChart',    icon: 'ti ti-chart-pie' },
    { value: 'donut', labelKey: 'Home2.DonutChart',  icon: 'ti ti-chart-donut' },
  ];

  /** per-source monthly data: key -> { months, amounts }. */
  private dataByKey: Record<string, { months: string[]; amounts: number[] }> = {};

  constructor(
    private router: Router,
    private translate: TranslateService,
    private voucherSvc: VoucherDashboardService,
    private warehouseSvc: WarehouseDashboardService,
    private layoutSvc: DashboardLayoutService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get canvasIds(): string[] { return ['dashCanvas']; }
  title(key: string): string { return this.translate.instant(key); }
  srcOf(w: DashWidget): DashSource | undefined { return dashSourceByKey(w.key); }

  ngOnInit(): void {
    this.widgets = this.layoutSvc.getLayout();
    this.loadData();
  }

  // ─── data ───────────────────────────────────────────────────
  private loadData(): void {
    this.loading = true;
    const dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
    const dateTo = this.toDateStr(new Date());
    let pending = 2;
    const done = () => { if (--pending <= 0) { this.loading = false; this.rebuild(); } };

    this.voucherSvc.get({ dateFrom, dateTo, curNo: null, postStatus: null, serialNo: null, docNo: null, amtFrom: null, amtTo: null }).subscribe({
      next: rows => { this.ingest('acc', dateFrom, dateTo, rows ?? []); done(); },
      error: () => done(),
    });
    this.warehouseSvc.get({ dateFrom, dateTo, storeNo: null, serialNo: null, docNo: null, amtFrom: null, amtTo: null }).subscribe({
      next: rows => { this.ingest('wh', dateFrom, dateTo, rows ?? []); done(); },
      error: () => done(),
    });
  }

  private ingest(kind: 'acc' | 'wh', from: string, to: string, rows: { DocType: number; Ym: string; Amt: number }[]): void {
    const ymKeys = this.ymRange(from, to);
    const singleYear = ymKeys.length > 0 && ymKeys.every(k => k.slice(0, 4) === ymKeys[0].slice(0, 4));
    const labels = ymKeys.map(k => this.ymLabel(k, singleYear));
    for (const src of this.palette.filter(s => s.kind === kind)) {
      const byYm = new Map<string, number>();
      rows.filter(r => r.DocType === src.docType).forEach(r => byYm.set(r.Ym, +(+(r.Amt ?? 0)).toFixed(2)));
      this.dataByKey[src.key] = { months: labels, amounts: ymKeys.map(k => byYm.get(k) ?? 0) };
    }
  }

  // ─── build chart boxes ──────────────────────────────────────
  private rebuild(): void {
    this.boxes = {};
    for (const w of this.widgets) { this.boxes[w.id] = this.boxFor(w); }
  }

  private boxFor(w: DashWidget): any {
    const src = this.srcOf(w);
    const data = this.dataByKey[w.key] ?? { months: [], amounts: [] };
    return {
      ...buildSeriesOptions(w.chartType, data.months, data.amounts, {
        name: this.translate.instant('Home2.Value'), color: src?.color ?? '#6366f1', height: 220,
      }),
      show: true,
    };
  }

  // ─── drag & drop / edit (auto-saved) ────────────────────────
  onDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.widgets, event.previousIndex, event.currentIndex);
    } else {
      const src: DashSource = event.previousContainer.data[event.previousIndex];
      if (src) this.widgets.splice(event.currentIndex, 0, { id: this.layoutSvc.newId(), key: src.key, chartType: 'bar' });
    }
    this.persist();
  }

  add(src: DashSource): void {
    this.widgets.push({ id: this.layoutSvc.newId(), key: src.key, chartType: 'bar' });
    this.persist();
  }

  remove(i: number): void { this.widgets.splice(i, 1); this.persist(); }

  setType(w: DashWidget, type: DashChartType): void {
    w.chartType = type;
    this.boxes[w.id] = { ...this.boxFor(w), show: false };
    setTimeout(() => { if (this.boxes[w.id]) this.boxes[w.id].show = true; }, 0);
    this.persist(false);
  }

  clearAll(): void { this.widgets = []; this.persist(); }

  /** Auto-save on every change. */
  private persist(rebuild = true): void {
    this.layoutSvc.saveLayout(this.widgets);
    if (rebuild) this.rebuild();
    this.toastr.success(this.translate.instant('DashboardBuilder.Saved'), '', { timeOut: 800 });
  }

  goHome(): void { this.router.navigate(['/home2']); }

  // ─── month-range helpers ────────────────────────────────────
  private ymRange(from: string, to: string): string[] {
    const out: string[] = [];
    const s = new Date(from), e = new Date(to);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return out;
    let y = s.getFullYear(), m = s.getMonth();
    const ey = e.getFullYear(), em = e.getMonth();
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard < 240) {
      out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
      m++; if (m > 11) { m = 0; y++; }
      guard++;
    }
    return out;
  }
  private ymLabel(ym: string, singleYear: boolean): string {
    const [y, m] = ym.split('-');
    return singleYear ? String(+m) : `${m}/${y.slice(2)}`;
  }
  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
