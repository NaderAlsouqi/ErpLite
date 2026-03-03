import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { ReportService } from '../../../shared/services/report.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

// NgSelect import
import { NgSelectModule } from '@ng-select/ng-select';


interface RefundData {
  InvoiceDate: string;
  DocumentNumber: string;
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  IsTransferred: boolean;
}


// Customer interface
export interface Customer {
  CustomerAccountNumber: string;
  CustomerAccountName: string;
}


// Define custom date formats
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};



@Component({
  selector: 'app-invoice-refund',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    FormsModule,
    SharedModule,
    MatTableModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,        
    ConfirmationModalComponent,
    NgSelectModule
  ],
     providers: [
          DatePipe,
          // Add these providers to override the default date format
          { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
          { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }  // Use en-GB locale for dd/MM/yyyy format
        ],
  templateUrl: './invoice-refund.component.html',
  styleUrl: './invoice-refund.component.scss'
})
export class InvoiceRefundComponent implements OnInit {

  private readonly DATE_FORMAT = 'dd/MM/yyyy';

  // Table configuration
  displayedColumns: string[] = [
    'InvoiceDate', 
    'DocumentNumber', 
    'InvoiceNumber',
    'CustomerName', 
    'FinancialYear', 
    'InvoiceAmount',
    'IsTransferred',
    'actions'
  ];
  dataSource = new MatTableDataSource<RefundData>([]);
  
  // Pagination
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: RefundData[] = []; // Store all data here
  originalData: RefundData[] = []; // Store original unfiltered data
  
  // State
  loading: boolean = true;
  printingDocuments = new Set<string>();
  
  // User info
  deliveryId: number | null = 0;
  deliveryName: string | null = null;

  startDateModel: Date | null = null;
  endDateModel: Date | null = null;
  accountNumber: string | null = null;

  // Filter state
  transferStatusFilter: 'all' | 'transferred' | 'not-transferred' = 'all';

  // Delete confirmation
  refundToDelete: RefundData | null = null;
  deleting: boolean = false;

  finalBalance: number = 0;
  customers: Customer[] = [];
  
  @ViewChild('deleteConfirmationModal') deleteConfirmationModal!: ConfirmationModalComponent;

  constructor(
    private invoiceService: InvoiceService,
    private reportService: ReportService,
    private authService: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private datePipe: DatePipe,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.setupUserData();
    
    if (this.deliveryId!=null) {
      this.loadRefunds(this.deliveryId);
      this.loadCustomers(this.deliveryId);
    } else {
      this.toastr.error(
        this.translate.instant('VirtualRefundsPage.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
      this.loading = false;
    }
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No need to reload columns as we're not using smart table
    });
  }
  
