import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceInvoiceService as InvoiceService } from '../../../../shared/services/service-invoice.service';
import { ReportService } from '../../../../shared/services/report.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { AuthService } from '../../../../shared/services/auth.service';

interface RefundData {
  InvoiceDate: string;
  DocumentNumber: string;
  TransactionNumber: string;
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  IsTransferred?: boolean;
  RIsTransfered?: boolean;
  RQRCode?: string;
}

@Component({
  selector: 'app-service-service-transfered-refunds',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    FormsModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './service-transfered-refunds.component.html',
  styleUrl: './service-transfered-refunds.component.scss'
})
export class ServiceTransferedRefundsComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['InvoiceDate', 'DocumentNumber', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'actions'];
  dataSource = new MatTableDataSource<RefundData>([]);

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: RefundData[] = [];
  allData: RefundData[] = []; // Store all data here

  // Delivery info
  deliveryId: number = 0;
  deliveryName: string = '';
  deliveryLimit: boolean = false;

  // State
  loading: boolean = true;

  constructor(
    private invoiceService: InvoiceService,
    private reportService: ReportService,
    private authService: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      return data.DocumentNumber.toLowerCase().includes(filter) ||
        data.InvoiceNumber.toLowerCase().includes(filter) ||
        data.CustomerName.toLowerCase().includes(filter) ||
        data.FinancialYear.toLowerCase().includes(filter) ||
        data.InvoiceAmount.toString().includes(filter) ||
        data.InvoiceDate.toLowerCase().includes(filter);
    };
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
      if (user.Roles.includes('CashLinkLimit') || user.Roles.includes('VirtualCashLinkLimit')) {
        this.deliveryLimit = true;
      }
    }

    // Load data
    this.loadData(this.deliveryId);

    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No need to reload columns as we're not using smart table
    });
  }

  private loadData(deliveryId: number): void {
    this.loading = true;

    this.invoiceService.GetTransferedServiceRefundsMainInfo(deliveryId).subscribe({
      next: (data) => {
        console.log('Transferred refunds data:', data);

        const formattedData = data.map((refund: any) => ({
          InvoiceDate: this.formatDate(refund.InvoiceDate || refund.invoiceDate),
          DocumentNumber: refund.DocumentNumber ?? refund.documentNumber ?? '',
          TransactionNumber: refund.TransactionNumber ?? refund.transactionNumber ?? refund.DocumentNumber ?? refund.documentNumber ?? '',
          InvoiceNumber: refund.InvoiceNumber ?? refund.invoiceNumber ?? '',
          CustomerName: refund.CustomerName ?? refund.customerName ?? '',
          FinancialYear: Math.floor(Number(refund.FinancialYear ?? refund.financialYear)).toString(),
          InvoiceAmount: parseFloat(refund.InvoiceAmount ?? refund.invoiceAmount ?? 0).toFixed(3),
          RIsTransfered: !!(refund.rIsTransfered ?? refund.RIsTransfered),
          RQRCode: refund.rQRCode ?? refund.RQRCode ?? null,
        }));

        // Store all data
        this.allData = formattedData;
        this.originalData = [...formattedData];
        this.totalItems = formattedData.length;

        // Apply initial pagination
        this.applyPagination();

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transferred refunds:', error);
        this.toastr.error(
          this.translate.instant('TransferredRefundsPage.LoadError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Apply pagination to the data
   */
  private applyPagination(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    // Update the data source with the paginated data
    this.dataSource.data = this.allData.slice(startIndex, endIndex);
  }

  /**
   * Format API date to yyyy-MM-dd
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original on error
    }
  }

  /**
   * Handle page change event
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    // Apply pagination with the new page parameters
    this.applyPagination();
  }

  /**
   * Handle sort change event
   */
  onSortChange(sortState: Sort): void {
    // Handle sorting logic
    if (sortState.direction) {
      this.allData.sort((a, b) => {
        const isAsc = sortState.direction === 'asc';
        switch (sortState.active) {
          case 'InvoiceDate': return this.compare(a.InvoiceDate, b.InvoiceDate, isAsc);
          case 'DocumentNumber':
            return this.compare(
              parseInt(a.DocumentNumber, 10) || 0,
              parseInt(b.DocumentNumber, 10) || 0,
              isAsc
            );
          case 'InvoiceNumber':
            return this.compare(
              parseInt(a.InvoiceNumber, 10) || 0,
              parseInt(b.InvoiceNumber, 10) || 0,
              isAsc
            );
          case 'CustomerName': return this.compare(a.CustomerName, b.CustomerName, isAsc);
          case 'FinancialYear': return this.compare(a.FinancialYear, b.FinancialYear, isAsc);
          case 'InvoiceAmount': return this.compare(parseFloat(a.InvoiceAmount), parseFloat(b.InvoiceAmount), isAsc);
          default: return 0;
        }
      });

      // Reset to first page when sorting
      this.pageIndex = 0;

      // Apply pagination with the sorted data
      this.applyPagination();
    }
  }

  /**
   * Comparison function for sorting
   */
  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  /**
   * View refund details
   */
  viewRefund(documentNumber: string, invoiceNumber: string, year: string): void {
    try {
      this.router.navigate(['/sales/service/refund-details'], {
        queryParams: {
          doc: documentNumber,
          bill: invoiceNumber,
          year: year
        }
      });
    } catch (error) {
      console.error('Error navigating to refund details:', error);
      this.toastr.error(
        this.translate.instant('TransferredRefundsPage.NavigationError'),
        this.translate.instant('General.Error')
      );
    }
  }

  /**
   * Print refund receipt
   */
  printRefund(documentNumber: string, invoiceNumber: string, year: string): void {
    this.loading = true;

    this.reportService.GenerateServiceTransferedRefundPDF(documentNumber, invoiceNumber, year).subscribe({
      next: (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
        window.open(blobUrl);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error printing refund:', error);
        this.toastr.error(
          this.translate.instant('TransferredRefundsPage.PrintError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Apply filter to data source
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase().trim();

    // If filter is empty, restore the original data
    if (!filterValue) {
      this.allData = [...this.originalData];
      this.totalItems = this.originalData.length;
      this.pageIndex = 0;
      this.applyPagination();
      return;
    }

    // Apply filter to original data (not the already filtered data)
    const filteredData = this.originalData.filter(item => {
      return item.DocumentNumber.toLowerCase().includes(filterValue) ||
        item.InvoiceNumber.toLowerCase().includes(filterValue) ||
        item.CustomerName.toLowerCase().includes(filterValue) ||
        item.FinancialYear.toLowerCase().includes(filterValue) ||
        item.InvoiceAmount.toLowerCase().includes(filterValue) ||
        item.InvoiceDate.toLowerCase().includes(filterValue);
    });

    // Update total count for pagination
    this.totalItems = filteredData.length;

    // Reset page index to first page when filtering
    this.pageIndex = 0;

    // Store the filtered data
    this.allData = filteredData;

    // Apply pagination
    this.applyPagination();

    // Notify when no records match the search
    if (filteredData.length === 0) {
      this.toastr.info(
        this.translate.instant('TransferredRefundsPage.NoMatchingResults'),
        this.translate.instant('General.Info')
      );
    }
  }
}

