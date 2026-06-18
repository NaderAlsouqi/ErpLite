import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexStroke,
  ApexFill,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexTooltip,
} from 'ng-apexcharts';
import {
  DashboardService,
  Dashboard2DataDto,
} from '../../shared/services/dashboard.service';

@Component({
  selector: 'app-dashboard2',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgApexchartsModule],
  templateUrl: './dashboard2.component.html',
  styleUrls: ['./dashboard2.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Dashboard2Component implements OnInit {
  loading = true;
  data: Dashboard2DataDto | null = null;

  // ── Grouped column: Sales vs Service revenue ─────────────────────────────
  revSeries:      ApexAxisChartSeries = [];
  revChart:       ApexChart = { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' };
  revXaxis:       ApexXAxis = { categories: [] };
  revPlot:        ApexPlotOptions = { bar: { columnWidth: '55%', borderRadius: 4 } };
  revDataLabels:  ApexDataLabels = { enabled: false };
  revLegend:      ApexLegend = { position: 'top' };
  revColors:      string[] = ['#6c5ce7', '#00b894'];

  // ── Stacked area: Invoice counts ─────────────────────────────────────────
  cntSeries:      ApexAxisChartSeries = [];
  cntChart:       ApexChart = { type: 'area', height: 320, stacked: true, toolbar: { show: false }, fontFamily: 'inherit' };
  cntXaxis:       ApexXAxis = { categories: [] };
  cntStroke:      ApexStroke = { curve: 'smooth', width: 2 };
  cntFill:        ApexFill = { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } };
  cntDataLabels:  ApexDataLabels = { enabled: false };
  cntLegend:      ApexLegend = { position: 'top' };
  cntColors:      string[] = ['#fd79a8', '#fdcb6e'];
  cntTooltip:     ApexTooltip = { shared: true, intersect: false };

  constructor(
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dashboardService.getDashboard2Data().subscribe({
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

  private buildCharts(data: Dashboard2DataDto): void {
    const months = data.SalesVsService.map(r => r.MonthYear);

    // Revenue comparison chart
    this.revSeries = [
      { name: this.translate.instant('Dashboard2.Sales'),   data: data.SalesVsService.map(r => Math.round(r.SalesRevenue)) },
      { name: this.translate.instant('Dashboard2.Service'), data: data.SalesVsService.map(r => Math.round(r.ServiceRevenue)) },
    ];
    this.revXaxis = { categories: months };

    // Invoice count stacked area
    const cntMonths = data.InvoiceCounts.map(r => r.MonthYear);
    this.cntSeries = [
      { name: this.translate.instant('Dashboard2.Sales'),   data: data.InvoiceCounts.map(r => r.SalesCount) },
      { name: this.translate.instant('Dashboard2.Service'), data: data.InvoiceCounts.map(r => r.ServiceCount) },
    ];
    this.cntXaxis = { categories: cntMonths };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
}
