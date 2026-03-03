import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../shared/services/auth.service';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { ReportService, Customer, AccountStatementRequest, AccountStatementResponse } from '../../../shared/services/report.service';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

// NgSelect import
import { NgSelectModule } from '@ng-select/ng-select';

// Material DatePicker imports with custom format
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

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
  selector: 'app-account-statment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    NgSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule
  ],
  providers: [
    DatePipe,
    // Add these providers to override the default date format
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }  // Use en-GB locale for dd/MM/yyyy format
  ],
  templateUrl: './account-statment.component.html',
  styleUrl: './account-statment.component.scss'
})
export class AccountStatmentComponent implements OnInit {
  // Date format constant for consistency
  private readonly DATE_FORMAT = 'dd/MM/yyyy';
  
  // Table configuration
  displayedColumns: string[] = ['Date', 'DocumentType', 'DocumentNumber', 'Description', 'Dept', 'Credit', 'Balance'];
  dataSource = new MatTableDataSource<AccountStatementResponse>([]);
  
  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: AccountStatementResponse[] = [];
  
  // Form fields
  startDate: string = '';
  endDate: string = '';
  accountNumber: string | null = null;
  
  // Data
  accountStatementData: AccountStatementResponse[] = [];
  finalBalance: number = 0;
  customers: Customer[] = [];
  
  // State
  loading: boolean = false;
  searched: boolean = false;
  
  // User info
  deliveryId: number | null = null;
  deliveryName: string | null = null;

  startDateModel: Date | null = null;
  endDateModel: Date | null = null;

  constructor(
    private datePipe: DatePipe,
    private translate: TranslateService,
    private toastr: ToastrService,
    private authService: AuthService,
    private reportService: ReportService,
    private dateAdapter: DateAdapter<Date>
  ) {
    // Set the locale for the date adapter
    this.dateAdapter.setLocale('en-GB');
  }

  ngOnInit(): void {
    this.setupUserData();
    
    if (this.deliveryId!=null) {
      this.loadCustomers(this.deliveryId);
    } else {
      this.toastr.error(
        this.translate.instant('AccountStatement.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
    }
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      // No additional handling needed for language changes
    });
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
  
  private setupUserData(): void {
    const user = this.authService.currentUserValue;
    if (user) {
        this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
    }
  }
  
  loadCustomers(deliveryId: number): void {
    this.loading = true;
    this.reportService.getCustomers(deliveryId).subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }
  
  search(): void {
    if (!this.startDate || !this.endDate || !this.accountNumber) {
      this.toastr.warning(
        this.translate.instant('AccountStatement.MissingFields'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    const startDateObject = new Date(this.startDate);
    const endDateObject = new Date(this.endDate);
    
    if (isNaN(startDateObject.getTime()) || isNaN(endDateObject.getTime())) {
      this.toastr.error(
        this.translate.instant('AccountStatement.InvalidDates'),
        this.translate.instant('General.Error')
      );
      return;
    }
    
    // Format dates consistently for the API
    const formattedStartDate = this.datePipe.transform(startDateObject, 'yyyy-MM-dd') as string;
    const formattedEndDate = this.datePipe.transform(endDateObject, 'yyyy-MM-dd') as string;
    
    const request: AccountStatementRequest = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      branch: 0,
      accountNumberStart: this.accountNumber,
      accountNumberEnd: this.accountNumber,
    };
    
    this.loading = true;
    this.searched = true;
    
    this.reportService.getAccountStatementDetails(request).subscribe({
      next: (data) => {
        if (!data) {
          this.accountStatementData = [];
          this.allData = [];
          this.totalItems = 0;

          this.toastr.warning(
          this.translate.instant('AccountStatement.NoTransactionsFound'),
          this.translate.instant('General.Info')
          );
        }
        else{
        this.accountStatementData = data;
        this.allData = [...data];
        this.totalItems = data.length;
        
        // Apply initial pagination
        this.applyPagination();
        
        this.calculateFinalBalance();

        }

        this.loading = false;
        
        if (data.length > 0) {
          this.toastr.success(
            this.translate.instant('AccountStatement.DataLoaded', { count: data.length }),
            this.translate.instant('General.Success')
          );
        }
      },
      error: () => {
        // Error handling is done by the service
        this.loading = false;
      }
    });
  }
  
  private calculateFinalBalance(): void {
    this.finalBalance = this.accountStatementData.length
      ? this.accountStatementData[this.accountStatementData.length - 1].Balance ?? 0
      : 0;
  }
  
  printAccountStatement(dataList: AccountStatementResponse[]): void {
    if (!dataList || dataList.length === 0) {
      this.toastr.warning(
        this.translate.instant('AccountStatement.NothingToPrint'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    const requestPayload = {
      AccountName: dataList[0].AccountName || '',
      AccountNumber: dataList[0].AccountNumber ? dataList[0].AccountNumber.toString() : '',
      Transactions: dataList.map(data => ({
        Date: this.datePipe.transform(data.Date, this.DATE_FORMAT) || data.Date,
        DocumentType: data.DocumentType,
        DocumentNumber: data.DocumentNumber,
        Description: data.Description,
        Dept: data.Dept,
        Credit: data.Credit,
        Balance: data.Balance,
      })),
    };
    
    this.loading = true;
    
    this.reportService.AccountStatementReport(requestPayload).subscribe({
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
   * Handle page change event
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    
    // Apply pagination with the new page parameters
    this.applyPagination();
  }
  
  /**
   * Handle sort change event with proper date comparison
   */
  onSortChange(sortState: Sort): void {
    // Handle sorting logic
    if (sortState.direction) {
      this.allData.sort((a, b) => {
        const isAsc = sortState.direction === 'asc';
        switch (sortState.active) {
          case 'Date': 
            // Ensure proper date parsing for comparison
            const dateA = new Date(a.Date);
            const dateB = new Date(b.Date);
            return this.compare(dateA.getTime(), dateB.getTime(), isAsc);
          case 'DocumentType': return this.compare(a.DocumentType, b.DocumentType, isAsc);
          case 'DocumentNumber': return this.compare(a.DocumentNumber, b.DocumentNumber, isAsc);
          case 'Description': return this.compare(a.Description, b.Description, isAsc);
          case 'Dept': return this.compare(a.Dept, b.Dept, isAsc);
          case 'Credit': return this.compare(a.Credit, b.Credit, isAsc);
          case 'Balance': return this.compare(a.Balance, b.Balance, isAsc);
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

  onStartDateChange(event: any): void {
    if (event.value) {
      const date = new Date(event.value);
      this.startDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
    }
  }

  onEndDateChange(event: any): void {
    if (event.value) {
      const date = new Date(event.value);
      this.endDate = this.datePipe.transform(date, 'yyyy-MM-dd') as string;
    }
  }
}
