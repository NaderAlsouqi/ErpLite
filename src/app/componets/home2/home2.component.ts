import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  NgApexchartsModule,
  ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexTooltip,
  ApexPlotOptions, ApexLegend, ApexFill, ApexGrid, ApexMarkers, ApexResponsive,
} from 'ng-apexcharts';
import { SharedModule } from '../../shared/common/sharedmodule';
import { HOME_ACTION_GROUPS, ActionGroup } from '../home/home-actions';
import {
  VoucherDashboardService,
  VoucherDashboardRowDto,
} from '../../shared/services/voucher-dashboard.service';
import { CurrencyService, CurrencyDto } from '../../shared/services/currency.service';

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut';

/** Flat apexcharts option bundle + render state shared by every chart box. */
interface ChartBox {
  kind: ChartType;
  show: boolean;
  series:      any;            // number[] (pie/donut) | ApexAxisChartSeries
  chart:       ApexChart;
  xaxis:       ApexXAxis;
  yaxis:       any;
  labels:      string[];
  colors:      string[];
  dataLabels:  ApexDataLabels;
  stroke:      ApexStroke;
  plotOptions: ApexPlotOptions;
  markers:     ApexMarkers;
  tooltip:     ApexTooltip;
  legend:      ApexLegend;
  fill:        ApexFill;
  grid:        ApexGrid;
  responsive:  ApexResponsive[];
}

interface VoucherCard extends ChartBox {
  docType:     number;
  titleKey:    string;
  icon:        string;
  color:       string;
  totalCount:  number;
  totalAmount: number;
  latestCount: number;
  months:      string[];   // formatted month labels
  amounts:     number[];
  counts:      number[];
}

interface PieRow { label: string; amount: number; pct: number; color: string; }
interface Overview extends ChartBox { rows: PieRow[]; }

@Component({
  selector: 'app-home2',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, SharedModule, NgSelectModule, NgApexchartsModule],
  templateUrl: './home2.component.html',
  styleUrl: './home2.component.scss',
})
export class Home2Component implements OnInit {

  readonly groups: ActionGroup[] = HOME_ACTION_GROUPS;

  loading = false;
  cards: VoucherCard[] = [];
  overview: Overview | null = null;

