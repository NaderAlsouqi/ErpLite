import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../shared/services/auth.service';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
// NgSelect import
import { NgSelectModule } from '@ng-select/ng-select';
import { ReportService } from '../../../shared/services/report.service';



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


interface InvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  IsTransferred: boolean; // Add this line
}

@Component({
  selector: 'app-sales-invoice',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    FormsModule,
    SharedModule,
    MatTableModule,
    MatNativeDateModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatDatepickerModule,
    ConfirmationModalComponent,
    NgSelectModule
  ],
      providers: [
        DatePipe,
        // Add these providers to override the default date format
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }  // Use en-GB locale for dd/MM/yyyy format
      ],
  templateUrl: './sales-invoice.component.html',
  styleUrl: './sales-invoice.component.scss'
})
export class SalesInvoiceComponent implements OnInit {

  
private readonly DATE_FORMAT = 'dd/MM/yyyy';

  // Table configuration
  displayedColumns: string[] = [
    'InvoiceDate', 
    'InvoiceNumber', 
    'CustomerName', 
    'FinancialYear', 
    'InvoiceAmount',
    'IsTransferred', // Add this line
    'actions'
  ];
  dataSource = new MatTableDataSource<InvoiceData>([]);
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: InvoiceData[] = []; // Store all data here
  originalData: InvoiceData[] = []; // Store original unfiltered data
  
  // State
  loading: boolean = true;
  
  // User info
  deliveryId: number | null = 0;
  deliveryName: string | null = null;


  startDateModel: Date | null = null;
  endDateModel: Date | null = null;
  accountNumber: string | null = null;

  customers: Customer[] = [];
  finalBalance: number = 0;

  // Add this property to your component class
  transferStatusFilter: 'all' | 'transferred' | 'not-transferred' = 'all';

  invoiceToDelete: InvoiceData | null = null;
  deleting: boolean = false;
  Quotation: boolean = false;
  
  @ViewChild('deleteConfirmationModal') deleteConfirmationModal!: ConfirmationModalComponent;

  constructor(
    private datePipe: DatePipe,
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private reportService: ReportService,
    private router: Router,
    private dateAdapter: DateAdapter<Date>
  ) {

    // Set the locale for the date adapter
    this.dateAdapter.setLocale('en-GB');

  }
  ngOnInit(): void {
    this.setupUserData();
    
    if (this.deliveryId!=null) {
        this.loadInvoices(this.deliveryId);
        this.loadCustomers(this.deliveryId);
    } else {
      this.toastr.error(
        this.translate.instant('InvoicesPage.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
      this.loading = false;
    }
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No need to reload columns as we're not using smart table
    });
  }


    loadCustomers(deliveryId: number): void {
      debugger;
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


  
  SetQuotation(pQuotation: boolean)
  {
    debugger;
    this.Quotation = pQuotation;    
    localStorage.setItem('Quotation', this.Quotation.toString());
  }

  
  private setupUserData(): void {
    debugger
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId =  user.DeliveryID;
      this.deliveryName = user.DeliveryName;
    }
  }
  
