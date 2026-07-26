/* Shared catalog + chart-option builder for the customizable home2 dashboard.
   Used by the dashboard-builder page (drag-drop) and by home2 (render saved). */

export type DashChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut';

/** A data source that can be dropped onto the dashboard. */
export interface DashSource {
  key: string;              // 'acc-1' | 'wh-20' ...
  kind: 'acc' | 'wh';       // accounting voucher dashboard | warehouse dashboard
  docType: number;          // doctype within its dashboard
  titleKey: string;
  icon: string;
  color: string;
  route: string;            // page this chart's data comes from (deep-link target)
}

/** One placed widget on the user's dashboard. */
export interface DashWidget {
  id: string;
  key: string;              // references a DashSource.key
  chartType: DashChartType;
}

/** The catalog of draggable chart sources (accounting + warehouse). */
export const DASH_SOURCES: DashSource[] = [
  { key: 'acc-1', kind: 'acc', docType: 1,  titleKey: 'Home2.Cards.Journal',       icon: 'ti ti-notebook',          color: '#6366f1', route: '/accounting/vouchers/journal' },
  { key: 'acc-2', kind: 'acc', docType: 2,  titleKey: 'Home2.Cards.Receipt',       icon: 'ti ti-receipt',           color: '#0ea5e9', route: '/accounting/receipt-vouchers' },
  { key: 'acc-3', kind: 'acc', docType: 3,  titleKey: 'Home2.Cards.ChequePayment', icon: 'ti ti-writing-sign',      color: '#f59e0b', route: '/accounting/cheques/payment-voucher' },
  { key: 'acc-4', kind: 'acc', docType: 4,  titleKey: 'Home2.Cards.CashPayment',   icon: 'ti ti-cash-banknote',     color: '#22c55e', route: '/accounting/vouchers/cash-payment' },
  { key: 'wh-20', kind: 'wh',  docType: 20, titleKey: 'Home2.Cards.Inbound',       icon: 'ti ti-arrow-down-circle', color: '#22c55e', route: '/warehouse/vouchers/inbound' },
  { key: 'wh-21', kind: 'wh',  docType: 21, titleKey: 'Home2.Cards.Outbound',      icon: 'ti ti-arrow-up-circle',   color: '#0ea5e9', route: '/warehouse/vouchers/outbound' },
  { key: 'wh-22', kind: 'wh',  docType: 22, titleKey: 'Home2.Cards.Damage',        icon: 'ti ti-trash',             color: '#ef4444', route: '/warehouse/vouchers/damage' },
  { key: 'wh-24', kind: 'wh',  docType: 24, titleKey: 'Home2.Cards.Transfer',      icon: 'ti ti-arrows-exchange',   color: '#8b5cf6', route: '/warehouse/vouchers/transfer' },
];

export const dashSourceByKey = (key: string): DashSource | undefined =>
  DASH_SOURCES.find(s => s.key === key);

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#f97316', '#06b6d4', '#a855f7'];

export function dashKfmt(v: number): string {
  const n = v ?? 0;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return Math.round(n).toString();
}

/** Build a single-series apexcharts option bundle for the given chart type. */
export function buildSeriesOptions(
  type: DashChartType, labels: string[], values: number[],
  o: { name: string; color: string; height?: number },
): any {
  const h = o.height ?? 240;

  if (type === 'pie' || type === 'donut') {
    const sliceColors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
    return {
      series: values,
      labels,
      chart: { type, height: h, fontFamily: 'inherit', toolbar: { show: false } },
      xaxis: { categories: [] },
      yaxis: {},
      colors: sliceColors,
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
    yaxis: { labels: { formatter: (v: number) => dashKfmt(v) } },
    colors: [o.color],
    dataLabels: { enabled: false },
    stroke: type === 'bar' ? { width: 0 } : { width: 3, curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
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
