import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgApexchartsModule,
  ApexChart, ApexAxisChartSeries, ApexNonAxisChartSeries, ApexXAxis,
  ApexStroke, ApexFill, ApexPlotOptions, ApexDataLabels, ApexLegend, ApexYAxis,
  ApexResponsive, ApexTooltip,
} from 'ng-apexcharts';
import {
  DashboardService,
  FinancialDashboardResultDto,
  DashboardDataDto,
  Dashboard2DataDto,
} from '../../../shared/services/dashboard.service';
import { forkJoin } from 'rxjs';
import { BalanceSheetService } from '../../../shared/services/balance-sheet.service';
import { IncomeStatementService } from '../../../shared/services/income-statement.service';
import { TrialBalanceService } from '../../../shared/services/trial-balance.service';
import { AgingAnalysisService } from '../../../shared/services/aging-analysis.service';
import { ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { CostCenterService } from '../../../shared/services/cost-center.service';
import { CenterBalService } from '../../../shared/services/center-bal.service';
import {
  DONUT_COLORS, DONUT_DATA_LABELS,
  CHART_PALETTE, BAR_DISTRIBUTED_COLORS, SEMANTIC,
} from '../../../shared/chart-theme';

/** Identifier list — used as keys for visibility persistence in localStorage. */
type CardId =
  | 'kpiAR' | 'kpiAP' | 'kpiRevenue' | 'kpiEquityRatio' | 'kpiBurnRate' | 'kpiDebtEquity'
  | 'kpiCurrentRatio' | 'kpiGrossMargin'
  | 'chartWorkingCapital' | 'chartInventory'
  | 'chartArApTurnover' | 'chartApAging' | 'chartArAging'
  | 'chartBalanceSheet' | 'chartIncomeStatement'
  | 'chartTrialBalance' | 'chartAging'
  // Sales / Invoice charts moved from HomeComponent
  | 'chartMonthlySales' | 'chartInvoicesByType' | 'chartSalesVsService'
  | 'chartInvoiceCount' | 'chartCumulativeRevenue' | 'chartTopCustomers'
  | 'chartAccountsList' | 'chartOpeningBalances' | 'chartCcOpeningBalances';

@Component({
  selector: 'app-financial-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, NgApexchartsModule],
  templateUrl: './financial-dashboard.component.html',
  styleUrl: './financial-dashboard.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class FinancialDashboardComponent implements OnInit {

  private readonly storageKey = 'erplite.financialDashboard.hiddenCards';

  loading = true;
  data: FinancialDashboardResultDto | null = null;
  // Period range: dateFrom..dateTo. Balance snapshots use dateTo (the "as of"
  // date); P&L / period metrics use the full range.
  dateFrom = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo   = this.toDateStr(new Date());
  /** Back-compat alias used by the report-card loaders. */
  get asOfDate(): string { return this.dateTo; }

  // ── Card visibility (persisted) ───────────────────────────────────────
  hidden = new Set<CardId>();
  customizing = false;

  readonly allCards: { id: CardId; labelKey: string; group: 'kpi' | 'chart' }[] = [
    { id: 'kpiAR',              labelKey: 'FinDash.KPI.AR',             group: 'kpi'   },
    { id: 'kpiRevenue',         labelKey: 'FinDash.KPI.Revenue',        group: 'kpi'   },
    { id: 'kpiEquityRatio',     labelKey: 'FinDash.KPI.EquityRatio',    group: 'kpi'   },
    { id: 'kpiBurnRate',        labelKey: 'FinDash.KPI.BurnRate',       group: 'kpi'   },
    { id: 'kpiDebtEquity',      labelKey: 'FinDash.KPI.DebtEquity',     group: 'kpi'   },
    { id: 'kpiAP',              labelKey: 'FinDash.KPI.AP',             group: 'kpi'   },
    { id: 'kpiCurrentRatio',    labelKey: 'FinDash.KPI.CurrentRatio',   group: 'kpi'   },
    { id: 'kpiGrossMargin',     labelKey: 'FinDash.KPI.GrossMargin',    group: 'kpi'   },
    { id: 'chartWorkingCapital', labelKey: 'FinDash.Chart.WorkingCapital', group: 'chart' },
    { id: 'chartInventory',      labelKey: 'FinDash.Chart.Inventory',      group: 'chart' },
    { id: 'chartArApTurnover',   labelKey: 'FinDash.Chart.ArApTurnover',   group: 'chart' },
    { id: 'chartApAging',        labelKey: 'FinDash.Chart.ApAging',        group: 'chart' },
    { id: 'chartArAging',        labelKey: 'FinDash.Chart.ArAging',        group: 'chart' },
    // Moved-from-reports cards. Each lazy-loads its source data when shown.
    { id: 'chartBalanceSheet',     labelKey: 'FinDash.Chart.BalanceSheet',     group: 'chart' },
    { id: 'chartIncomeStatement',  labelKey: 'FinDash.Chart.IncomeStatement',  group: 'chart' },
    { id: 'chartTrialBalance',     labelKey: 'FinDash.Chart.TrialBalance',     group: 'chart' },
    { id: 'chartAging',            labelKey: 'FinDash.Chart.AgingBuckets',     group: 'chart' },
    // Sales / invoice charts
    { id: 'chartMonthlySales',     labelKey: 'Dashboard.Charts.MonthlySales',       group: 'chart' },
    { id: 'chartInvoicesByType',   labelKey: 'Dashboard.Charts.InvoicesByType',     group: 'chart' },
    { id: 'chartSalesVsService',   labelKey: 'Dashboard2.Charts.SalesVsService',    group: 'chart' },
    { id: 'chartInvoiceCount',     labelKey: 'Dashboard2.Charts.InvoiceCount',      group: 'chart' },
    { id: 'chartCumulativeRevenue', labelKey: 'Dashboard.Charts.CumulativeRevenue', group: 'chart' },
    { id: 'chartTopCustomers',     labelKey: 'Dashboard.Charts.TopCustomers',       group: 'chart' },
    { id: 'chartAccountsList',     labelKey: 'FinDash.Chart.AccountsList',          group: 'chart' },
    { id: 'chartOpeningBalances',  labelKey: 'FinDash.Chart.OpeningBalances',       group: 'chart' },
    { id: 'chartCcOpeningBalances', labelKey: 'FinDash.Chart.CcOpeningBalances',    group: 'chart' },
  ];

  /** Route each chart links to (its related/source page). */
  private readonly chartRoutes: Partial<Record<CardId, string>> = {
    chartWorkingCapital:    '/accounting/reports/balance-sheet',
    chartInventory:         '/accounting/reports/balance-sheet',
    chartArApTurnover:      '/accounting/reports/aging-analysis',
    chartApAging:           '/accounting/reports/aging-analysis',
    chartArAging:           '/accounting/reports/aging-analysis',
    chartBalanceSheet:      '/accounting/reports/balance-sheet',
    chartIncomeStatement:   '/accounting/reports/income-statement',
    chartTrialBalance:      '/accounting/reports/trial-balance',
    chartAging:             '/accounting/reports/aging-analysis',
    chartAccountsList:      '/accounting/reports/accounts-list',
    chartOpeningBalances:   '/accounting/gl/opening-balances',
    chartCcOpeningBalances: '/accounting/gl/cc-opening-balances',
    chartMonthlySales:      '/sales/invoice',
    chartInvoicesByType:    '/sales/invoice',
    chartSalesVsService:    '/sales/invoice',
    chartInvoiceCount:      '/sales/invoice',
    chartCumulativeRevenue: '/sales/invoice',
    chartTopCustomers:      '/sales/invoice',
  };
  /** The route a chart card links to, or null if none. */
  chartRoute(id: CardId): string | null { return this.chartRoutes[id] ?? null; }

  /** Hard cap on how many chart cards can be shown at once. */
  readonly MAX_CHARTS = 6;
  get chartCards() { return this.allCards.filter(c => c.group === 'chart'); }
  get visibleChartCount(): number {
    return this.chartCards.filter(c => this.isVisible(c.id)).length;
  }
  /** An OFF chart chip is disabled when the visible-chart cap is reached. */
  chipDisabled(c: { id: CardId; group: 'kpi' | 'chart' }): boolean {
    return c.group === 'chart' && !this.isVisible(c.id) && this.visibleChartCount >= this.MAX_CHARTS;
  }

  // ── Chart configs ─────────────────────────────────────────────────────
  // Common bar styling — rounded columns, distributed colors when applicable.
  private readonly commonBarChart: ApexChart = {
    type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit',
    dropShadow: { enabled: true, blur: 4, opacity: 0.08, top: 2 },
  };
  private readonly commonLineChart: ApexChart = {
    type: 'line', height: 260, toolbar: { show: false }, fontFamily: 'inherit',
  };

  // Working capital (Net = indigo, Gross = sky)
  wcSeries:  ApexAxisChartSeries = [];
  wcChart:   ApexChart = { ...this.commonLineChart };
  wcXaxis:   ApexXAxis = { categories: [] };
  wcStroke:  ApexStroke = { curve: 'smooth', width: 3 };
  wcLegend:  ApexLegend = { position: 'top' };
  wcColors:  string[] = [CHART_PALETTE[0], CHART_PALETTE[2]];
  wcDataLabels: ApexDataLabels = { enabled: false };

  // Inventory (single navy line, with subtle fill)
  invSeries:  ApexAxisChartSeries = [];
  invChart:   ApexChart = { type: 'area', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  invXaxis:   ApexXAxis = { categories: [] };
  invStroke:  ApexStroke = { curve: 'smooth', width: 3, colors: ['#1b2b4a'] };
  invFill:    ApexFill   = { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 }, colors: ['#1b2b4a'] };
  invColors:  string[]   = ['#1b2b4a'];
  invDataLabels: ApexDataLabels = { enabled: false };

  // AR vs AP turnover (indigo + amber)
  turnoverSeries:  ApexAxisChartSeries = [];
  turnoverChart:   ApexChart = { ...this.commonBarChart };
  turnoverXaxis:   ApexXAxis = { categories: [] };
  turnoverPlot:    ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end' } };
  turnoverLegend:  ApexLegend = { position: 'top' };
  turnoverColors:  string[] = [CHART_PALETTE[0], CHART_PALETTE[3]];
  turnoverDataLabels: ApexDataLabels = { enabled: false };

  // AP aging (distributed palette)
  apAgingSeries: ApexAxisChartSeries = [];
  apAgingChart:  ApexChart = { ...this.commonBarChart };
  apAgingXaxis:  ApexXAxis = { categories: [] };
  apAgingYaxis:  ApexYAxis = { labels: { formatter: (v: number) => this.compact(v) } };
  apAgingPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  apAgingColors: string[] = BAR_DISTRIBUTED_COLORS;
  apAgingDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => this.compact(v), style: { fontWeight: 600 } };
  apAgingLegend: ApexLegend = { show: false };

  // AR aging (mirror of AP, same distributed palette)
  arAgingSeries: ApexAxisChartSeries = [];
  arAgingChart:  ApexChart = { ...this.commonBarChart };
  arAgingXaxis:  ApexXAxis = { categories: [] };
  arAgingYaxis:  ApexYAxis = { labels: { formatter: (v: number) => this.compact(v) } };
  arAgingPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  arAgingColors: string[] = BAR_DISTRIBUTED_COLORS;
  arAgingDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => this.compact(v), style: { fontWeight: 600 } };
  arAgingLegend: ApexLegend = { show: false };

  // ── Moved-from-reports cards (lazy-loaded when their toggle is on) ───
  // Balance Sheet composition (Assets / Liabilities / Equity donut)
  bsLoaded = false;
  bsSeries: ApexNonAxisChartSeries = [];
  bsLabels: string[] = [];
  bsChart:  ApexChart = { type: 'donut', height: 260, fontFamily: 'inherit' };
  bsLegend: ApexLegend = { position: 'bottom' };
  bsColors      = DONUT_COLORS;
  bsDataLabels  = DONUT_DATA_LABELS;

  // Income Statement section breakdown (column bar, distributed palette)
  isLoaded = false;
  isSeries: ApexAxisChartSeries = [];
  isXaxis:  ApexXAxis = { categories: [] };
  isChart:  ApexChart = { ...this.commonBarChart };
  isPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  isColors: string[] = [SEMANTIC.positive, SEMANTIC.highlight, CHART_PALETTE[0], SEMANTIC.negative, CHART_PALETTE[5]];
  isDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => this.compact(v), style: { fontWeight: 600 } };
  isLegend: ApexLegend = { show: false };

  // Trial Balance Debit vs Credit donut
  tbLoaded = false;
  tbSeries: ApexNonAxisChartSeries = [];
  tbLabels: string[] = [];
  tbChart:  ApexChart = { type: 'donut', height: 260, fontFamily: 'inherit' };
  tbLegend: ApexLegend = { position: 'bottom' };
  tbColors      = DONUT_COLORS;
  tbDataLabels  = DONUT_DATA_LABELS;

  // Accounts List — number of accounts per level (column bar)
  alLoaded = false;
  alSeries: ApexAxisChartSeries = [];
  alXaxis:  ApexXAxis = { categories: [] };
  alChart:  ApexChart = { ...this.commonBarChart };
  alPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  alColors: string[] = BAR_DISTRIBUTED_COLORS;
  alDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => `${v}`, style: { fontWeight: 600 } };
  alLegend: ApexLegend = { show: false };

  // Opening Balances — total opening Debit vs Credit (donut)
  obLoaded = false;
  obSeries: ApexNonAxisChartSeries = [];
  obLabels: string[] = [];
  obChart:  ApexChart = { type: 'donut', height: 260, fontFamily: 'inherit' };
  obLegend: ApexLegend = { position: 'bottom' };
  obColors      = DONUT_COLORS;
  obDataLabels  = DONUT_DATA_LABELS;

  // Cost-Center Opening Balances — net opening balance per cost center (column bar)
  ccLoaded = false;
  ccSeries: ApexAxisChartSeries = [];
  ccXaxis:  ApexXAxis = { categories: [] };
  ccChart:  ApexChart = { ...this.commonBarChart };
  ccPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  ccColors: string[] = BAR_DISTRIBUTED_COLORS;
  ccDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => this.compact(v), style: { fontWeight: 600 } };
  ccLegend: ApexLegend = { show: false };

  // Aging Analysis buckets (column bar) — uses the FinDash payload's ARAging
  agingSeries: ApexAxisChartSeries = [];
  agingXaxis:  ApexXAxis = { categories: [] };
  agingChart:  ApexChart = { ...this.commonBarChart };
  agingPlot:   ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  agingColors: string[] = BAR_DISTRIBUTED_COLORS;
  agingDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => this.compact(v), style: { fontWeight: 600 } };
  agingLegend: ApexLegend = { show: false };

  // ── Sales / invoice charts (formerly in HomeComponent) ─────────────────
  data1:  DashboardDataDto  | null = null;
  data2:  Dashboard2DataDto | null = null;

  monthlySeries:  ApexAxisChartSeries = [];
  monthlyChart:   ApexChart = { type: 'area', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  monthlyXaxis:   ApexXAxis = { categories: [] };
  monthlyStroke:  ApexStroke  = { curve: 'smooth', width: 3 };
  monthlyFill:    ApexFill    = { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } };
  monthlyTooltip: ApexTooltip = { x: { format: 'MM/yyyy' } };
  monthlyColors:  string[]    = [CHART_PALETTE[0]];

  donutSeries:     ApexNonAxisChartSeries = [];
  donutChart:      ApexChart = { type: 'donut', height: 260, fontFamily: 'inherit' };
  donutLabels:     string[] = [];
  donutLegend:     ApexLegend = { position: 'bottom' };
  donutColors      = DONUT_COLORS;
  donutDataLabels  = DONUT_DATA_LABELS;
  donutResponsive: ApexResponsive[] = [{ breakpoint: 480, options: { chart: { height: 220 } } }];

  svsSeries:  ApexAxisChartSeries = [];
  svsChart:   ApexChart = { type: 'area', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  svsXaxis:   ApexXAxis = { categories: [] };
  svsStroke:  ApexStroke = { curve: 'smooth', width: 3 };
  svsFill:    ApexFill   = { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } };
  svsLegend:  ApexLegend = { position: 'top' };
  svsColors:  string[] = [CHART_PALETTE[0], CHART_PALETTE[1]];

  countSeries:  ApexAxisChartSeries = [];
  countChart:   ApexChart = { ...this.commonBarChart, height: 260 };
  countXaxis:   ApexXAxis = { categories: [] };
  countPlot:    ApexPlotOptions = { bar: { horizontal: false, columnWidth: '55%', borderRadius: 6, borderRadiusApplication: 'end' } };
  countLegend:  ApexLegend = { position: 'top' };
  countDataLabels: ApexDataLabels = { enabled: false };
  countColors:  string[] = [CHART_PALETTE[0], CHART_PALETTE[1]];

  cumulativeSeries: ApexAxisChartSeries = [];
  cumulativeChart:  ApexChart = { type: 'line', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  cumulativeXaxis:  ApexXAxis = { categories: [] };
  cumulativeStroke: ApexStroke = { curve: 'smooth', width: 3 };
  cumulativeColors: string[] = [SEMANTIC.positive];

  customerSeries:    ApexAxisChartSeries = [];
  customerChart:     ApexChart = { ...this.commonBarChart, height: 360 };
  customerXaxis:     ApexXAxis = { categories: [] };
  customerPlot:      ApexPlotOptions = { bar: { horizontal: true, barHeight: '60%', borderRadius: 6, borderRadiusApplication: 'end', distributed: true } };
  customerDataLabels: ApexDataLabels = { enabled: false };
  customerColors:    string[] = BAR_DISTRIBUTED_COLORS;
  customerLegend:    ApexLegend = { show: false };

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private dashboardService: DashboardService,
    private balanceSheetSvc:  BalanceSheetService,
    private incomeSvc:        IncomeStatementService,
    private trialSvc:         TrialBalanceService,
    private agingSvc:         AgingAnalysisService,
    private coaSvc:           ChartOfAccountsService,
    private costCenterSvc:    CostCenterService,
    private centerBalSvc:     CenterBalService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadHidden();
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    // Force the report cards to re-fetch when the AsOf date changes.
    this.bsLoaded = this.isLoaded = this.tbLoaded = false;
    forkJoin({
      fd: this.dashboardService.getFinancialDashboard({ AsOfDate: this.dateTo, DateFrom: this.dateFrom }),
      d1: this.dashboardService.getDashboardData(),
      d2: this.dashboardService.getDashboard2Data(),
    }).subscribe({
      next: ({ fd, d1, d2 }) => {
        this.data  = fd;
        this.data1 = d1;
        this.data2 = d2;
        this.buildCharts(fd);
        this.buildAgingChart(fd);
        this.buildSalesCharts(d1);
        this.buildSales2Charts(d2);
        this.loadVisibleReportCards();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  /**
   * Lazy-load the source data for each "moved-from-reports" card that is
   * currently visible. Called from refresh() and from toggle() so a card
   * being switched back on after the page loaded still gets populated.
   */
  private loadVisibleReportCards(): void {
    if (this.isVisible('chartBalanceSheet'))    this.loadBalanceSheet();
    if (this.isVisible('chartIncomeStatement')) this.loadIncomeStatement();
    if (this.isVisible('chartTrialBalance'))    this.loadTrialBalance();
    if (this.isVisible('chartAccountsList'))    this.loadAccountsList();
    if (this.isVisible('chartOpeningBalances')) this.loadOpeningBalances();
    if (this.isVisible('chartCcOpeningBalances')) this.loadCcOpeningBalances();
  }

  /**
   * Cost-Center Opening Balances chart — net opening balance per cost center.
   * CenterBal has no "get all" endpoint, so we fetch the cost-center list then
   * forkJoin one GetByCcNo per center and sum each center's saved balances.
   */
  private loadCcOpeningBalances(): void {
    if (this.ccLoaded) return;
    this.costCenterSvc.getAll().subscribe({
      next: centers => {
        const list = (centers ?? []).sort((a, b) => (a.CcntrNo ?? 0) - (b.CcntrNo ?? 0));
        if (list.length === 0) { this.ccLoaded = true; return; }
        forkJoin(list.map(c => this.centerBalSvc.getByCcNo(c.CcntrNo))).subscribe({
          next: results => {
            const names: string[] = [];
            const nets:  number[] = [];
            results.forEach((entries, i) => {
              const net = (entries ?? []).reduce((s, e) => s + (e.Bb ?? 0), 0);
              if (Math.abs(net) < 0.001) return;          // skip empty centers
              const c = list[i];
              names.push(this.isAr ? (c.CcAname ?? String(c.CcntrNo)) : (c.Ccename || c.CcAname || String(c.CcntrNo)));
              nets.push(Math.round(net));
            });
            this.ccXaxis  = { categories: names };
            this.ccSeries = [{
              name: this.translate.instant('CcOpeningBalances.OpeningBalance'),
              data: nets,
            }];
            this.ccLoaded = true;
          },
          error: () => { this.ccLoaded = true; },
        });
      },
    });
  }

  /** Opening Balances chart — total opening Debit vs Credit (accf.bb sign). */
  private loadOpeningBalances(): void {
    if (this.obLoaded) return;
    this.coaSvc.getAll().subscribe({
      next: data => {
        let debit = 0, credit = 0;
        for (const a of (data ?? [])) {
          const bb = a.bb ?? 0;
          if (bb > 0)      debit  += bb;
          else if (bb < 0) credit += Math.abs(bb);
        }
        this.obSeries = [Math.round(debit), Math.round(credit)];
        this.obLabels = [
          this.translate.instant('OpeningBalances.Debit'),
          this.translate.instant('OpeningBalances.Credit'),
        ];
        this.obLoaded = true;
      },
    });
  }

  /** Accounts List chart — counts accounts per level (from the chart of accounts). */
  private loadAccountsList(): void {
    if (this.alLoaded) return;
    this.coaSvc.getAll().subscribe({
      next: data => {
        const byLevel = new Map<number, number>();
        for (const a of (data ?? [])) {
          const lvl = a.level ?? 0;
          byLevel.set(lvl, (byLevel.get(lvl) ?? 0) + 1);
        }
        const levels = [...byLevel.keys()].sort((x, y) => x - y);
        this.alXaxis  = {
          categories: levels.map(l => `${this.translate.instant('AccountsListReport.Level')} ${l}`),
        };
        this.alSeries = [{
          name: this.translate.instant('AccountsListReport.TotalAccounts'),
          data: levels.map(l => byLevel.get(l) ?? 0),
        }];
        this.alLoaded = true;
      },
    });
  }

  private loadBalanceSheet(): void {
    if (this.bsLoaded) return;
    this.balanceSheetSvc.getReport({
      BegDate: this.dateFrom, AsOfDate: this.dateTo, Level: 1,
      ExcludeClosing: false, StockAccNo: null, EndingStock: 0,
    }).subscribe({
      next: r => {
        this.bsSeries = [
          Math.round(r.AssetsTotal),
          Math.round(Math.abs(r.LiabilitiesSumLevel1)),
          Math.round(r.TotalEquity),
        ];
        this.bsLabels = [
          this.translate.instant('BalanceSheet.Assets'),
          this.translate.instant('BalanceSheet.Liabilities'),
          this.translate.instant('BalanceSheet.Equity'),
        ];
        this.bsLoaded = true;
      },
    });
  }

  private loadIncomeStatement(): void {
    if (this.isLoaded) return;
    this.incomeSvc.getReport({
      DateFrom: this.dateFrom,
      DateTo: this.dateTo, Level: 1,
      ExcludeClosing: false, ShowZero: false,
      StockAccNo: null, BeginningStock: 0, EndingStock: 0,
    }).subscribe({
      next: r => {
        this.isXaxis = {
          categories: [
            this.translate.instant('IncomeStatement.IncomeTotal'),
            this.translate.instant('IncomeStatement.CogsTotal'),
            this.translate.instant('IncomeStatement.GrossProfit'),
            this.translate.instant('IncomeStatement.ExpensesTotal'),
            this.translate.instant(r.NetIncome >= 0
              ? 'IncomeStatement.Profits' : 'IncomeStatement.Losses'),
          ],
        };
        this.isSeries = [{
          name: this.translate.instant('IncomeStatement.Amount'),
          data: [
            Math.round(r.IncomeTotal),
            Math.round(r.CogsTotal),
            Math.round(r.GrossProfit),
            Math.round(r.ExpensesTotal),
            Math.round(r.NetIncome),
          ],
        }];
        this.isLoaded = true;
      },
    });
  }

  private loadTrialBalance(): void {
    if (this.tbLoaded) return;
    this.trialSvc.getReport({
      DateFrom: this.dateFrom,
      DateTo: this.dateTo, Level: 1,
      AllBranches: true, BranchNo: null,
      Detailed: true, Posted: null,
      ExcludeClosing: false, ShowZero: false, SubAccountsOnly: false,
    }).subscribe({
      next: rows => {
        const totDb = (rows ?? []).filter(r => r.Level === 1)
          .reduce((s, r) => s + r.DebitBalance, 0);
        const totCr = (rows ?? []).filter(r => r.Level === 1)
          .reduce((s, r) => s + r.CreditBalance, 0);
        this.tbSeries = [Math.round(totDb), Math.round(totCr)];
        this.tbLabels = [
          this.translate.instant('TrialBalance.DebitBalance'),
          this.translate.instant('TrialBalance.CreditBalance'),
        ];
        this.tbLoaded = true;
      },
    });
  }

  /** Build the dashboard-1 charts (monthly revenue, donut, cumulative, top customers). */
  private buildSalesCharts(d: DashboardDataDto): void {
    const months   = d.MonthlySales.map(m => m.MonthYear);
    const revenues = d.MonthlySales.map(m => Math.round(m.Revenue));
    this.monthlySeries = [{
      name: this.translate.instant('Dashboard.Revenue'),
      data: revenues,
    }];
    this.monthlyXaxis = { categories: months };

    const names  = d.TopCustomers.map(c => c.CustomerName);
    const totals = d.TopCustomers.map(c => Math.round(c.Total));
    this.customerSeries = [{
      name: this.translate.instant('Dashboard.Total'),
      data: totals,
    }];
    this.customerXaxis = { categories: names };

    this.donutSeries = d.InvoicesByType.map(t => t.Count);
    this.donutLabels = d.InvoicesByType.map(t => {
      const key = 'Dashboard.InvoiceType.' + t.InvoiceType;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : t.InvoiceType;
    });

    // Running-total revenue — derived client-side from MonthlySales.
    let running = 0;
    const cumulative = d.MonthlySales.map(m => {
      running += m.Revenue;
      return Math.round(running);
    });
    this.cumulativeSeries = [{
      name: this.translate.instant('Dashboard.CumulativeRevenue'),
      data: cumulative,
    }];
    this.cumulativeXaxis = { categories: months };
  }

  /** Build the dashboard-2 charts (sales vs service revenue + invoice counts). */
  private buildSales2Charts(d: Dashboard2DataDto): void {
    const svsMonths     = d.SalesVsService.map(m => m.MonthYear);
    const salesSeries   = d.SalesVsService.map(m => Math.round(m.SalesRevenue));
    const serviceSeries = d.SalesVsService.map(m => Math.round(m.ServiceRevenue));
    this.svsSeries = [
      { name: this.translate.instant('Dashboard2.Sales'),   data: salesSeries   },
      { name: this.translate.instant('Dashboard2.Service'), data: serviceSeries },
    ];
    this.svsXaxis = { categories: svsMonths };

    const countMonths        = d.InvoiceCounts.map(m => m.MonthYear);
    const salesCountSeries   = d.InvoiceCounts.map(m => m.SalesCount);
    const serviceCountSeries = d.InvoiceCounts.map(m => m.ServiceCount);
    this.countSeries = [
      { name: this.translate.instant('Dashboard2.Sales'),   data: salesCountSeries   },
      { name: this.translate.instant('Dashboard2.Service'), data: serviceCountSeries },
    ];
    this.countXaxis = { categories: countMonths };
  }

  /**
   * Aging buckets — reuses the AR-Aging block already returned by the
   * FinancialDashboard SP so no extra API call is needed.
   */
  private buildAgingChart(d: FinancialDashboardResultDto): void {
    this.agingXaxis = {
      categories: [
        this.translate.instant('AgingAnalysis.Bucket1_30'),
        this.translate.instant('AgingAnalysis.Bucket31_60'),
        this.translate.instant('AgingAnalysis.Bucket61_90'),
        this.translate.instant('FinDash.Aging.B91Plus'),
        this.translate.instant('FinDash.Aging.Current'),
      ],
    };
    this.agingSeries = [{
      name: this.translate.instant('AgingAnalysis.Balance'),
      data: [
        Math.round(d.ARAging.Bucket1_30),
        Math.round(d.ARAging.Bucket31_60),
        Math.round(d.ARAging.Bucket61_90),
        Math.round(d.ARAging.Bucket91Plus),
        Math.round(d.ARAging.BucketCurrent),
      ],
    }];
  }

  isVisible(id: CardId): boolean { return !this.hidden.has(id); }
  toggle(id: CardId): void {
    const card = this.allCards.find(c => c.id === id);
    const turningOn = this.hidden.has(id);
    // Enforce the chart cap — block enabling a 7th chart.
    if (turningOn && card?.group === 'chart' && this.visibleChartCount >= this.MAX_CHARTS) {
      return;
    }
    if (this.hidden.has(id)) this.hidden.delete(id); else this.hidden.add(id);
    this.persistHidden();
    // Lazy-fetch the source data the first time a report card is enabled.
    if (this.isVisible(id)) {
      if (id === 'chartBalanceSheet')    this.loadBalanceSheet();
      if (id === 'chartIncomeStatement') this.loadIncomeStatement();
      if (id === 'chartTrialBalance')    this.loadTrialBalance();
      if (id === 'chartAccountsList')    this.loadAccountsList();
      if (id === 'chartOpeningBalances') this.loadOpeningBalances();
      if (id === 'chartCcOpeningBalances') this.loadCcOpeningBalances();
    }
  }
  /** Reset to defaults: all KPIs + the first MAX_CHARTS charts. */
  showAll(): void {
    this.hidden = new Set(this.chartCards.slice(this.MAX_CHARTS).map(c => c.id));
    this.persistHidden();
    this.loadVisibleReportCards();
  }

  // ── Formatting helpers ─────────────────────────────────────────────────
  /** Compact currency formatter (e.g. 1.3M, 219.4K). */
  compact(value: number): string {
    if (value == null || isNaN(value)) return '0';
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000)     return (value / 1_000).toFixed(1) + 'K';
    return value.toFixed(0);
  }
  money(value: number): string { return '$' + this.compact(value); }
  pct(value: number): string { return (value ?? 0).toFixed(1) + '%'; }
  ratio(value: number): string { return (value ?? 0).toFixed(2); }

  // ── Internal ──────────────────────────────────────────────────────────
  private buildCharts(d: FinancialDashboardResultDto): void {
    const months = d.Monthly.map(m => this.shortMonth(m.MonthYear));

    // Working capital
    this.wcXaxis = { categories: months };
    this.wcSeries = [
      { name: this.translate.instant('FinDash.NetWorkingCapital'),
        data: d.Monthly.map(m => Math.round(m.NetWorkingCapital)) },
      { name: this.translate.instant('FinDash.GrossWorkingCapital'),
        data: d.Monthly.map(m => Math.round(m.CurrentAssets)) },
    ];

    // Inventory
    this.invXaxis = { categories: months };
    this.invSeries = [{
      name: this.translate.instant('FinDash.Chart.Inventory'),
      data: d.Monthly.map(m => Math.round(m.Inventory)),
    }];

    // AR/AP turnover
    this.turnoverXaxis = { categories: months };
    this.turnoverSeries = [
      { name: this.translate.instant('FinDash.ARTurnover'),
        data: d.Monthly.map(m => Number(m.ARTurnover)) },
      { name: this.translate.instant('FinDash.APTurnover'),
        data: d.Monthly.map(m => Number(m.APTurnover)) },
    ];

    // AP aging (Current, 91+, 61-90, 31-60, 1-30)
    const apLabels = [
      this.translate.instant('FinDash.Aging.Current'),
      this.translate.instant('FinDash.Aging.B91Plus'),
      this.translate.instant('FinDash.Aging.B61_90'),
      this.translate.instant('FinDash.Aging.B31_60'),
      this.translate.instant('FinDash.Aging.B1_30'),
    ];
    this.apAgingXaxis  = { categories: apLabels };
    this.apAgingSeries = [{
      name: this.translate.instant('FinDash.KPI.AP'),
      data: [
        Math.round(d.APAging.BucketCurrent),
        Math.round(d.APAging.Bucket91Plus),
        Math.round(d.APAging.Bucket61_90),
        Math.round(d.APAging.Bucket31_60),
        Math.round(d.APAging.Bucket1_30),
      ],
    }];
    this.arAgingXaxis  = { categories: apLabels };
    this.arAgingSeries = [{
      name: this.translate.instant('FinDash.KPI.AR'),
      data: [
        Math.round(d.ARAging.BucketCurrent),
        Math.round(d.ARAging.Bucket91Plus),
        Math.round(d.ARAging.Bucket61_90),
        Math.round(d.ARAging.Bucket31_60),
        Math.round(d.ARAging.Bucket1_30),
      ],
    }];
  }

  private shortMonth(yyyymm: string): string {
    // "2026-05" → "May" using the translation framework's locale.
    const [y, m] = yyyymm.split('-').map(Number);
    if (!y || !m) return yyyymm;
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString(this.isAr ? 'ar' : 'en', { month: 'short' });
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ── localStorage persistence ──────────────────────────────────────────
  private loadHidden(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.hidden = new Set(JSON.parse(raw));
        this.enforceChartCap();
        return;
      }
    } catch { /* ignore corrupt JSON */ }
    // Default: all KPIs + only the first MAX_CHARTS charts shown.
    this.hidden = new Set(this.chartCards.slice(this.MAX_CHARTS).map(c => c.id));
  }

  /** Trim any persisted state that exceeds the chart cap (keeps the first N). */
  private enforceChartCap(): void {
    const visible = this.chartCards.filter(c => this.isVisible(c.id));
    if (visible.length > this.MAX_CHARTS) {
      visible.slice(this.MAX_CHARTS).forEach(c => this.hidden.add(c.id));
      this.persistHidden();
    }
  }
  private persistHidden(): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify([...this.hidden])); }
    catch { /* quota or disabled storage */ }
  }
}