  /**
   * Load invoices data from service  `
   */
  private loadInvoices(deliveryId: number): void {
    debugger;
    this.loading = true;
    
    this.invoiceService.getInvoices(deliveryId).subscribe({
      next: (data) => {
        const formattedData = data.map((invoice: any) => ({
          InvoiceDate: this.formatDate(invoice.InvoiceDate),
          InvoiceNumber: invoice.InvoiceNumber,
          TransactionNumber: invoice.TransactionNumber,
          CustomerName: invoice.CustomerName,
          FinancialYear: Math.floor(Number(invoice.FinancialYear)).toString(),
          InvoiceAmount: parseFloat(invoice.InvoiceAmount).toFixed(3),
          IsTransferred: invoice.IsTransferred
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
          this.translate.instant('InvoicesPage.LoadSuccess', { count: formattedData.length }),
          this.translate.instant('General.Success')
        );
      },
      error: (error) => {
        // Replace console.error with toastr error message
        this.toastr.error(
          this.translate.instant('InvoicesPage.LoadError'),
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
      // Show a toast for date formatting error instead of silent failure
      this.toastr.warning(
        this.translate.instant('General.DateFormatError'),
        this.translate.instant('General.Warning')
      );
      return dateString; // Return original string if parsing fails
    }
  }


      /**
   * Print transferred virtual invoice with QR code
   */
  printInvoice(transactionNumber: string, invoiceNumber: string): void {
    debugger;
    this.loading = true;
    
    this.reportService.printTransferredInvoice(transactionNumber, invoiceNumber).subscribe({
      next: (response: Blob) => {
        const blobUrl = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
        window.open(blobUrl);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error printing virtual invoice:', error);
        this.toastr.error(
          this.translate.instant('VirtualTransferredInvoicesPage.PrintError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
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
            case 'InvoiceNumber': 
              return this.compare(
                parseInt(a.InvoiceNumber, 10) || 0, 
                parseInt(b.InvoiceNumber, 10) || 0, 
                isAsc
              );
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
          this.translate.instant('InvoicesPage.SortError'),
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
        return item.InvoiceNumber.toLowerCase().includes(filterValue) ||
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
        this.translate.instant('InvoicesPage.NoMatchingResults'),
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

    
    // Save the filtered data
    this.allData = filteredData;
    this.totalItems = filteredData.length;

    this.calculateFinalBalance();
    
    // Reset to first page
    this.pageIndex = 0;
    
    // Apply pagination
    this.applyPagination();
    
    // Show toast about filter results
    this.toastr.info(
      this.translate.instant('VirtualInvoicePage.FilterApplied', { 
        count: filteredData.length,
        status: this.translate.instant(
          status === 'all' 
            ? 'VirtualInvoicePage.All' 
            : (status === 'transferred' 
                ? 'VirtualInvoicePage.Transferred' 
                : 'VirtualInvoicePage.NotTransferred')
        )
      }),
      this.translate.instant('General.Info')
    );
  }
  
  
  /**
   * View invoice details
   */
  viewInvoice(TransactionNumber: string): void {
    try {
      this.router.navigate(['/sales/invoice-details', TransactionNumber]);
    } catch (error) {
      this.toastr.error(
        this.translate.instant('InvoicesPage.NavigationError'),
        this.translate.instant('General.Error')
      );
    }
  }

  /**
   * Open confirmation modal before deleting an invoice
   */
  confirmDeleteInvoice(invoice: InvoiceData): void {
    this.invoiceToDelete = invoice;
    this.deleteConfirmationModal.show();
  }

  /**
   * Delete the invoice after confirmation
   */
  deleteInvoice(): void {
    if (!this.invoiceToDelete) {
      return;
    }

    this.deleting = true;

    const transactionNumber = parseInt(this.invoiceToDelete.TransactionNumber, 10);
    const financialYear = parseInt(this.invoiceToDelete.FinancialYear, 10);

    this.invoiceService.deleteInvoice(transactionNumber, financialYear).subscribe({
      next: (response) => {
        this.toastr.success(
          response.message || this.translate.instant('InvoicesPage.DeleteSuccess'),
          this.translate.instant('General.Success')
        );
        
        // Instead of manually filtering the data, reload from the server
        if (this.deliveryId !== null) {
          this.loadInvoices(this.deliveryId);
        } else {
          this.toastr.error(
            this.translate.instant('ServiceInvoicesPage.UserInfoNotFound'),
            this.translate.instant('General.Error')
          );
        }
        
        // Close the modal
        this.deleteConfirmationModal.hide();
        this.deleting = false;
        this.invoiceToDelete = null;
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translate.instant('InvoicesPage.DeleteError'),
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



 PrintInvoices(dataList: InvoiceData[]): void {
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
            InvoiceNumber: data.InvoiceNumber,
            CustomerName: data.CustomerName,
            FinancialYear: data.FinancialYear,
            InvoiceAmount: data.InvoiceAmount,
            IsTransferred: data.IsTransferred
          })),
        };
        
        this.loading = true;
        
        this.reportService.VirtualInvoicesReport(requestPayload).subscribe({
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