  // ─── Filters (persisted) ──────────────────────────────────────────────────
  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());
  curNo: number | null = null;
  postStatus: number | null = null;   // 1=posted, 0=unposted, null=all
  currencies: CurrencyDto[] = [];

  readonly POST_OPTIONS = [
    { value: null, label: 'JvReport.All'       },
    { value: 1,    label: 'JvReport.Posted'    },
    { value: 0,    label: 'JvReport.NotPosted' },
  ];

  /** Chart types the user can pick from for any chart. */
  readonly CHART_TYPES: { value: ChartType; labelKey: string; icon: string }[] = [
    { value: 'bar',   labelKey: 'Home2.ColumnChart', icon: 'ti ti-chart-bar' },
    { value: 'line',  labelKey: 'Home2.LineChart',   icon: 'ti ti-chart-line' },
    { value: 'area',  labelKey: 'Home2.AreaChart',   icon: 'ti ti-chart-area' },
    { value: 'pie',   labelKey: 'Home2.PieChart',    icon: 'ti ti-chart-pie' },
    { value: 'donut', labelKey: 'Home2.DonutChart',  icon: 'ti ti-chart-donut' },
  ];

  private readonly TYPES: { docType: number; titleKey: string; icon: string; color: string; def: ChartType }[] = [
    { docType: 1, titleKey: 'Home2.Cards.Journal',       icon: 'ti ti-notebook',      color: '#6366f1', def: 'bar'  },
    { docType: 4, titleKey: 'Home2.Cards.CashPayment',   icon: 'ti ti-cash-banknote', color: '#22c55e', def: 'line' },
    { docType: 3, titleKey: 'Home2.Cards.ChequePayment', icon: 'ti ti-writing-sign',  color: '#f59e0b', def: 'bar'  },
    { docType: 2, titleKey: 'Home2.Cards.Receipt',       icon: 'ti ti-receipt',       color: '#0ea5e9', def: 'line' },
  ];

  private readonly PALETTE = ['#6366f1','#22c55e','#f59e0b','#0ea5e9','#ef4444','#8b5cf6','#14b8a6','#ec4899','#84cc16','#f97316','#06b6d4','#a855f7'];
  private readonly FILTER_KEY = 'home2.filters';

  constructor(
    private router: Router,
    private translate: TranslateService,
    private svc: VoucherDashboardService,
    private currencySvc: CurrencyService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** Year shown on the card badges — derived from the selected "to" date. */
  get year(): number {
    const y = new Date(this.dateTo).getFullYear();
    return isNaN(y) ? new Date().getFullYear() : y;
  }

  currencySearchFn = (term: string, item: CurrencyDto): boolean => {
    const t = term.toLowerCase();
    return String(item.cur_no).includes(t)
      || (item.cur ?? '').toLowerCase().includes(t)
      || (item.ename ?? '').toLowerCase().includes(t);
  };

  ngOnInit(): void {
    this.loadFilters();
    this.currencySvc.getAll().subscribe({ next: d => (this.currencies = d ?? []), error: () => {} });
    this.load();
  }

  navigate(path: string): void { this.router.navigate([path]); }

  /** Any filter changed → persist + reload + redraw charts. */
  onFilterChange(): void {
    this.saveFilters();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.get({ dateFrom: this.dateFrom, dateTo: this.dateTo, curNo: this.curNo, postStatus: this.postStatus }).subscribe({
      next: rows => { this.build(rows ?? []); this.loading = false; },
      error: () => { this.build([]); this.loading = false; },
    });
  }

  // ─── User picks a chart type (persisted) ──────────────────────────────────
  setCardType(card: VoucherCard, type: ChartType): void {
    card.kind = type;
    Object.assign(card, this.optsFor(card, type));
    this.savePref('v' + card.docType, type);
    this.recreate(card);
  }

  setOverviewType(type: ChartType): void {
    if (!this.overview) return;
    this.overview.kind = type;
    Object.assign(this.overview, this.overviewOpts(this.overview.rows, type));
    this.savePref('overview', type);
    this.recreate(this.overview);
  }

  // ─── Build ────────────────────────────────────────────────────────────────
  private build(rows: VoucherDashboardRowDto[]): void {
    const ymKeys = this.ymRange(this.dateFrom, this.dateTo);
    const singleYear = ymKeys.length > 0 && ymKeys.every(k => k.slice(0, 4) === ymKeys[0].slice(0, 4));
    const labels = ymKeys.map(k => this.ymLabel(k, singleYear));

    this.cards = this.TYPES.map(t => {
      const byYm = new Map<string, VoucherDashboardRowDto>();
      rows.filter(r => r.DocType === t.docType).forEach(r => byYm.set(r.Ym, r));
      const amounts = ymKeys.map(k => +(+(byYm.get(k)?.Amt ?? 0)).toFixed(2));
      const counts  = ymKeys.map(k => byYm.get(k)?.Cnt ?? 0);

      const card = {
        docType: t.docType, titleKey: t.titleKey, icon: t.icon, color: t.color,
        totalCount:  counts.reduce((a, b) => a + b, 0),
        totalAmount: amounts.reduce((a, b) => a + b, 0),
        latestCount: counts.length ? counts[counts.length - 1] : 0,
        months: labels, amounts, counts,
        kind: t.def, show: true,
      } as VoucherCard;
      const type = this.loadPref('v' + t.docType, t.def);
      card.kind = type;
      Object.assign(card, this.optsFor(card, type));
      return card;
    });

    const grand = this.cards.reduce((s, c) => s + c.totalAmount, 0) || 1;
    const rowsPie: PieRow[] = this.cards.map(c => ({
      label: this.translate.instant(c.titleKey), amount: c.totalAmount, pct: (c.totalAmount / grand) * 100, color: c.color,
    }));
    const ovType = this.loadPref('overview', 'donut');
    this.overview = { rows: rowsPie, kind: ovType, show: true } as Overview;
    Object.assign(this.overview, this.overviewOpts(rowsPie, ovType));
  }

  private optsFor(card: VoucherCard, type: ChartType): Partial<ChartBox> {
    return this.makeOpts(type, card.months, card.amounts, {
      name: this.translate.instant('Home2.Amount'),
      color: card.color,
      sliceColors: this.palette(card.amounts.length),
    });
  }

  private overviewOpts(rows: PieRow[], type: ChartType): Partial<ChartBox> {
    return this.makeOpts(type, rows.map(r => r.label), rows.map(r => +r.amount.toFixed(2)), {
      name: this.translate.instant('Home2.TotalAmount'),
      color: '#6366f1',
      sliceColors: rows.map(r => r.color),
      distributed: true,
      height: 300,
    });
  }

  /** Single-series chart options for any chart type. */
  private makeOpts(
    type: ChartType, labels: string[], values: number[],
    o: { name: string; color: string; sliceColors?: string[]; distributed?: boolean; height?: number },
  ): Partial<ChartBox> {
    const h = o.height ?? 240;

    if (type === 'pie' || type === 'donut') {
      return {
        series: values,
        labels,
        chart: { type, height: h, fontFamily: 'inherit', toolbar: { show: false } },
        xaxis: { categories: [] },
        yaxis: {},
        colors: o.sliceColors ?? this.palette(values.length),
        dataLabels: { enabled: true, formatter: (v: number) => Math.round(v as number) + '%' },
        stroke: { width: 2, colors: ['#ffffff'] },
        plotOptions: { pie: { donut: { size: type === 'donut' ? '62%' : '0%' } } },
        markers: { size: 0 } as any,
        tooltip: { y: { formatter: (v: number) => (v ?? 0).toLocaleString() } },
        legend: { position: 'bottom', fontSize: '11px', markers: { width: 10, height: 10 } as any },
        fill: { opacity: 1 },
        grid: {},
        responsive: [{ breakpoint: 576, options: { chart: { height: h - 40 } } }],
      };
    }

    return {
      series: [{ name: o.name, data: values }],
      labels: [],
      chart: { type, height: h, fontFamily: 'inherit', toolbar: { show: false } },
      xaxis: { categories: labels, labels: { style: { fontSize: '11px' }, rotate: -45, rotateAlways: labels.length > 12 }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v: number) => this.kfmt(v) } },
      colors: o.distributed && o.sliceColors ? o.sliceColors : [o.color],
      dataLabels: { enabled: false },
      stroke: type === 'bar' ? { width: 0 } : { width: 3, curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, distributed: !!o.distributed } },
      markers: type === 'line' ? { size: 4, strokeWidth: 0, hover: { size: 6 } } : { size: 0 },
      tooltip: { y: { formatter: (v: number) => (v ?? 0).toLocaleString() } },
      legend: { show: false },
      fill: type === 'area'
        ? { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } }
        : { opacity: 0.9 },
      grid: { borderColor: 'rgba(120,130,150,0.15)', strokeDashArray: 4, padding: { left: 4, right: 4 } },
      responsive: [],
    };
  }

  private recreate(box: ChartBox): void {
    box.show = false;
    setTimeout(() => { box.show = true; }, 0);
  }

  private palette(n: number): string[] {
    return Array.from({ length: n }, (_, i) => this.PALETTE[i % this.PALETTE.length]);
  }

  // ─── Month-range helpers ──────────────────────────────────────────────────
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

  // ─── Persistence ──────────────────────────────────────────────────────────
  private prefKey(id: string): string { return `home2.chartType.${id}`; }
  private savePref(id: string, type: ChartType): void {
    try { localStorage.setItem(this.prefKey(id), type); } catch {}
  }
  private loadPref(id: string, fallback: ChartType): ChartType {
    try {
      const v = localStorage.getItem(this.prefKey(id)) as ChartType | null;
      return v && this.CHART_TYPES.some(t => t.value === v) ? v : fallback;
    } catch { return fallback; }
  }

  private saveFilters(): void {
    try {
      localStorage.setItem(this.FILTER_KEY, JSON.stringify({
        dateFrom: this.dateFrom, dateTo: this.dateTo, curNo: this.curNo, postStatus: this.postStatus,
      }));
    } catch {}
  }
  private loadFilters(): void {
    try {
      const raw = localStorage.getItem(this.FILTER_KEY);
      if (!raw) return;
      const f = JSON.parse(raw);
      if (f.dateFrom) this.dateFrom = f.dateFrom;
      if (f.dateTo)   this.dateTo   = f.dateTo;
      this.curNo      = (typeof f.curNo === 'number') ? f.curNo : null;
      this.postStatus = (f.postStatus === 0 || f.postStatus === 1) ? f.postStatus : null;
    } catch {}
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private kfmt(v: number): string {
    const n = v ?? 0;
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return Math.round(n).toString();
  }
}
