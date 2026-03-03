import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { AuthService } from '../../../shared/services/auth.service';
import { MatTabsModule, MatTab, MatTabGroup } from '@angular/material/tabs';

import { 
  ReceiptVouchersService, 
  Customer, 
  Invoice, 
  CashReceiptDto, 
  CheqReceiptDto, 
  ChequeDto ,
  ChequeResponse,
  Bank,
} from '../../../shared/services/receipt-vouchers.service';

// Import Flatpickr
import { FlatpickrModule } from 'angularx-flatpickr';
import { FlatpickrDefaults } from 'angularx-flatpickr';
import flatpickr from 'flatpickr';

import { SumPipe } from '../../../shared/pipes/sum.pipe';

// NgbModal imports
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';

// Material table imports (still needed for the cheques table)
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort} from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

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




// Material DatePicker imports with custom format
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { ReportService, AccountStatementRequest, AccountStatementResponse } from '../../../shared/services/report.service'

@Component({
  selector: 'app-receipt-vouchers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgSelectModule,
    FlatpickrModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    SumPipe,
    NgbTooltipModule,
    NgbPopoverModule,
    MatDatepickerModule,
    MatInputModule,
    MatPaginatorModule,
    MatNativeDateModule,
    MatTab,
    MatTabGroup
],
  providers: [
    DatePipe,
        // Add these providers to override the default date format
      { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
      { provide: MAT_DATE_LOCALE, useValue: 'en-GB' } , // Use en-GB locale for dd/MM/yyyy format
    NgbModalConfig, 
    NgbModal,
    FlatpickrDefaults
  ],




  

  templateUrl: './receipt-vouchers.component.html',
  styleUrl: './receipt-vouchers.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ReceiptVouchersComponent implements OnInit {
  // Add this property with the other state variables
  submitted: boolean = false;
  
  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;
  @ViewChild('deleteAmountConfirmModal') deleteAmountConfirmModal!: TemplateRef<any>;


  
  // Table configuration
 // displayedColumns: string[] = ['ChequeNumber', 'ChequeDate', 'BankNumber', 'ChequeAmount', 'Actions'];

        // Table configuration
        displayedColumns: string[] = ['Date','DocumentNumber', 'Description', 'Actions'];
        dataSourceReceiptVouchers = new MatTableDataSource<AccountStatementResponse>([]);
    
        displayedChequeColumns: string[] = ['ChequeNumber', 'ChequeDate', 'BankNumber', 'BankName', 'ChequeAmount'];
        dataSourceCheqs = new MatTableDataSource<ChequeDto>([]);
  
  // Flatpickr configuration
  dateOptions = {
    dateFormat: 'Y-m-d',
    allowInput: true,
    altInput: true,
    altFormat: 'd/m/Y',
    locale: {
      firstDayOfWeek: 0, // Start week on Sunday
    }
  };
  
  // Receipt form data
  receiptForm = {
    date: this.formatDate(new Date()),
    customerAccountNumber: null as number | null,
    customerAccountName: '',
    invoiceNumber: null as string | null,
    transactionNumber: null as string | null,
    financialYear: new Date().getFullYear(),
    amount: 0,
    cashAmount: 0,
    TotalChequesAmount: 0,
    description: '',
    deliveryManNumber: null as number | null,
    username: '',
    creditAccountNumber: null as number | null,
    debtAccountNumber: null as number | null,
    ChequedebtAccountNumber: null as number | null,
  };

  // Search and filtering
  customerSearchTerm: string = '';
  bankSearchTerm: string = '';
  invoiceSearchTerm: string = '';
  customers: Customer[] = [];
  accounts: Customer[] = [];
  customersSearch: Customer[] = [];
  banks: Bank[] = [];
  banksSearch: Bank[] = [];
  filteredCustomers: Customer[] = [];
  selectedCustomer: Customer | null = null;
  filterBank: Bank[] = [];
  selectedBank: any | null = null;
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  selectedInvoice: Invoice | null = null;
  
  // Cheques
  cheques: ChequeResponse[] = [];
  newCheque: ChequeResponse = {
    ChequeNumber: '',
    ChequeDate: this.formatDate(new Date()),
    BankNumber: 0,
    BankName: '',
    ChequeAmount: 0,
  };

    // Form fields
  startDate: string = '';
  endDate: string = '';
  accountNumber: string | null = null;
  bankNumber: string | null = null;
  receiptDescription: string = '';


  
  startDateModel: Date | null = null;
  endDateModel: Date | null = null;


    // Pagination
    pageSize: number = 10;
    pageSizeOptions: number[] = [5, 10, 25, 50];
    pageIndex: number = 0;
    totalItems: number = 0;
    allData: AccountStatementResponse[] = [];
    // Data
    accountStatementData: AccountStatementResponse[] = [];

    cashReceiptVouchers: CashReceiptDto | null = null;
  
  // State
  loading: boolean = false;
  searched: boolean = false;
  modalRef!: NgbModalRef;
   
  // User info
  deliveryId: number | null = null;
  deliveryName: string | null = null;
  SystemType:  number =1;
  
  currentLang: string = 'ar'; // Default language
  finalBalance: number = 0;



  constructor(
    private datePipe: DatePipe,
    private translate: TranslateService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private reportService: ReportService,
    private modalConfig: NgbModalConfig,
    private authService: AuthService,
    private receiptService: ReceiptVouchersService,
    private flatpickrDefaults: FlatpickrDefaults
  ) {
    // Configure NgbModal defaults
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
    
    // Set up flatpickr defaults based on language
    this.setFlatpickrLanguage();
  }

  ngOnInit(): void {
    debugger;
    this.setupUserData();
    if (this.deliveryId!=null) {
      this.loadCustomers(this.deliveryId);
      this.loadBanks();
      this.loadAccounts();
      this.loadInvoices();
    } else {
      this.toastr.error(
        this.translate.instant('General.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
    }
    
    // Listen for language changes to update flatpickr
    this.translate.onLangChange.subscribe(() => {
      this.setFlatpickrLanguage();
    });
  }


    /**
   * Load customers from the VirtualInvoiceService
   */
  ChequesData: ChequeResponse[] = [];
  loadCheques(DocumentNumber: number,Trans_Num: number): void {
    this.loading = true;
    this.receiptService.getCheques(DocumentNumber,Trans_Num).subscribe({
      next: (data) => {
        this.ChequesData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.toastr.error(
          this.translate.instant('VirtualReceiptVoucher.ErrorLoadingCustomers'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }
  
  /**
   * Set flatpickr language based on current app language
   */
  private setFlatpickrLanguage(): void {
    const currentLang = this.translate.currentLang;
    
    if (currentLang === 'ar') {
      this.dateOptions = {
        ...this.dateOptions,
        locale: {
          ...this.dateOptions.locale,
          firstDayOfWeek: 6, // Start week on Saturday for Arabic
        }
      };
      
      // Set RTL mode for Arabic
      Object.assign(this.flatpickrDefaults, {
        direction: 'rtl'
      });
    } else {
      // Reset to LTR for other languages
      Object.assign(this.flatpickrDefaults, {
        direction: 'ltr'
      });
    }
  }
  
  private setupUserData(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
      this.receiptForm.deliveryManNumber = user.DeliveryID;
      this.receiptForm.username = user.DeliveryName;
      this.SystemType = user.SystemType;
    }
  }

  loadCustomers(deliveryId: number): void {
    this.loading = true;
    this.receiptService.getCustomers(deliveryId).subscribe({
      next: (data) => {
        this.customers = data;
        this.customersSearch = data;
        this.filteredCustomers = [...data];
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }


    loadBanks(): void {
    this.loading = true;
    this.receiptService.getBanks().subscribe({
      next: (data) => {
        this.banks = data;
        this.banksSearch = data;
        this.filterBank = [...data];
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }

  

    loadAccounts(): void {
    this.loading = true;
    this.receiptService.getCustomersLevelZero().subscribe({
      next: (data) => {
        this.accounts = data;
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }

  loadInvoices(): void {
    this.loading = true;
    this.receiptService.getInvoices().subscribe({
      next: (data) => {
        this.invoices = data;
        this.filteredInvoices = [...data];
        this.loading = false;
      },
      error: () => {
        // Error handling done by service
        this.loading = false;
      }
    });
  }

  /**
   * Custom search function for customers to search in both name and account number
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

  /**
   * Filter customers based on search term
   */
  filterCustomers(): void {
    const searchTerm = this.customerSearchTerm.toLowerCase();
    this.filteredCustomers = this.customers.filter(
      (customer) =>
        customer.CustomerAccountName.toLowerCase().includes(searchTerm) ||
        customer.CustomerAccountNumber.toString().includes(searchTerm)
    );
  }



    /**
   * Custom search function for customers to search in both name and account number
   */
  BankSearchFn(term: string, item: Bank): boolean {
    if (!term) {
      return true;
    }
    
    term = term.toLowerCase();
    
    // Search in customer name
    const nameMatch = item.Bank.toLowerCase().includes(term);
    
    // Search in account number (convert to string to ensure includes works)
    const accountMatch = item.bank_num.toString().toLowerCase().includes(term);
    
    // Return true if either name or account number matches
    return nameMatch || accountMatch;
  }

  /**
   * Filter customers based on search term
   */
  filterBanks(): void {
    const searchTerm = this.bankSearchTerm.toLowerCase();
    this.filterBank = this.banks.filter(
      (bank) =>
        bank.Bank.toLowerCase().includes(searchTerm) ||
        bank.bank_num.toString().includes(searchTerm)
    );
  }

  /**
   * Handle customer selection
   */
  onCustomerSelected(customer: any): void {
    // Check if customer is selected
    if (customer) {
      debugger;
      this.selectedCustomer = customer;
      this.receiptForm.customerAccountNumber = customer.CustomerAccountNumber;
      this.receiptForm.creditAccountNumber = customer.CustomerAccountNumber;
      //this.receiptForm.debtAccountNumber = customer.CustomerAccountNumber;
      //this.receiptForm.debtAccountNumber = 40101;      
      this.receiptForm.customerAccountName = customer.CustomerAccountName;            
    }
  }


  /**
   * Filter invoices based on search term
   */
  filterInvoices(): void {
    const searchTerm = this.invoiceSearchTerm.toLowerCase();
    this.filteredInvoices = this.invoices.filter(
      (invoice) =>
        invoice.CustomerName.toLowerCase().includes(searchTerm) ||
        invoice.InvoiceNumber.includes(searchTerm)
    );
  }

  /**
   * Handle invoice selection
   */
  onInvoiceSelected(invoice: any): void {
    debugger
    // Check if invoice is selected
    if (invoice) {
      this.selectedInvoice = invoice;
      this.receiptForm.invoiceNumber = invoice.InvoiceNumber;
      this.receiptForm.amount = invoice.InvoiceAmount;
     // this.receiptForm.cashAmount = invoice.cashAmount;
     // this.receiptForm.financialYear = invoice.FinancialYear;
      this.receiptDescription =  this.translate.instant('ReceiptVoucher.ReceiptVoucherDesc') + this.receiptForm.invoiceNumber +  " / " +  invoice.InvoiceAmount.toString();
      this.receiptForm.description=this.receiptDescription;
    }
  }

  /**
   * Open cheque modal dialog using NgbModal
   */
  openCheckModal(content: any): void {
    this.modalRef = this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
      windowClass: 'animate__animated animate__fadeIn'
    });
  }


    /**
   * Add new cheque
   */
  addCheck(): void {
    if (
      this.newCheque.ChequeNumber &&
      this.newCheque.ChequeAmount &&
      this.selectedBank
    ) {

      this.newCheque.ChequeNumber = this.newCheque.ChequeNumber.toString();
      this.newCheque.BankNumber = this.selectedBank.bank_num;
      this.newCheque.BankName = this.currentLang === 'ar' ? this.selectedBank.Bank : this.selectedBank.BEName;
      this.cheques.push({ ...this.newCheque });
      this.calculateFinalBalance();
      this.resetNewCheck();
      this.modalRef?.close();
  
      this.toastr.success(
        this.translate.instant('ReceiptVoucher.ChequeAddedSuccess'),
        this.translate.instant('General.Success')
      );
    } else {
      this.toastr.warning(
        this.translate.instant('ReceiptVoucher.FillChequeDetails'),
        this.translate.instant('General.ValidationError')
      );
    }
  }


  /**
   * Close modal dialog
   */
  closeModal(): void {
    this.modalRef?.close();
  }

  /**
   * Reset new cheque form
   */
  resetNewCheck(): void {
    this.newCheque = {
      ChequeNumber: '',
      ChequeDate: this.formatDate(new Date()),
      BankNumber: 0,
      BankName: '',
      ChequeAmount: 0,
    };
  }



  /**
   * Delete cheque from list with modal confirmation
   */
  deleteCheque(index: number): void {
    const deleteModalRef = this.modalService.open(this.deleteConfirmModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
      windowClass: 'animate__animated animate__fadeIn'
    });
    
    deleteModalRef.result.then(
      (result) => {
        // User clicked Delete
        if (result === true) {
          this.cheques.splice(index, 1);
          this.toastr.success(
            this.translate.instant('VirtualReceiptVoucher.ChequeDeletedSuccess'),
            this.translate.instant('General.Success')
          );
        }
      },
      (reason) => {
        // Modal dismissed, do nothing
      }
    );
  }



  /**
 * Delete cheque from list with modal confirmation
 */
  deleteCashReceiptCheck(): void {
    const deleteModalRef = this.modalService.open(this.deleteAmountConfirmModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
      windowClass: 'animate__animated animate__fadeIn'
    });
    
  deleteModalRef.result.then(
    (result) => {
      // User clicked Delete
      if (result === true) {
        this.cashReceiptVouchers = null;
        this.toastr.success(
          this.translate.instant('ReceiptVoucher.CashReceiptDeletedSuccess'),
          this.translate.instant('General.Success')
        );
      }
    },
    (reason) => {
      // Modal dismissed, do nothing
    }
  );
}
  
  /**
   * Check if cheque amounts match receipt amount
   */
  get isAmountValid(): boolean {
    if (this.cheques.length === 0) {
      return true; // No cheques means it's a cash receipt
    }
    //const totalChequeAmount = this.cheques.reduce((sum, cheque) => sum + cheque.ChequeAmount, 0);
    return Math.abs(this.finalBalance - this.receiptForm.amount) < 0.01; // Allow for small floating point differences
  }

  /**
   * Submit receipt (cash or cheque)
   */

      submitReceipt(): void {
        debugger;
        // Set submitted to true to trigger validation 
        this.submitted = true;
        
        // Existing validation
        if (!this.receiptForm.customerAccountNumber) {
          this.toastr.warning(
            this.translate.instant('ReceiptVoucher.SelectCustomerInvoice'),
            this.translate.instant('General.ValidationError')
          );
          return;
        }
        
  
        /**
        if (!this.isAmountValid) {
          this.toastr.error(
            this.translate.instant('ReceiptVoucher.ChequeAmountMismatch', { amount: this.receiptForm.amount }),
            this.translate.instant('General.ValidationError')
          );
          return;
        }
        */
      
        this.loading = true;
  
        if (this.cheques.length > 0 || this.receiptForm.cashAmount>0) {
          // Submit cheque receipt
            const chequeReceipt: CheqReceiptDto = {
              Date: this.receiptForm.date,
              DeliveryManNumber: this.receiptForm.deliveryManNumber!,
              Username: this.receiptForm.username,
              CreditAccountNumber: this.receiptForm.creditAccountNumber!,
              CreditAccountName: this.receiptForm.customerAccountName,
              InvoiceNumber: this.receiptForm.invoiceNumber!,
              FinancialYear: this.receiptForm.financialYear,
              DebtAccountNumber: this.receiptForm.debtAccountNumber || 0,
              ChequeDebtAccountNumber: this.receiptForm.ChequedebtAccountNumber || 0,
              Amount: this.receiptForm.cashAmount,
              ChequeAmount: this.finalBalance,
              Description: this.receiptForm.description || '',
              Cheques: this.cheques,
            };
      
          this.receiptService.addChequeReceipt(chequeReceipt).subscribe({
            next: (result) => {
              this.toastr.success(
                this.translate.instant('ReceiptVoucher.ChequeReceiptSuccess'),
                this.translate.instant('General.Success')
              );
              this.PrintReceiptVoucherPDF(result.TransNo);
              this.resetForm();
              this.loading = false;
            },
            error: () => {
              // Error handling done by service
              this.loading = false;
            }
          });
        } 
            
      }
  /**
   * Reset form to initial state
   */

    resetForm(): void {
    // Reset submitted flag
    this.submitted = false;
    
    this.receiptForm = {
      date: this.formatDate(new Date()),
      customerAccountNumber: null,
      customerAccountName: '',
      invoiceNumber: null,
      cashAmount: 0,
      TotalChequesAmount: 0,
      transactionNumber: null,
      financialYear: new Date().getFullYear(),
      amount: 0,
      description: '',
      deliveryManNumber: this.deliveryId,
      username: this.deliveryName ?? '',
      creditAccountNumber: null,
      debtAccountNumber: null,
      ChequedebtAccountNumber: null
    };
    this.finalBalance=0;
    this.selectedCustomer = null;
    this.selectedInvoice = null;
    this.customerSearchTerm = '';
    this.invoiceSearchTerm = '';
    this.cheques = [];
    this.cashReceiptVouchers=null;
  }


  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }



  search(): void {
    debugger;
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
        if(data)
        {
          var result = data.filter(c=>c.Doctype==2);
          this.accountStatementData = result;
          this.allData = [...result];
          this.totalItems = result.length;

          this.applyPagination();
        }
        else
        {
          this.accountStatementData = [];
          this.allData = [];
          this.totalItems = 0;

          this.toastr.info(
          this.translate.instant('AccountStatement.NoTransactionsFound'),
          this.translate.instant('General.Info')
          );
        }
        
        // Apply initial pagination
 
        
       // this.calculateFinalBalance();
        this.loading = false;
        
        if (data.length != 0) {
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
   * Apply pagination to the data
   */
  private applyPagination(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Update the data source with the paginated data
    this.dataSourceReceiptVouchers.data = this.allData.slice(startIndex, endIndex);
  }
  

    /**
   * Comparison function for sorting
   */
  private compare(a: any, b: any, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
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
   * Open cheque modal dialog using NgbModal
   */
  openChequesModal(content: any,DocumentNumber: number,Trans_Num: number): void {
    debugger
    this.loadCheques(DocumentNumber,Trans_Num);
    this.modalRef = this.modalService.open(content, {
      centered: true,
      size: 'lg',
      backdrop: 'static',
      windowClass: 'animate__animated animate__fadeIn'
    });
  }



  calculateFinalBalance(): void {
        debugger;
        this.finalBalance = 0;    
        this.cheques.forEach((item) => {
        var ChequeAmount : number  = Number(parseFloat(item.ChequeAmount.toString().replace(',','.').replace(' ','')));
        if(item.ChequeAmount){ this.finalBalance +=  ChequeAmount }});
  }



     AddCash()
      {
          const cashReceipt: CashReceiptDto = {
            Date: this.receiptForm.date,
            DeliveryManNumber: this.receiptForm.deliveryManNumber!,
            Username: this.receiptForm.username,
            CreditAccountNumber: this.receiptForm.creditAccountNumber!,
            CreditAccountName: this.receiptForm.customerAccountName,        
            InvoiceNumber: this.receiptForm.invoiceNumber!,
            FinancialYear: this.receiptForm.financialYear,
            DebtAccountNumber: this.receiptForm.debtAccountNumber!,
            ChequeDebtAccountNumber: this.receiptForm.ChequedebtAccountNumber!,
            Amount: this.receiptForm.cashAmount,
            ChequeAmount: this.finalBalance,
            Description: this.receiptForm.description,
          };
    
    
          this.cashReceiptVouchers = cashReceipt;
      }



    onBankSelected(bank: any): void {
    this.selectedBank = bank;
  }


PrintReceiptVoucherPDF(transNo: number)
{
          this.reportService.generateDetailsReceiptVoucherPDF(transNo,this.SystemType).subscribe({
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


        onAccountSelected(customer: any): void {
    this.receiptForm.debtAccountNumber = customer.CustomerAccountNumber;
  }

      onAccountChequeSelected(customer: any): void {
    this.receiptForm.ChequedebtAccountNumber = customer.CustomerAccountNumber;
  }


}
