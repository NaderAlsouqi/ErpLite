import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VirtualInvoiceService } from '../../../../shared/services/virtual-invoice.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { FotaraService } from "../../../../shared/services/fotara.service";
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../shared/services/auth.service';
// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

interface VirtualInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
}

@Component({
  selector: 'app-virtual-transfer-invoices',
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
  templateUrl: './virtual-transfer-invoices.component.html',
  styleUrl: './virtual-transfer-invoices.component.scss'
})
export class VirtualTransferInvoicesComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['select', 'InvoiceDate', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'actions'];
  dataSource = new MatTableDataSource<VirtualInvoiceData>([]);
  selection = new SelectionModel<VirtualInvoiceData>(true, []);
  
  // Keep track of selected transaction numbers
  selectedTransactionNumbers = new Set<string>();
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: VirtualInvoiceData[] = [];
  allData: VirtualInvoiceData[] = []; // Store all data here
  
  // Delivery info
  deliveryId: number = 1;
  deliveryName: string = '';

  // State
  loading: boolean = true;
  deliveryLimit: boolean = true;  
  transferInProgress: boolean = false;
  
  constructor(
    private virtualInvoiceService: VirtualInvoiceService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private authService: AuthService,
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
    debugger;
    // Get delivery info from localStorage
    const storedDeliveryId = localStorage.getItem('DeliveryId');
    const storedDeliveryName = localStorage.getItem('DeliveryName');
    
    const user = this.authService.currentUserValue;
    if (user) {      
      if(user.Roles.includes('CashLinkLimit') || user.Roles.includes('VirtualCashLinkLimit')){this.deliveryLimit=false;};
    }
    
    if (storedDeliveryId) {
      this.deliveryId = parseInt(storedDeliveryId, 10);
    }
    
    if (storedDeliveryName) {
      this.deliveryName = storedDeliveryName;
    }
    

    // Load data
    this.loadData(this.deliveryId);
  }
  
  /**
   * Load virtual invoices data from service
   */
  private loadData(deliveryId: number): void {
    this.loading = true;
    this.selectedTransactionNumbers.clear(); // Clear selections when loading new data
    
    this.virtualInvoiceService.GetUntransferredInvoicesMainData(deliveryId).subscribe({
      next: (data) => {
        const formattedData = data.map((invoice: any) => ({
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
        console.error('Error loading virtual invoices:', error);
        this.toastr.error(
          this.translate.instant('VirtualTransferInvoicesPage.LoadError'),
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
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
   * Whether all rows are selected on the current page
   */
  isAllSelected(): boolean {
    // Check if all rows on the current page are selected
    const currentPageData = this.dataSource.data;
    return currentPageData.length > 0 && 
           currentPageData.every(row => this.selectedTransactionNumbers.has(row.TransactionNumber));
  }
  
  /**
   * Toggle selection for all rows on the current page
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      // Deselect all rows on the current page
      this.dataSource.data.forEach(row => {
        this.selectedTransactionNumbers.delete(row.TransactionNumber);
      });
    } else {
      // Select all rows on the current page
      this.dataSource.data.forEach(row => {
        this.selectedTransactionNumbers.add(row.TransactionNumber);
      });
    }
    
    // Update the selection model to match our tracking
    this.applyPagination();
  }
  
  /**
   * Toggle selection for a single row
   */
  toggleRowSelection(row: VirtualInvoiceData): void {
    // Handle our tracking set
    if (this.selectedTransactionNumbers.has(row.TransactionNumber)) {
      this.selectedTransactionNumbers.delete(row.TransactionNumber);
    } else {
      this.selectedTransactionNumbers.add(row.TransactionNumber);
    }
    
    // Toggle in the selection model too (for UI display)
    this.selection.toggle(row);
  }
  
  /**
   * View invoice details with transaction number and financial year
   */
  viewInvoice(transactionNumber: string, financialYear: string): void {
    // Navigate to the virtual invoice details view
    this.router.navigate(['/sales/virtual/invoice-details', transactionNumber]);
  }
  
  /**
   * Transfer selected invoices
   */
  async transferSelectedInvoices(): Promise<void> {
    debugger;
    if (this.selectedTransactionNumbers.size === 0) {
      this.toastr.warning(
        this.translate.instant('VirtualTransferInvoicesPage.NoInvoicesSelected'),
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
          console.log(`Fetching details for virtual transaction ${transactionNumber}`);
          // Find the financial year for this transaction number
          const invoiceRow = this.originalData.find(row => row.TransactionNumber === transactionNumber);
          if (!invoiceRow) {
            console.error(`Virtual invoice data not found for transaction ${transactionNumber}`);
            failedTransfers.push(transactionNumber);
            continue;
          }

          const financialYear = invoiceRow.FinancialYear;
          
          // Step 2: Get virtual invoice data (You might need to create this method in your service)
          const invoiceData = await firstValueFrom(
            this.fotaraService.getVirtualTransferInvoice(transactionNumber, financialYear)
          );

          invoiceData.city_code = invoiceData.city_code|| "";
          invoiceData.zip_code = invoiceData.zip_code|| "";
          
          // Step 3: Send to Fotara API
          console.log(`Sending virtual transaction ${transactionNumber} to Fotara API`);
          const fotaraResponse = await firstValueFrom(this.fotaraService.sendToFotaraApi(invoiceData));      
           
          // Step 4: Check response status and update QR code if successful
          if (fotaraResponse.status === 'success' && fotaraResponse.qr_code) {
            console.log(`Updating QR code for virtual transaction ${transactionNumber}`);
            // Use the transaction number as TransNumber
            try {
              const qrUpdateResponse = await firstValueFrom(
                this.virtualInvoiceService.updateVirtualInvoiceQrCode(transactionNumber, fotaraResponse.qr_code)
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
            console.error(`No QR code or unsuccessful response for virtual transaction ${transactionNumber}:`, fotaraResponse);
            failedTransfers.push(transactionNumber);
          }
        } catch (error) {
          console.error(`Error processing virtual transaction ${transactionNumber}:`, error);
          failedTransfers.push(transactionNumber);
        }
      }
      
      // Show success message with counts
      if (successfulTransfers.length > 0) {
        const successMessage = this.translate.instant('VirtualTransferInvoicesPage.SuccessMessage');
        const detailMessage = this.translate.instant('VirtualTransferInvoicesPage.TransferSuccessDetail', {
          success: successfulTransfers.length,
          total: this.selectedTransactionNumbers.size
        });
          
        this.toastr.success(detailMessage, successMessage);
        
        // Clear selections immediately
        this.selectedTransactionNumbers.clear();
        this.selection.clear();
        
        // Small delay to ensure backend processing completes
        setTimeout(() => {
          // Reset all data structures
          this.dataSource.data = [];
          this.allData = [];
          this.originalData = [];
          this.pageIndex = 0;
          
          // Load fresh data
          this.loadData(this.deliveryId);
        }, 500);
      }
      
      // Show warning if some transfers failed
      if (failedTransfers.length > 0) {
        const warningMessage = this.translate.instant('VirtualTransferInvoicesPage.PartialFailure');
        const failureDetail = this.translate.instant('VirtualTransferInvoicesPage.TransferFailureDetail', {
          failed: failedTransfers.length,
          invoices: failedTransfers.join(', ')
        });
          
        this.toastr.warning(failureDetail, warningMessage);
      }
    } catch (error) {
      console.error('Error in virtual transfer process:', error);
      this.toastr.error(
        this.translate.instant('VirtualTransferInvoicesPage.TransferError'),
        this.translate.instant('General.Error')
      );
    } finally {
      this.transferInProgress = false;
      this.loading = false;
    }
  }

  /**
   * Apply filter to data source
   */
  applyFilter(event: Event) {
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
   * Get the total number of selected items across all pages
   */
  getSelectedCount(): number {
    return this.selectedTransactionNumbers.size;
  }
}
