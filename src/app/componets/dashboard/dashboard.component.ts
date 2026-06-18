import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ApexResponsive,
} from 'ng-apexcharts';
import { DashboardService, DashboardDataDto } from '../../shared/services/dashboard.service';
import { DONUT_COLORS, DONUT_DATA_LABELS } from '../../shared/chart-theme';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DashboardComponent implements OnInit {
  loading = true;
  data: DashboardDataDto | null = null;

  // ── Monthly Sales (area/line) ────────────────────────────────────────────
  monthlySeries:  ApexAxisChartSeries = [];
  monthlyChart:   ApexChart = { type: 'area', height: 300, toolbar: { show: false }, fontFamily: 'inherit' };
  monthlyXaxis:   ApexXAxis = { categories: [] };
  monthlyStroke:  ApexStroke  = { curve: 'smooth', width: 2 };
  monthlyFill:    ApexFill    = { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } };
  monthlyTooltip: ApexTooltip = { x: { format: 'MM/yyyy' } };

  // ── Top Customers (horizontal bar) ──────────────────────────────────────
  customerSeries:  ApexAxisChartSeries = [];
  customerChart:   ApexChart  = { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' };
  customerXaxis:   ApexXAxis  = { categories: [] };
  customerPlot:    ApexPlotOptions = { bar: { horizontal: true, barHeight: '60%', borderRadius: 4 } };
  customerDataLabels: ApexDataLabels = { enabled: false };

  // ── Invoice Types (donut) ────────────────────────────────────────────────
  donutSeries:    ApexNonAxisChartSeries = [];
  donutChart:     ApexChart = { type: 'donut', height: 300, fontFamily: 'inherit' };
  donutLabels:    string[] = [];
  donutLegend:    ApexLegend = { position: 'bottom' };
  donutColors     = DONUT_COLORS;
  donutDataLabels = DONUT_DATA_LABELS;
  donutResponsive: ApexResponsive[] = [{ breakpoint: 480, options: { chart: { height: 220 } } }];

  constructor(
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.data = data;
        this.buildCharts(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private buildCharts(data: DashboardDataDto): void {
    // Monthly sales chart
    const months   = data.MonthlySales.map(m => m.MonthYear);
    const revenues = data.MonthlySales.map(m => Math.round(m.Revenue));
    this.monthlySeries = [{ name: this.translate.instant('Dashboard.Revenue'), data: revenues }];
    this.monthlyXaxis  = { categories: months };

    // Top customers bar chart
    const names  = data.TopCustomers.map(c => c.CustomerName);
    const totals = data.TopCustomers.map(c => Math.round(c.Total));
    this.customerSeries = [{ name: this.translate.instant('Dashboard.Total'), data: totals }];
    this.customerXaxis  = { categories: names };

    // Invoice types donut
    this.donutSeries = data.InvoicesByType.map(t => t.Count);
    this.donutLabels = data.InvoicesByType.map(t =>
      this.translate.instant('Dashboard.InvoiceType.' + t.InvoiceType) !== 'Dashboard.InvoiceType.' + t.InvoiceType
        ? this.translate.instant('Dashboard.InvoiceType.' + t.InvoiceType)
        : t.InvoiceType
    );
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
}
