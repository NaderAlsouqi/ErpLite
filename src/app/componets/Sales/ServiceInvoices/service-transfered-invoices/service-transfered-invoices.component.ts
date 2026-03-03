import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceInvoiceService, ServiceInvoiceMainData } from '../../../../shared/services/service-invoice.service';
import { ReportService } from '../../../../shared/services/report.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';

interface ServiceInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
}

@Component({
  selector: 'app-service-transfered-invoices',
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
  templateUrl: './service-transfered-invoices.component.html',
  styleUrl: './service-transfered-invoices.component.scss'
})
export class ServiceTransferedInvoicesComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['InvoiceDate', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'actions'];
  dataSource = new MatTableDataSource<ServiceInvoiceData>([]);
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: ServiceInvoiceData[] = [];
  allData: ServiceInvoiceData[] = []; // Store all data here
  
  // Delivery info
  deliveryId: number = 0;
  deliveryName: string = '';
  
  // State
  loading: boolean = true;
  
  constructor(
    private serviceInvoiceService: ServiceInvoiceService,
    private reportService: ReportService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      return data.InvoiceNumber.toLowerCase().includes(filter) ||
             data.CustomerName.toLowerCase().includes(filter) ||
             data.FinancialYear.toLowerCase().includes(filter) ||
             data.InvoiceAmount.toString().includes(filter) ||
             data.InvoiceDate.toLowerCase().includes(filter);
    };
  }
  
  ngOnInit(): void {
    // Get delivery info from localStorage
    const storedDeliveryId = localStorage.getItem('DeliveryId');
    const storedDeliveryName = localStorage.getItem('DeliveryName');
    
    if (storedDeliveryId) {
      this.deliveryId = parseInt(storedDeliveryId, 10);
    }
    
    if (storedDeliveryName) {
      this.deliveryName = storedDeliveryName;
    }
    
    // Load data
    this.loadData(this.deliveryId);
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No need to reload columns as we're not using smart table
    });
  }
  
  /**
   * Load transferred service invoices data from service
   */
  private loadData(deliveryId: number): void {
    this.loading = true;
    
    this.serviceInvoiceService.getTransferredInvoicesMainData(deliveryId).subscribe({
      next: (data) => {
        console.log('Transferred service invoices data:', data);
        
        const formattedData = data.map((invoice: ServiceInvoiceMainData) => ({
          InvoiceDate: this.formatDate(invoice.InvoiceDate),
          InvoiceNumber: invoice.InvoiceNumber,
          TransactionNumber: invoice.TransactionNumber,
          CustomerName: invoice.CustomerName,
          FinancialYear: Math.floor(Number(invoice.FinancialYear)).toString(),
          InvoiceAmount: parseFloat(invoice.InvoiceAmount).toFixed(3),
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
        console.error('Error loading transferred service invoices:', error);
        this.toastr.error(
          this.translate.instant('ServiceTransferredInvoicesPage.LoadError'),
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
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
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
    if (sortState.direction) {
      const isAsc = sortState.direction === 'asc';
      
      // Sort the data based on the selected column
      this.allData = [...this.allData].sort((a, b) => {
        switch (sortState.active) {
          case 'InvoiceDate': return this.compare(a.InvoiceDate, b.InvoiceDate, isAsc);
          case 'InvoiceNumber': return this.compare(a.InvoiceNumber, b.InvoiceNumber, isAsc);
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
   * Apply filter to data source
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    
    // Filter the original data
    const filteredData = this.originalData.filter(item => {
      return item.InvoiceNumber.toLowerCase().includes(filterValue) ||
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
  }
  
  /**
   * View invoice details
   */
  viewInvoice(transactionNumber: string): void {
    try {
      // Make sure this matches your route definition exactly
      this.router.navigate(['/sales/service/invoice-details', transactionNumber]);
    } catch (error) {
      this.toastr.error(
        this.translate.instant('ServiceInvoicesPage.NavigationError'),
        this.translate.instant('General.Error')
      );
    }
  }


  /**
 * Generate and download the invoice PDF
 * @param transactionNumber Transaction number of the invoice to print
 * @param invoiceNumber Invoice number for naming the PDF file
 */
  printInvoice(transactionNumber: string, invoiceNumber: string): void {
    if (!transactionNumber || !invoiceNumber) {
      this.toastr.error(
        this.translate.instant('ServiceInvoiceDetailsPage.PrintError'),
        this.translate.instant('General.Error')
      );
      return;
    }
  
    const loadingToastRef = this.toastr.info(
      this.translate.instant('ServiceInvoiceDetailsPage.GeneratingPDF'),
      this.translate.instant('General.Processing'),
      { disableTimeOut: true }
    );
  
    this.reportService.generateTransferredServiceInvoicePDF(
      transactionNumber, 
      invoiceNumber
    ).subscribe({
      next: (pdfBlob: Blob) => {
        this.toastr.clear(loadingToastRef.toastId);
  
        // Create a URL for the blob
        const url = window.URL.createObjectURL(pdfBlob);
  
        // Open the PDF in a new window/tab
        window.open(url, '_blank');
  
        // Optional: revoke the URL after some time to free up memory
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
  
        this.toastr.success(
          this.translate.instant('ServiceInvoiceDetailsPage.PDFGenerated'),
          this.translate.instant('General.Success')
        );
      },
      error: (error) => {
        this.toastr.clear(loadingToastRef.toastId);
        console.error('Error generating PDF:', error);
        this.toastr.error(
          this.translate.instant('ServiceInvoiceDetailsPage.PDFGenerationError'),
          this.translate.instant('General.Error')
        );
      }
    });
  }
  

}