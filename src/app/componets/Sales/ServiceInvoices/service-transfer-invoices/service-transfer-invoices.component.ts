import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { ServiceInvoiceService, ServiceInvoiceMainData } from "../../../../shared/services/service-invoice.service";
import { FotaraService } from "../../../../shared/services/fotara.service";
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../shared/services/auth.service';
// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

interface ServiceInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  selected?: boolean;
}

@Component({
  selector: 'app-service-transfer-invoices',
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
    MatCheckboxModule
  ],
  templateUrl: './service-transfer-invoices.component.html',
  styleUrl: './service-transfer-invoices.component.scss'
})
export class ServiceTransferInvoicesComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['select', 'InvoiceDate', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'actions'];
  dataSource = new MatTableDataSource<ServiceInvoiceData>([]);
  selection = new SelectionModel<ServiceInvoiceData>(true, []);
  
  // Keep track of selected transaction numbers
  selectedTransactionNumbers = new Set<string>();
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: ServiceInvoiceData[] = [];
  allData: ServiceInvoiceData[] = []; // Store all data here
  
  // Delivery info
  deliveryId: number = 1;
  deliveryName: string = '';

  
  // State
  loading: boolean = true;
  transferInProgress: boolean = false;
  
  constructor(
    private serviceInvoiceService: ServiceInvoiceService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private authService: AuthService,
        private router: Router,
    private fotaraService: FotaraService
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
   * Load invoices data from service
   */
  private loadData(deliveryId: number): void {
    this.loading = true;
    this.selectedTransactionNumbers.clear(); // Clear selections when loading new data
    
    this.serviceInvoiceService.getUntransferredInvoicesMainData(deliveryId).subscribe({
      next: (data) => {
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
        console.error('Error loading service invoices:', error);
        this.toastr.error(
          this.translate.instant('ServiceTransferInvoicesPage.LoadError'),
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
    
    // Important: Reset the selection model but keep our tracking intact
    this.selection.clear();
    
    // Select items on the current page that are in our tracking set
    this.dataSource.data.forEach(item => {
      if (this.selectedTransactionNumbers.has(item.TransactionNumber)) {
        this.selection.select(item);
      }
    });
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
   * Whether all rows are selected on the current page
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }
  
  /**
   * Toggle selection for all rows on the current page
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      // If all are selected, clear the selection on this page
      this.selection.selected.forEach(row => {
        this.selectedTransactionNumbers.delete(row.TransactionNumber);
      });
      this.selection.clear();
    } else {
      // Select all rows on the current page
      this.dataSource.data.forEach(row => {
        this.selection.select(row);
        this.selectedTransactionNumbers.add(row.TransactionNumber);
      });
    }
  }
  
  /**
   * Toggle selection for a single row
   */
  toggleRowSelection(row: ServiceInvoiceData): void {
    this.selection.toggle(row);
    
    if (this.selection.isSelected(row)) {
      this.selectedTransactionNumbers.add(row.TransactionNumber);
    } else {
      this.selectedTransactionNumbers.delete(row.TransactionNumber);
    }
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
   * Transfer selected invoices - now using TransactionNumber
   */
  async transferSelectedInvoices(): Promise<void> {
    if (this.selectedTransactionNumbers.size === 0) {
      this.toastr.warning(
        this.translate.instant('ServiceTransferInvoicesPage.NoInvoicesSelected'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    // Set loading state to prevent multiple transfers
    this.transferInProgress = true;
    this.loading = true;
    
    try {
      // Track successful and failed transfers
      const successfulTransfers: string[] = [];
      const failedTransfers: string[] = [];
      
      // Process each selected invoice serially to prevent overwhelming the API
      for (const transactionNumber of this.selectedTransactionNumbers) {
        try {
          // Step 1: Get invoice details
          console.log(`Fetching details for service transaction ${transactionNumber}`);
          // Find the financial year for this transaction number
          const invoiceRow = this.originalData.find(row => row.TransactionNumber === transactionNumber);
          if (!invoiceRow) {
            console.error(`Service invoice data not found for transaction ${transactionNumber}`);
            failedTransfers.push(transactionNumber);
            continue;
          }

          const financialYear = invoiceRow.FinancialYear;
          const invoiceData = await firstValueFrom(
            this.serviceInvoiceService.getTransferInvoiceData(Number(transactionNumber), Number(financialYear))
          );
          
          // Step 2: Send to Fotara API
          console.log(`Sending service transaction ${transactionNumber} to Fotara API`);
          const fotaraResponse = await firstValueFrom(this.fotaraService.sendToFotaraApi(invoiceData));
          
          // Step 3: Check response status and update QR code in database if successful
          if (fotaraResponse.status === 'success' && fotaraResponse.qr_code) {
            console.log(`Updating QR code for service transaction ${transactionNumber}`);
            try {
              const qrUpdateResponse = await firstValueFrom(
                this.serviceInvoiceService.updateQRCode({
                  TransNumber: transactionNumber,
                  QRCode: fotaraResponse.qr_code
                })
              );
              
              // Just log and add to successful transfers, no warnings ever
              console.log(`QR code update processed for virtual transaction ${transactionNumber}`, qrUpdateResponse);
              successfulTransfers.push(transactionNumber);
              
              // No warnings at all, regardless of response
            } catch (qrUpdateError) {
              // Just log the error and continue, no warnings
              console.error(`Error updating QR code for virtual transaction ${transactionNumber}:`, qrUpdateError);
              successfulTransfers.push(transactionNumber);
              
              // No warnings here either
            }
          } else {
            console.error(`No QR code or unsuccessful response for service transaction ${transactionNumber}:`, fotaraResponse);
            failedTransfers.push(transactionNumber);
          }
        } catch (error) {
          console.error(`Error processing service transaction ${transactionNumber}:`, error);
          failedTransfers.push(transactionNumber);
        }
      }
      
      // Show success message with counts
      if (successfulTransfers.length > 0) {
        const successMessage = this.translate.instant('ServiceTransferInvoicesPage.SuccessMessage');
        const detailMessage = this.translate.instant('ServiceTransferInvoicesPage.TransferSuccessDetail', {
          success: successfulTransfers.length,
          total: this.selectedTransactionNumbers.size
        });
          
        this.toastr.success(detailMessage, successMessage);
      }
      
      // Show warning if some transfers failed
      if (failedTransfers.length > 0) {
        const warningMessage = this.translate.instant('ServiceTransferInvoicesPage.PartialFailure');
        const failureDetail = this.translate.instant('ServiceTransferInvoicesPage.TransferFailureDetail', {
          failed: failedTransfers.length,
          invoices: failedTransfers.join(', ')
        });
          
        this.toastr.warning(failureDetail, warningMessage);
      }
      
      // Reload data to reflect changes
      if (successfulTransfers.length > 0) {
        this.loadData(this.deliveryId);
      }
    } catch (error) {
      console.error('Error in service transfer process:', error);
      this.toastr.error(
        this.translate.instant('ServiceTransferInvoicesPage.TransferError'),
        this.translate.instant('General.Error')
      );
    } finally {
      this.loadData(this.deliveryId);
      this.transferInProgress = false;
      this.loading = false;
      
    }
  }

  /**
   * Apply filter to data source
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    
    const filteredData = this.originalData.filter(item => {
      return item.InvoiceNumber.toLowerCase().includes(filterValue) ||
             item.CustomerName.toLowerCase().includes(filterValue) ||
             item.FinancialYear.toLowerCase().includes(filterValue) ||
             item.InvoiceAmount.toLowerCase().includes(filterValue) ||
             item.InvoiceDate.toLowerCase().includes(filterValue); // Add date filtering
    });
    
    // Update total count for pagination
    this.totalItems = filteredData.length;
    
    // Reset page index to first page when filtering
    this.pageIndex = 0;
    
    // Store the filtered data
    this.allData = filteredData;
    
    // Apply pagination
    this.applyPagination();
    
    // Ensure we reset to first page
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  
  /**
   * Get the total number of selected items across all pages
   */
  getSelectedCount(): number {
    return this.selectedTransactionNumbers.size;
  }
}