  ngAfterViewInit() {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

    loadCustomers(deliveryId: number): void {
    this.loading = true;
    this.reportService.getCustomers(deliveryId).subscribe({
      next: (data) => {
        this.customers = data;
        this.customers= [{ CustomerAccountNumber: '0', CustomerAccountName: this.translate.instant('VirtualInvoicePage.SelectCustomer'),},...this.customers];
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }


  
  private setupUserData(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
    }
  }
  
  /**
   * Load refunds data from service
   */
  private loadRefunds(deliveryId: number): void {
    debugger;
    this.loading = true;

    this.invoiceService.getRefunds(deliveryId).subscribe({
    
      next: (data) => {
        const formattedData = data.map((refund: any) => ({
          InvoiceDate: this.formatDate(refund.InvoiceDate),
          DocumentNumber: refund.DocumentNumber,
          InvoiceNumber: refund.InvoiceNumber,
          CustomerName: refund.CustomerName,
          
          FinancialYear: Math.floor(Number(refund.FinancialYear)).toString(),
          InvoiceAmount: parseFloat(refund.InvoiceAmount).toFixed(3),
          // Fix the transfer status mapping
          IsTransferred: refund.IsTransfered === 1 || refund.IsTransfered === true || refund.IsTransferred === 1 || refund.IsTransferred === true
        }));
        
        // Store all data
        this.allData = formattedData;
        this.originalData = [...formattedData]; // Keep a copy of original data
        this.totalItems = formattedData.length;
        
        this.calculateFinalBalance();
        // Apply initial pagination
        this.applyPagination();
        
        this.loading = false;
        
        // Success toast when data is loaded
        this.toastr.success(
          this.translate.instant('VirtualRefundsPage.LoadSuccess', { count: formattedData.length }),
          this.translate.instant('General.Success')
        );
      },
      error: (error) => {
        this.toastr.error(
          this.translate.instant('VirtualRefundsPage.LoadError'),
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
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (error) {
      this.toastr.warning(
        this.translate.instant('General.DateFormatError'),
        this.translate.instant('General.Warning')
      );
      return dateString; // Return original string if parsing fails
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
      try {
        this.allData.sort((a, b) => {
          const isAsc = sortState.direction === 'asc';
          switch (sortState.active) {
            case 'InvoiceDate': return this.compare(a.InvoiceDate, b.InvoiceDate, isAsc);
            case 'DocumentNumber': return this.compare(a.DocumentNumber, b.DocumentNumber, isAsc);
            case 'InvoiceNumber': return this.compare(a.InvoiceNumber, b.InvoiceNumber, isAsc);
            case 'CustomerName': return this.compare(a.CustomerName, b.CustomerName, isAsc);
            case 'FinancialYear': return this.compare(a.FinancialYear, b.FinancialYear, isAsc);
            case 'InvoiceAmount': return this.compare(parseFloat(a.InvoiceAmount), parseFloat(b.InvoiceAmount), isAsc);
            case 'IsTransferred': return this.compare(a.IsTransferred ? 1 : 0, b.IsTransferred ? 1 : 0, isAsc);
            default: return 0;
          }
        });
        
        // Reset to first page when sorting
        this.pageIndex = 0;
        
        // Apply pagination with the sorted data
        this.applyPagination();
      } catch (error) {
        // Show a toast for sorting error
        this.toastr.error(
          this.translate.instant('VirtualRefundsPage.SortError'),
          this.translate.instant('General.Error')
        );
      }
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
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase().trim();
    
    // Start with original data
    let filteredData = [...this.originalData];
    
    // Apply text filter if provided
    if (filterValue) {
      filteredData = filteredData.filter(item => {
        return item.DocumentNumber.toLowerCase().includes(filterValue) ||
               item.InvoiceNumber.toLowerCase().includes(filterValue) ||
               item.CustomerName.toLowerCase().includes(filterValue) ||
               item.FinancialYear.toLowerCase().includes(filterValue) ||
               item.InvoiceAmount.toString().includes(filterValue) ||
               item.InvoiceDate.toLowerCase().includes(filterValue);
      });
    }
    
    // Apply status filter if not showing all
    if (this.transferStatusFilter === 'transferred') {
      filteredData = filteredData.filter(item => item.IsTransferred);
    } else if (this.transferStatusFilter === 'not-transferred') {
      filteredData = filteredData.filter(item => !item.IsTransferred);
    }
    
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
        this.translate.instant('VirtualRefundsPage.NoMatchingResults'),
        this.translate.instant('General.Info')
      );
    }
  }
  

    /**
   * Filter data by transfer status
   */
  filterByTransferStatus(status: 'all' | 'transferred' | 'not-transferred'): void {
    this.transferStatusFilter = status;
    
    // Reset to original data first
    let filteredData = [...this.originalData];
    
    // Apply the status filter
    if (status === 'transferred') {
      filteredData = filteredData.filter(item => item.IsTransferred);
    } else if (status === 'not-transferred') {
      filteredData = filteredData.filter(item => !item.IsTransferred);
    }
    
    // Save the filtered data
    this.allData = filteredData;
    this.totalItems = filteredData.length;
    
    // Reset to first page
    this.pageIndex = 0;

    this.calculateFinalBalance();
    
    // Apply pagination
    this.applyPagination();
    
    // Show toast about filter results
    this.toastr.info(
      this.translate.instant('VirtualRefundsPage.FilterApplied', { 
        count: filteredData.length,
        status: this.translate.instant(
          status === 'all' 
            ? 'General.All' 
            : (status === 'transferred' 
                ? 'General.Transferred' 
                : 'General.NotTransferred')
        )
      }),
      this.translate.instant('General.Info')
    );
  }
  
  /**
   * View refund details
   */
  viewRefund(refund: RefundData): void {
    try {
      this.router.navigate(['/sales/refund-details'], {
        queryParams: {
          doc: refund.DocumentNumber,
          bill: refund.InvoiceNumber,
          year: refund.FinancialYear
        }
      });
    } catch (error) {
      this.toastr.error(
        this.translate.instant('VirtualRefundsPage.NavigationError'),
        this.translate.instant('General.Error')
      );
    }
  }

  /**
   * Check if a document is currently being printed
   */
  isPrinting(documentNumber: string): boolean {
    return this.printingDocuments.has(documentNumber);
  }
  
  /**
   * Generate PDF for a refund
   */
  generateRefundPDF(refund: RefundData): void {
    debugger;
    if (this.isPrinting(refund.DocumentNumber)) {
      return;
    }
    
    this.printingDocuments.add(refund.DocumentNumber);
    
    this.reportService.GenerateTransferedRefundPDF(
      refund.DocumentNumber,
      refund.InvoiceNumber,
      refund.FinancialYear
    ).subscribe({
      next: (response) => {
        // Create a URL for the blob and open/download it
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Open PDF in a new tab
        window.open(url, '_blank');
        
        this.toastr.success(
          this.translate.instant('VirtualRefundsPage.PDFGeneratedSuccess'),
          this.translate.instant('General.Success')
        );
        
        this.printingDocuments.delete(refund.DocumentNumber);
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.toastr.error(
          this.translate.instant('VirtualRefundsPage.PDFGenerationError'),
          this.translate.instant('General.Error')
        );
        this.printingDocuments.delete(refund.DocumentNumber);
      }
    });
  }

  /**
   * Open confirmation modal before deleting a refund
   */
  confirmDeleteRefund(refund: RefundData): void {
    this.refundToDelete = refund;
    this.deleteConfirmationModal.show();
  }

  /**
   * Delete the refund after confirmation
   */
  deleteRefund(): void {
    debugger;
    if (!this.refundToDelete) {
      return;
    }

    this.deleting = true;

    const documentNumber = this.refundToDelete.DocumentNumber;
    const billNumber = this.refundToDelete.InvoiceNumber;
    const financialYear = parseFloat(this.refundToDelete.FinancialYear);

    this.invoiceService.deleteRefund(documentNumber, billNumber, financialYear).subscribe({
      next: (response) => {
        this.toastr.success(
          response.message || this.translate.instant('VirtualRefundsPage.DeleteSuccess'),
          this.translate.instant('General.Success')
        );
        
        // Reload from the server to ensure data is up to date
        if (this.deliveryId !== null) {
          this.loadRefunds(this.deliveryId);
        } else {
          this.toastr.error(
            this.translate.instant('VirtualRefundsPage.UserInfoNotFound'),
            this.translate.instant('General.Error')
          );
        }
        
        // Close the modal
        this.deleteConfirmationModal.hide();
        this.deleting = false;
        this.refundToDelete = null;
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translate.instant('VirtualRefundsPage.DeleteError'),
          this.translate.instant('General.Error')
        );
        this.deleting = false;
      }
    });
  }


    startDate: string = '';
    endDate: string = '';
  
    onStartDateChange(event: any): void {
      debugger;
      // Start with original data
      let filteredDate = [...this.originalData];
  
      if (event.value) {
          const date = new Date(event.value);
          this.startDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
  
    
      if (this.startDate!='' && this.endDate!='')
      {
  
      const startDateObject = new Date(this.startDate);
      const endDateObject = new Date(this.endDate);
  
      if (isNaN(startDateObject.getTime()) || isNaN(endDateObject.getTime())) {
        this.toastr.error(
          this.translate.instant('AccountStatement.InvalidDates'),
          this.translate.instant('General.Error')
        );
        return;
      }
  
       filteredDate= filteredDate?.filter(item =>
      new Date(item.InvoiceDate).getTime() >= startDateObject.getTime() && new Date(item.InvoiceDate).getTime() <= endDateObject.getTime());
      }
  
  
  
  
      // Save the filtered data
      this.allData = filteredDate;
      this.totalItems = filteredDate.length;
  
      this.calculateFinalBalance();
      
      // Reset page index to first page when filtering
      this.pageIndex = 0;
      
  
      
      // Apply pagination
      this.applyPagination();
      
      // Notify when no records match the search
      if (filteredDate.length === 0) {
        this.toastr.info(
          this.translate.instant('VirtualInvoicePage.NoMatchingResults'),
          this.translate.instant('General.Info')
        );
      }
  
      }
    }
  
    onEndDateChange(event: any): void {
  
          debugger;
      // Start with original data
      let filteredDate = [...this.originalData];
  
      if (event.value) {
          const date = new Date(event.value);
          this.endDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
  
      if (this.startDate!='' && this.endDate!='')
      {
  
      const startDateObject = new Date(this.startDate);
      const endDateObject = new Date(this.endDate);
      
      if (isNaN(startDateObject.getTime()) || isNaN(endDateObject.getTime())) {
        this.toastr.error(
          this.translate.instant('AccountStatement.InvalidDates'),
          this.translate.instant('General.Error')
        );
        return;
      }
  
       filteredDate= filteredDate?.filter(item =>
      new Date(item.InvoiceDate).getTime() >= startDateObject.getTime() && new Date(item.InvoiceDate).getTime() <= endDateObject.getTime());
      }
  
  
      // Save the filtered data
      this.allData = filteredDate;
      this.totalItems = filteredDate.length;
  
      this.calculateFinalBalance();
      
      // Reset page index to first page when filtering
      this.pageIndex = 0;
      
      
      // Apply pagination
      this.applyPagination();
      
      // Notify when no records match the search
      if (filteredDate.length === 0) {
        this.toastr.info(
          this.translate.instant('VirtualInvoicePage.NoMatchingResults'),
          this.translate.instant('General.Info')
        );
      }
  
      }
  
  
    }
  
  
  private calculateFinalBalance(): void {
          this.finalBalance = 0;
          this.allData.forEach((item) => {
          if(item.InvoiceAmount){ this.finalBalance += Number(item.InvoiceAmount)
  }
  });
  }
  
    selectedTeam = '';
    selectedCustomer='0';
    onSelected(customer: Customer): void {
      debugger;
    if (customer) {
          if(customer.CustomerAccountNumber!='0')
            {
              this.selectedCustomer = customer.CustomerAccountNumber;
              this.selectedTeam = customer.CustomerAccountName;
              this.applyCutomerFilter();
            }
            else
            {
              this.selectedCustomer = '0';
              this.selectedTeam = '';
            }          
        }
    
    }
  
  
      applyCutomerFilter(): void {
      
      debugger;
      // Start with original data
      let filteredData = [...this.originalData];
      
      // Apply text filter if provided
  
        filteredData = filteredData.filter(item => {
          return item.CustomerName.toLowerCase().includes(this.selectedTeam);
        });
    
  
      
      // Apply status filter if not showing all
      if (this.transferStatusFilter === 'transferred') {
        filteredData = filteredData.filter(item => item.IsTransferred);
      } else if (this.transferStatusFilter === 'not-transferred') {
        filteredData = filteredData.filter(item => !item.IsTransferred);
      }
  
  
  
  
      if (this.startDate!='' && this.endDate!='')
      {
  
      const startDateObject = new Date(this.startDate);
      const endDateObject = new Date(this.endDate);
  
      if (isNaN(startDateObject.getTime()) || isNaN(endDateObject.getTime())) {
        this.toastr.error(
          this.translate.instant('AccountStatement.InvalidDates'),
          this.translate.instant('General.Error')
        );
        return;
      }
  
       filteredData= filteredData?.filter(item =>
      new Date(item.InvoiceDate).getTime() >= startDateObject.getTime() && new Date(item.InvoiceDate).getTime() <= endDateObject.getTime());
      }
  
  
      
      // Update total count for pagination
      this.totalItems = filteredData.length;
      
      // Reset page index to first page when filtering
      this.pageIndex = 0;
      
      // Store the filtered data
      this.allData = filteredData;
      
      this.calculateFinalBalance();
      // Apply pagination
      this.applyPagination();
      
      // Notify when no records match the search
      if (filteredData.length === 0) {
        this.toastr.info(
          this.translate.instant('VirtualInvoicePage.NoMatchingResults'),
          this.translate.instant('General.Info')
        );
      }
    }


          /**
           * Custom search function for NgSelect to search in both name and account number
           */
          customSearchFn(term: string, item: Customer): boolean {
            if (!term) {
              return true;
            }
            
            term = term.toLowerCase();
            
            // Search in customer name
            const nameMatch = item.CustomerAccountName.toLowerCase().includes(term);
            
            // Search in account number (convert to string to ensure includes works)
            const accountMatch = item.CustomerAccountNumber.toString().toLowerCase().includes(term);
            
            // Return true if either name or account number matches
            return nameMatch || accountMatch;
          }




          
 PrintRefundsInvoices(dataList: RefundData[]): void {
  debugger;
        if (!dataList || dataList.length === 0) {
          this.toastr.warning(
            this.translate.instant('AccountStatement.NothingToPrint'),
            this.translate.instant('General.Warning')
          );
          return;
        }
        
        const requestPayload = {
          AccountName: this.selectedTeam|| '',
          StartDate: this.startDate || '',
          EndDate: this.endDate || '',
          Balance: this.finalBalance ||0,
          Transactions: dataList.map(data => ({
            InvoiceDate: this.datePipe.transform(data.InvoiceDate, this.DATE_FORMAT) || data.InvoiceDate,
            TransactionNumber : data.DocumentNumber,
            InvoiceNumber: data.InvoiceNumber,
            CustomerName: data.CustomerName,
            FinancialYear: data.FinancialYear,
            InvoiceAmount: data.InvoiceAmount,
            IsTransferred: data.IsTransferred
          })),
        };
        
        this.loading = true;
        
        this.reportService.RefundsReport(requestPayload).subscribe({
          next: (response: Blob) => {
            const url = window.URL.createObjectURL(response);
            window.open(url);
            this.loading = false;
          },
          error: () => {
            // Error handling is done by the service
            this.loading = false;
          }
        });
      }



}