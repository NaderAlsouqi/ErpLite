import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { FotaraService, TransferInvoiceData, FotaraApiResponse } from "../../../shared/services/fotara.service";
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

interface InvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  selected?: boolean;
}

@Component({
  selector: 'app-transfer-invoices',
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
  templateUrl: './transfer-invoices.component.html',
  styleUrl: './transfer-invoices.component.scss'
})
export class TransferInvoicesComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['select', 'InvoiceDate', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'actions'];
  dataSource = new MatTableDataSource<InvoiceData>([]);
  selection = new SelectionModel<InvoiceData>(true, []);
  
  // Keep track of selected transaction numbers (changed from invoiceNumbers)
  selectedTransactionNumbers = new Set<string>();
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: InvoiceData[] = [];
  allData: InvoiceData[] = []; // Store all data here
  
  // Delivery info
  deliveryId: number=0;
  deliveryName: string = '';
  deliveryLimit: boolean = false;  
  
  // State
  loading: boolean = true;
  transferInProgress: boolean = false;
  
  constructor(
    private invoiceService: InvoiceService,
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
    //const storedDeliveryId = localStorage.getItem('DeliveryId');
   // const storedDeliveryName = localStorage.getItem('DeliveryName');

    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user?.DeliveryID;
      this.deliveryName =user?.DeliveryName;
      if(user.Roles.includes('CashLinkLimit') || user.Roles.includes('VirtualCashLinkLimit')){this.deliveryLimit=true;};
    }
    
   // if (storedDeliveryId) {
   //   this.deliveryId = parseInt(storedDeliveryId, 10);
   // }
    
   // if (storedDeliveryName) {
   //   this.deliveryName = storedDeliveryName;
    //}



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
    
    this.invoiceService.GetUntransferredInvoicesMainData(deliveryId).subscribe({
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
        console.error('Error loading invoices:', error);
        this.toastr.error(
          this.translate.instant('TransferInvoicesPage.LoadError'),
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
  toggleRowSelection(row: InvoiceData): void {
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
    // Access the Fotara service to get more details
    this.fotaraService.getTransferInvoice(transactionNumber, financialYear).subscribe({
      next: (data) => {
        console.log('Invoice data:', data);
        // Navigate to details view with the transaction number
        this.router.navigate(['/sales/invoice-details', transactionNumber]);
      },
      error: (error) => {
        console.error('Error fetching invoice details:', error);
        this.toastr.error(
          this.translate.instant('TransferInvoicesPage.InvoiceDetailsError'),
          this.translate.instant('General.Error')
        );
      }
    });
  }
  
  /**
   * Transfer selected invoices - now using TransactionNumber
   */
  async transferSelectedInvoices(): Promise<void> {
    if (this.selectedTransactionNumbers.size === 0) {
      this.toastr.warning(
        this.translate.instant('TransferInvoicesPage.NoInvoicesSelected'),
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
          console.log(`Fetching details for transaction ${transactionNumber}`);
          // Find the financial year for this transaction number
          const invoiceRow = this.originalData.find(row => row.TransactionNumber === transactionNumber);
          if (!invoiceRow) {
            console.error(`Invoice data not found for transaction ${transactionNumber}`);
            failedTransfers.push(transactionNumber);
            continue;
          }

          const financialYear = invoiceRow.FinancialYear;
          const invoiceData = await firstValueFrom(
            this.fotaraService.getTransferInvoice(transactionNumber, financialYear)
          );

       debugger;
        // Step 2: Send to Fotara API
          console.log(`Sending transaction ${transactionNumber} to Fotara API`);
          const fotaraResponse = await firstValueFrom(this.fotaraService.sendToFotaraApi(invoiceData));
          
          // Step 3: Check response status and update QR code in database if successful
          if (fotaraResponse.status === 'success' && fotaraResponse.qr_code) {
            console.log(`Updating QR code for transaction ${transactionNumber}`);
            // Use serial_number as TransNumber
            const transNumber = invoiceData.serial_number.toString();
            try {
              const qrUpdateResponse = await firstValueFrom(
                this.fotaraService.updateQrCode(transNumber, fotaraResponse.qr_code)
              );
              
              if (qrUpdateResponse && qrUpdateResponse.success) {
                console.log(`QR code update successful for transaction ${transactionNumber}`);
                successfulTransfers.push(transactionNumber);
              } else {
                console.error(`QR code update failed for transaction ${transactionNumber}:`, qrUpdateResponse);
                // If QR code update fails, still consider it a partial success but note the issue
                successfulTransfers.push(transactionNumber);
                this.toastr.warning(
                  this.translate.instant('TransferInvoicesPage.QrUpdateWarning', { transactionNumber }),
                  this.translate.instant('General.Warning')
                );
              }
            } catch (qrUpdateError) {
              console.error(`Error updating QR code for transaction ${transactionNumber}:`, qrUpdateError);
              // If QR code update fails, still consider it a partial success but note the issue
              successfulTransfers.push(transactionNumber);
              this.toastr.warning(
                this.translate.instant('TransferInvoicesPage.QrUpdateWarning', { transactionNumber }),
                this.translate.instant('General.Warning')
              );
            }
          } else {
            console.error(`No QR code or unsuccessful response for transaction ${transactionNumber}:`, fotaraResponse);
            failedTransfers.push(transactionNumber);
          }
        } catch (error) {
          console.error(`Error processing transaction ${transactionNumber}:`, error);
          failedTransfers.push(transactionNumber);
        }
      }
      
      // Show success message with counts
      if (successfulTransfers.length > 0) {
        const successMessage = this.translate.instant('TransferInvoicesPage.SuccessMessage');
        const detailMessage = this.translate.instant('TransferInvoicesPage.TransferSuccessDetail', {
          success: successfulTransfers.length,
          total: this.selectedTransactionNumbers.size
        });
          
        this.toastr.success(detailMessage, successMessage);
      }
      
      // Show warning if some transfers failed
      if (failedTransfers.length > 0) {
        const warningMessage = this.translate.instant('TransferInvoicesPage.PartialFailure');
        const failureDetail = this.translate.instant('TransferInvoicesPage.TransferFailureDetail', {
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
      console.error('Error in transfer process:', error);
      this.toastr.error(
        this.translate.instant('TransferInvoicesPage.TransferError'),
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
