import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule, DatePipe } from '@angular/common';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { ServiceInvoiceService, ServiceInvoiceMainData } from '../../../../shared/services/service-invoice.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ConfirmationModalComponent } from '../../../../shared/common/confirmation-modal/confirmation-modal.component';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { ReportService } from '../../../../shared/services/report.service';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

// NgSelect import
import { NgSelectModule } from '@ng-select/ng-select';

interface ServiceInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
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
  selector: 'app-service-invoices',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    FormsModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatCheckboxModule,
    NgSelectModule,
    MatNativeDateModule,
    NgSelectModule,
    ConfirmationModalComponent
  ],
      providers: [
        DatePipe,
        // Add these providers to override the default date format
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }  // Use en-GB locale for dd/MM/yyyy format
      ],
  templateUrl: './service-invoices.component.html',
  styleUrl: './service-invoices.component.scss'
})
export class ServiceInvoicesComponent implements OnInit {


  private readonly DATE_FORMAT = 'dd/MM/yyyy';

  // Table configuration
  displayedColumns: string[] = ['InvoiceDate', 'InvoiceNumber', 'CustomerName', 'FinancialYear', 'InvoiceAmount', 'IsTransferred', 'actions'];
  dataSource = new MatTableDataSource<ServiceInvoiceData>([]);
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: ServiceInvoiceData[] = []; 
  originalData: ServiceInvoiceData[] = []; 

  customers: Customer[] = [];
  finalBalance: number = 0;

  // State
  loading: boolean = true;
  
  // User info
  deliveryId: number | null = null;
  deliveryName: string | null = null;

  startDateModel: Date | null = null;
  endDateModel: Date | null = null;
  accountNumber: string | null = null;

  // Filter
  transferStatusFilter: 'all' | 'transferred' | 'not-transferred' = 'all';

  // Add these properties for deletion
  invoiceToDelete: ServiceInvoiceData | null = null;
  deleting: boolean = false;
  
  @ViewChild('deleteConfirmationModal') deleteConfirmationModal!: ConfirmationModalComponent;

  constructor(
    private serviceInvoiceService: ServiceInvoiceService,
    private datePipe: DatePipe,
    private authService: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private reportService: ReportService,
    private dateAdapter: DateAdapter<Date>,
    private router: Router
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
        this.translate.instant('ServiceInvoicesPage.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
      this.loading = false;
    }
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // Handle language change if needed
    });
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
   * Load invoices data from service
   */
  private loadInvoices(deliveryId: number): void {
    this.loading = true;
    this.serviceInvoiceService.getInvoicesMainData(deliveryId).subscribe({
      next: (data) => {
        console.log('Service invoices data:', data);
        
        const formattedData = data.map((invoice: ServiceInvoiceMainData) => ({
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
        this.originalData = [...formattedData]; 
        this.totalItems = formattedData.length;

        this.calculateFinalBalance();
        
        // Apply initial pagination
        this.applyPagination();
        
        this.loading = false;
        
        // Success toast when data is loaded
        this.toastr.success(
          this.translate.instant('ServiceInvoicesPage.LoadSuccess', { count: formattedData.length }),
          this.translate.instant('General.Success')
        );
      },
      error: (error) => {
        this.toastr.error(
          this.translate.instant('ServiceInvoicesPage.LoadError'),
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
   * Filter by transfer status
   */
  filterByTransferStatus(status: 'all' | 'transferred' | 'not-transferred'): void {
    this.transferStatusFilter = status;
    
    // Apply filter based on transfer status
    if (status === 'all') {
      this.allData = [...this.originalData];
    } else {
      const isTransferred = status === 'transferred';
      this.allData = this.originalData.filter(item => item.IsTransferred === isTransferred);
    }
    
    this.totalItems = this.allData.length;
    this.pageIndex = 0;
    this.applyPagination();
    
    // Show toast message for user feedback
    this.toastr.info(
      this.translate.instant('ServiceInvoicesPage.FilterApplied', {
        status: this.translate.instant(
          status === 'all' 
            ? 'ServiceInvoicesPage.All' 
            : (status === 'transferred' 
                ? 'ServiceInvoicesPage.Transferred' 
                : 'ServiceInvoicesPage.NotTransferred')
        )
      }),
      this.translate.instant('General.Info')
    );
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

  onSortChange(event: Sort) {
    // Logic to handle sorting
    const data = this.dataSource.data.slice();
    if (!event.active || event.direction === '') {
      this.dataSource.data = data;
      return;
    }

    this.dataSource.data = data.sort((a, b) => {
      const isAsc = event.direction === 'asc';
      switch (event.active) {
        case 'InvoiceDate': return this.compare(a.InvoiceDate, b.InvoiceDate, isAsc);
        case 'InvoiceNumber': return this.compare(a.InvoiceNumber, b.InvoiceNumber, isAsc);
        case 'CustomerName': return this.compare(a.CustomerName, b.CustomerName, isAsc);
        case 'FinancialYear': return this.compare(a.FinancialYear, b.FinancialYear, isAsc);
        case 'InvoiceAmount': return this.compare(a.InvoiceAmount, b.InvoiceAmount, isAsc);
        default: return 0;
      }
    });
  }

  // Helper compare function
  private compare(a: number | string, b: number | string, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  /**
   * Open confirmation modal before deleting an invoice
   */
  confirmDeleteInvoice(invoice: ServiceInvoiceData): void {
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

    this.serviceInvoiceService.deleteInvoice(transactionNumber, financialYear).subscribe({
      next: (response) => {
        this.toastr.success(
          response.message || this.translate.instant('ServiceInvoicesPage.DeleteSuccess'),
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
          error.error?.message || this.translate.instant('ServiceInvoicesPage.DeleteError'),
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



      /**
   * Print transferred virtual invoice with QR code
   */
  printInvoice(transactionNumber: string, invoiceNumber: string): void {
    debugger;
    this.loading = true;
    
    this.reportService.generateTransferredServiceInvoicePDF(transactionNumber, invoiceNumber).subscribe({
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



         PrintVirtualInvoices(dataList: ServiceInvoiceData[]): void {
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