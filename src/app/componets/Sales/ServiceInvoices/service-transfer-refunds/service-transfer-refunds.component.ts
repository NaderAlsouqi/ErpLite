import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServiceInvoiceService as InvoiceService } from '../../../../shared/services/service-invoice.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { FotaraService, TransferRefundInvoiceData, FotaraApiResponse } from "../../../../shared/services/fotara.service";
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../shared/services/auth.service';
// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

interface RefundData {
  InvoiceDate: string;
  DocumentNumber: string;
  TransactionNumber: string;
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  IsTransferred: boolean;
  RIsTransfered?: boolean;
  RQRCode?: string;
}

@Component({
  selector: 'app-service-service-transfer-refunds',
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
  templateUrl: './service-transfer-refunds.component.html',
  styleUrl: './service-transfer-refunds.component.scss'
})
export class ServiceTransferRefundsComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = ['select', 'RefundDate', 'RefundNumber', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'RefundAmount', 'RIsTransfered', 'actions'];
  dataSource = new MatTableDataSource<RefundData>([]);
  selection = new SelectionModel<RefundData>(true, []);

  // Keep track of selected document numbers and related data
  selectedDocNumbers = new Set<string>();
  selectedRefundData = new Map<string, RefundData>();

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  originalData: RefundData[] = []; // Store original data here
  allData: RefundData[] = []; // Store all data here

  // Delivery info
  deliveryId: number = 0;
  deliveryName: string = '';
  deliveryLimit: boolean = false;

  // State
  loading: boolean = true;
  transferInProgress: boolean = false;

  constructor(
    private invoiceService: InvoiceService,
    private fotaraService: FotaraService,
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
    // Get delivery info from localStorage
    //const storedDeliveryId = localStorage.getItem('DeliveryId');
    //const storedDeliveryName = localStorage.getItem('DeliveryName');

    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
      if (user.Roles.includes('CashLinkLimit') || user.Roles.includes('VirtualCashLinkLimit')) { this.deliveryLimit = true; };
    }


    //if (storedDeliveryId) {
    //  this.deliveryId = parseInt(storedDeliveryId, 10);
    // }

    //if (storedDeliveryName) {
    //  this.deliveryName = storedDeliveryName;
    // }

    // Load data
    this.loadData(this.deliveryId);

    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No need to reload columns as we're not using smart table
    });
  }

  /**
   * Load refunds data from service
   */
  private loadData(deliveryId: number): void {
    this.loading = true;
    this.selectedDocNumbers.clear();
    this.selectedRefundData.clear();

    this.invoiceService.getRefunds(deliveryId).subscribe({
      next: (data) => {
        const formattedData = data
          .filter((refund: any) => !(refund.rIsTransfered ?? refund.RIsTransfered))
          .map((refund: any) => ({
            InvoiceDate: this.formatDate(refund.invoiceDate ?? refund.InvoiceDate),
            DocumentNumber: refund.documentNumber ?? refund.DocumentNumber ?? '',
            TransactionNumber: refund.transactionNumber ?? refund.TransactionNumber ?? refund.documentNumber ?? refund.DocumentNumber ?? '',
            InvoiceNumber: refund.invoiceNumber ?? refund.InvoiceNumber ?? '',
            CustomerName: refund.customerName ?? refund.CustomerName ?? '',
            FinancialYear: Math.floor(Number(refund.financialYear ?? refund.FinancialYear)).toString(),
            InvoiceAmount: parseFloat(refund.invoiceAmount ?? refund.InvoiceAmount ?? 0).toFixed(3),
            IsTransferred: !!(refund.rIsTransfered ?? refund.RIsTransfered),
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
      error: (error: any) => {
        console.error('Error loading refunds:', error);
        this.toastr.error(
          this.translate.instant('TransferRefundsPage.LoadError'),
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
      if (this.selectedDocNumbers.has(item.TransactionNumber)) {
        this.selection.select(item);
      }
    });
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
          case 'RefundDate': return this.compare(a.InvoiceDate, b.InvoiceDate, isAsc);
          case 'RefundNumber':
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
          case 'RefundAmount': return this.compare(parseFloat(a.InvoiceAmount), parseFloat(b.InvoiceAmount), isAsc);
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
      currentPageData.every(row => this.selectedDocNumbers.has(row.TransactionNumber));
  }

  /**
   * Toggle selection for all rows on the current page
   */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      // Deselect all rows on the current page
      this.dataSource.data.forEach(row => {
        this.selectedDocNumbers.delete(row.TransactionNumber);
        this.selectedRefundData.delete(row.TransactionNumber);
      });
    } else {
      // Select all rows on the current page — skip already-transferred
      this.dataSource.data.forEach(row => {
        if (!row.RIsTransfered) {
          this.selectedDocNumbers.add(row.TransactionNumber);
          this.selectedRefundData.set(row.TransactionNumber, row);
        }
      });
    }

    // Update the selection model to match our tracking
    this.applyPagination();
  }

  /**
   * Toggle selection for a single row
   */
  toggleRowSelection(row: RefundData): void {
    // Handle our tracking set
    if (this.selectedDocNumbers.has(row.TransactionNumber)) {
      this.selectedDocNumbers.delete(row.TransactionNumber);
      this.selectedRefundData.delete(row.TransactionNumber);
    } else {
      this.selectedDocNumbers.add(row.TransactionNumber);
      this.selectedRefundData.set(row.TransactionNumber, row);
    }

    // Toggle in the selection model too (for UI display)
    this.selection.toggle(row);
  }

  /**
   * View refund details
   */
  viewRefund(docNumber: string, invoiceNumber: string, year: string): void {
    try {
      this.router.navigate(['/sales/service/refund-details'], {
        queryParams: {
          doc: docNumber,
          bill: invoiceNumber,
          year: year
        }
      });
    } catch (error) {
      console.error('Error in viewRefund:', error);
      this.toastr.error(
        this.translate.instant('TransferRefundsPage.NavigationError'),
        this.translate.instant('General.Error')
      );
    }
  }

  /**
   * Transfer selected refunds
   */
  async transferSelectedRefunds(): Promise<void> {
    if (this.selectedDocNumbers.size === 0) {
      this.toastr.warning(
        this.translate.instant('TransferRefundsPage.NoRefundsSelected'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    // Set loading state to prevent multiple transfers
    this.transferInProgress = true;
    this.loading = true;

    // Track successful and failed transfers
    const successfulTransfers: string[] = [];
    const failedTransfers: string[] = [];

    try {

      // Process each selected refund serially
      for (const docNumber of this.selectedDocNumbers) {
        try {
          // Guard: skip if docNumber is empty
          if (!docNumber || docNumber.trim() === '') {
            console.warn(`Skipping refund with empty document number`);
            failedTransfers.push('(empty doc)');
            continue;
          }

          // Get the refund data from our tracking map
          const refundData = this.selectedRefundData.get(docNumber);
          if (!refundData) {
            console.error(`No refund data found for document number ${docNumber}`);
            failedTransfers.push(docNumber);
            continue;
          }

          // Step 1: Get refund details from ServiceInvoice controller
          console.log(`Fetching details for refund ${docNumber}`);
          const invoiceData = await firstValueFrom(
            this.invoiceService.getServiceTransferRefundInvoiceData(
              refundData.DocumentNumber || refundData.TransactionNumber,
              refundData.InvoiceNumber,
              parseFloat(refundData.FinancialYear)
            )
          );

          // Step 2: Send to Fotara API
          console.log(`Sending refund ${docNumber} to Fotara API`);
          const fotaraResponse = await firstValueFrom(
            this.fotaraService.sendRefundToFotaraApi(invoiceData)
          );
          console.log(`TEST fotaraResponse for ${docNumber}:`, JSON.stringify(fotaraResponse));

          // Step 3: Check response status and update QR code in database if successful
          if (fotaraResponse.status === 'success' && fotaraResponse.qr_code) {
            console.log(`Updating QR code for refund ${docNumber}`);
            await firstValueFrom(
              this.invoiceService.updateServiceRefundQRCode({
                RefundNumber: parseInt(refundData.TransactionNumber, 10),
                Bill: refundData.InvoiceNumber,
                MyYear: parseFloat(refundData.FinancialYear),
                QRCode: fotaraResponse.qr_code
              })
            );

            successfulTransfers.push(docNumber);
            console.log(`TEST: pushed to successfulTransfers, total now: ${successfulTransfers.length}`);
          } else {
            console.error(`No QR code or unsuccessful response for refund ${docNumber}:`, fotaraResponse);
            failedTransfers.push(docNumber);
          }
        } catch (error) {
          console.error(`Error processing refund ${docNumber}:`, error);
          failedTransfers.push(docNumber);
        }
      }

      // Show success message with counts
      if (successfulTransfers.length > 0) {
        const successMessage = this.translate.instant('TransferRefundsPage.SuccessMessage');
        const detailMessage = this.translate.instant('TransferRefundsPage.TransferSuccessDetail', {
          success: successfulTransfers.length,
          total: this.selectedDocNumbers.size
        });

        this.toastr.success(detailMessage, successMessage);
        console.log('TEST: Transfer successful - successfulTransfers:', successfulTransfers);
      }

      // Show warning if some transfers failed
      if (failedTransfers.length > 0) {
        const warningMessage = this.translate.instant('TransferRefundsPage.PartialFailure');
        const failureDetail = this.translate.instant('TransferRefundsPage.TransferFailureDetail', {
          failed: failedTransfers.length,
          refunds: failedTransfers.join(', ')
        });

        this.toastr.warning(failureDetail, warningMessage);
      }

    } catch (error) {
      console.error('Error in transfer process:', error);
      this.toastr.error(
        this.translate.instant('TransferRefundsPage.TransferError'),
        this.translate.instant('General.Error')
      );
    } finally {
      this.transferInProgress = false;
      this.loadData(this.deliveryId);
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
  }

  /**
   * Get the total number of selected items across all pages
   */
  getSelectedCount(): number {
    return this.selectedDocNumbers.size;
  }
}


