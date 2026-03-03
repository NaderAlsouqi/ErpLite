import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { AuthService } from '../../../shared/services/auth.service';
import { 
  VirtualInvoiceService,
  VirtualCustomerDto
} from '../../../shared/services/virtual-invoice.service';

// Import Flatpickr
import { FlatpickrModule } from 'angularx-flatpickr';
import { FlatpickrDefaults } from 'angularx-flatpickr';

import { SumPipe } from '../../../shared/pipes/sum.pipe';

// NgbModal imports
import { NgbModal, NgbModalConfig, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { MatTabsModule, MatTab, MatTabGroup } from '@angular/material/tabs';
// Material table imports

import { MatSortModule, Sort} from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReceiptVouchersService } from '../../../shared/services/receipt-vouchers.service';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
// Material table imports (still needed for the cheques table)
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { ReportService, AccountStatementRequest, AccountStatementResponse  } from '../../../shared/services/report.service'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';


// Material DatePicker imports with custom format
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { AccountStatmentComponent } from '../../Reports/account-statment/account-statment.component';


// Define interfaces for Virtual Receipt Vouchers
interface VirtualInvoice {
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: number;
  InvoiceDate: string;
  IsTransferred: boolean;
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


export interface Customer {
  CustomerAccountNumber: number;
  CustomerAccountName: string;
}


export interface CashReceiptDto {
  Date: string;
  DeliveryManNumber: number;
  Username: string;
  CreditAccountNumber: number;
  CreditAccountName: string;
  InvoiceNumber: string;
  FinancialYear: number;
  DebtAccountNumber: number;
  ChequeDebtAccountNumber: number;
  Amount: number;
  ChequeAmount: number;
  Description?: string;
}

export interface ChequeDto {
  ChequeNumber: string;
  ChequeDate: string;
  BankNumber: number;
  BankName: string;
  ChequeAmount: number;
}

export interface ChequeResponse {
  ChequeNumber: string;
  ChequeDate: string;
  BankNumber: number;
  BankName: string;
  ChequeAmount: number;
}

export interface CheqReceiptDto extends CashReceiptDto {
  Cheques: ChequeDto[];
}

export interface Bank {
  Bank: string;
  BEName: string;
  bank_num: number
}

@Component({
  selector: 'app-virtual-receipt-vouchers',
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

  templateUrl: './virtual-receipt-vouchers.component.html',
  styleUrl: './virtual-receipt-vouchers.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class VirtualReceiptVouchersComponent implements OnInit {
  // State variables
  submitted: boolean = false;
  
  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;
  @ViewChild('deleteAmountConfirmModal') deleteAmountConfirmModal!: TemplateRef<any>;
  
  // Table configuration
  //displayedColumns: string[] = ['ChequeNumber', 'ChequeDate', 'BankNumber', 'ChequeAmount', 'Actions'];
  

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

  currentLang: string = 'ar'; // Default language
  finalBalance: number = 0;
  
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
  invoiceSearchTerm: string = '';
  customers: VirtualCustomerDto[] = [];
  filteredCustomers: VirtualCustomerDto[] = [];
  selectedCustomer: VirtualCustomerDto | null = null;
  invoices: VirtualInvoice[] = [];
  filteredInvoices: VirtualInvoice[] = [];
  selectedInvoice: VirtualInvoice | null = null;
  accounts: Customer[] = [];
  customersSearch: Customer[] = [];
  filterBank: Bank[] = [];
  accountStatementData: AccountStatementResponse[] = [];

  // Cheques
  cheques: ChequeDto[] = [];
  newCheque: ChequeDto = {
    ChequeNumber: '',
    ChequeDate: this.formatDate(new Date()),
    BankNumber: 0,
    BankName: '',
    ChequeAmount: 0,
  };
  
  // State
  loading: boolean = false;
  modalRef!: NgbModalRef;
  searched: boolean = false;

    // Form fields
  startDate: string = '';
  endDate: string = '';
  accountNumber: string | null = null;
  bankNumber: string | null = null;
  receiptDescription: string = '';


  startDateModel: Date | null = null;
  endDateModel: Date | null = null;


  // User info
  deliveryId: number | null = 0;  
  SystemType:  number = 1;
  deliveryName: string | null = null;

  //filterBank: Bank[] = [];
  selectedBank: any | null = null;
  banks: Bank[] = [];
  banksSearch: Bank[] = [];
  cashReceiptVouchers: CashReceiptDto | null = null;


  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: AccountStatementResponse[] = [];


  constructor(
    private datePipe: DatePipe,
    private translate: TranslateService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private authService: AuthService,
    private reportService: ReportService,
    private virtualInvoiceService: VirtualInvoiceService,
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
    this.setupUserData();
    if (this.deliveryId!=null) {
      this.loadCustomers();
      this.loadBanks();
      this.loadAccounts();
      this.loadInvoices(this.deliveryId);
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

    onAccountSelected(customer: any): void {
    this.receiptForm.debtAccountNumber = customer.CustomerAccountNumber;
  }

      onAccountChequeSelected(customer: any): void {
    this.receiptForm.ChequedebtAccountNumber = customer.CustomerAccountNumber;
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
      this.receiptForm.deliveryManNumber = user.ID;
      this.receiptForm.username = user.DeliveryName;
      this.SystemType = user.SystemType;       
    }
  }

  /**
   * Load customers from the VirtualInvoiceService
   */
  loadCustomers(branchNo?: number): void {
    this.loading = true;
    this.virtualInvoiceService.getCustomers(branchNo).subscribe({
      next: (data) => {
        this.customers = data;
       // this.filteredCustomers = [...data];
        this.customersSearch = data;
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
   * Load invoices from the VirtualInvoiceService
   */
  loadInvoices(deliveryId: number): void {
    this.loading = true;
    this.virtualInvoiceService.GetInvoicesMainData(deliveryId).subscribe({
      next: (data) => {
        this.invoices = data.map(invoice => ({
          InvoiceNumber: invoice.InvoiceNumber,
          TransactionNumber: invoice.TransactionNumber,
          CustomerName: invoice.CustomerName,
          FinancialYear: invoice.FinancialYear,
          InvoiceAmount: parseFloat(invoice.InvoiceAmount.toString()),
          InvoiceDate: invoice.InvoiceDate,
          IsTransferred: invoice.IsTransferred
        }));
        this.filteredInvoices = [...this.invoices];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.toastr.error(
          this.translate.instant('VirtualReceiptVoucher.ErrorLoadingInvoices'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Custom search function for customers to search in both name and account number
   */
  customSearchFn(term: string, item: VirtualCustomerDto): boolean {
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
   * Handle customer selection
   */
  onCustomerSelected(customer: VirtualCustomerDto): void {
    // Check if customer is selected
    if (customer) {
      debugger;
      this.selectedCustomer = customer;
      this.receiptForm.customerAccountNumber = customer.CustomerAccountNumber;
      this.receiptForm.creditAccountNumber = customer.CustomerAccountNumber;
      //this.receiptForm.debtAccountNumber = customer.CustomerAccountNumber;
      //this.receiptForm.debtAccountNumber = 40101;      
      this.receiptForm.customerAccountName = customer.CustomerAccountName;     

      // Filter invoices for this customer if needed
      this.filterInvoicesByCustomer(customer.CustomerAccountNumber);

    }
  }

  /**
   * Filter invoices for a specific customer
   */
  filterInvoicesByCustomer(customerAccountNumber: number): void {
    debugger;
    this.filteredInvoices = this.invoices.filter(
      invoice => invoice.CustomerName.toLowerCase().includes(
        this.customers.find(c => c.CustomerAccountNumber === customerAccountNumber)?.CustomerAccountName.toLowerCase() || ''
      )
    );
  }

  /**
   * Filter invoices based on search term
   */
  filterInvoices(): void {
    const searchTerm = this.invoiceSearchTerm.toLowerCase();
    this.filteredInvoices = this.invoices.filter(
      (invoice) =>
        invoice.CustomerName.toLowerCase().includes(searchTerm) ||
        invoice.InvoiceNumber.includes(searchTerm) ||
        invoice.TransactionNumber.includes(searchTerm)
    );
  }

  /**
   * Handle invoice selection
   */
  onInvoiceSelected(invoice: VirtualInvoice): void {
    // Check if invoice is selected
    if (invoice) {
      this.selectedInvoice = invoice;
      this.receiptForm.invoiceNumber = invoice.InvoiceNumber;
      this.receiptForm.transactionNumber = invoice.TransactionNumber;
      this.receiptForm.amount = invoice.InvoiceAmount;
      this.receiptForm.financialYear = parseInt(invoice.FinancialYear);
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

  
    calculateFinalBalance(): void {
        debugger;
        this.finalBalance = 0;    
        this.cheques.forEach((item) => {
        var ChequeAmount : number  = Number(parseFloat(item.ChequeAmount.toString().replace(',','.').replace(' ','')));
        if(item.ChequeAmount){ this.finalBalance +=  ChequeAmount }});
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
   * Check if cheque amounts match receipt amount
   */
  get isAmountValid(): boolean {
    if (this.cheques.length === 0) {
      return true; // No cheques means it's a cash receipt
    }
    const totalChequeAmount = this.cheques.reduce((sum, cheque) => sum + cheque.ChequeAmount, 0);
    return Math.abs(totalChequeAmount - this.receiptForm.amount) < 0.01; // Allow for small floating point differences
  }

  /**
   * Submit receipt (cash or cheque)
   * Note: This is a placeholder. You'll need to implement the actual API calls.
   */
  /**
     * Submit receipt (cash or cheque)
     */


    
    submitReceipt(): void {
      debugger;
      // Set submitted to true to trigger validation 
      this.submitted = true;
      
      // Existing validation
      if (!this.receiptForm.customerAccountNumber ) {
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


      onBankSelected(bank: any): void {
    this.selectedBank = bank;
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
 * Delete cheque from list with modal confirmation
 */
  deleteCashReceiptCheck(): void {
    const deleteCashModalRef = this.modalService.open(this.deleteAmountConfirmModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
      windowClass: 'animate__animated animate__fadeIn'
    });


    deleteCashModalRef.result.then(
      (result) => {
        // User clicked Delete
        if (result === true) {
          this.cashReceiptVouchers=null;
          this.receiptForm.cashAmount=0;
          this.toastr.success(
            this.translate.instant('VirtualReceiptVoucher.CashDeletedSuccess'),
            this.translate.instant('General.Success')
          );
        }
      },
      (reason) => {
        // Modal dismissed, do nothing
      }
    );


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
          
          // Apply initial pagination
          this.applyPagination();
        }
        else
        {
            this.accountStatementData=[];
            this.allData =[];
            this.totalItems = 0;

            this.toastr.info(
            this.translate.instant('AccountStatement.NoTransactionsFound'),
            this.translate.instant('General.Info'));
        }

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
