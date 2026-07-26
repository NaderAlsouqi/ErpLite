import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from "../../../shared/common/sharedmodule";
import { AuthService } from '../../../shared/services/auth.service';
import { ApproveVoucherComponent } from '../../../shared/components/approve-voucher/approve-voucher.component';
import { MatTabsModule, MatTab, MatTabGroup } from '@angular/material/tabs';

import {
  ReceiptVouchersService,
  Customer,
  Invoice,
  CashReceiptDto,
  CheqReceiptDto,
  ChequeDto,
  ChequeResponse,
  Bank,
  ReceiptVoucherListDto,
} from '../../../shared/services/receipt-vouchers.service';
import { JournalVouchersService, JournalVoucherDto } from '../../../shared/services/journal-vouchers.service';

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
import { MatSortModule, Sort } from '@angular/material/sort';
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
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-receipt-vouchers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    ApproveVoucherComponent,
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
    MatTabGroup,
    HasPermissionDirective
  ],
  providers: [
    DatePipe,
    // Add these providers to override the default date format
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }, // Use en-GB locale for dd/MM/yyyy format
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
  displayedColumns: string[] = ['Date', 'DocumentNumber', 'Description', 'Actions'];
  dataSourceReceiptVouchers = new MatTableDataSource<AccountStatementResponse>([]);

  displayedChequeColumns: string[] = ['ChequeNumber', 'ChequeDate', 'BankNumber', 'BankName', 'ChequeAmount'];
  dataSourceCheqs = new MatTableDataSource<ChequeDto>([]);

  allFlattenedCheques: any[] = [];
  flattenedChequeColumns: string[] = ['chequeNo', 'date', 'amt', 'bankNo', 'bankName', 'drawName', 'CreditAcc'];
  selectedTabIndex: number = 0;

  // Page tabs (entry / list) + list sub-view, like accounting/invoices/service
  activeTab: 'form' | 'list' = 'form';
  listView: 'vouchers' | 'cheques' = 'vouchers';
  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }
  setListView(v: 'vouchers' | 'cheques'): void { this.listView = v; }

  // ─── View voucher (عرض) popup — the receipt's GL entry ───────
  voucherViewOpen = false;
  voucherViewLoading = false;
  voucherView: JournalVoucherDto | null = null;
  voucherViewDocNum: string | null = null;

  get vvTotalDebit():  number { return (this.voucherView?.Lines ?? []).reduce((s, l) => s + (l.Debit  || 0), 0); }
  get vvTotalCredit(): number { return (this.voucherView?.Lines ?? []).reduce((s, l) => s + (l.Credit || 0), 0); }

  openVoucherView(row: any): void {
    this.voucherViewDocNum = row.DocumentNumber;
    this.voucherView = null;
    this.voucherViewOpen = true;
    this.voucherViewLoading = true;
    this.jvService.getVoucher(+row.DocumentNumber, this.vYear(row.Date), 1, row.Doctype).subscribe({
      next: v => { this.voucherView = v; this.voucherViewLoading = false; },
      error: () => { this.voucherView = null; this.voucherViewLoading = false; },
    });
  }
  closeVoucherView(): void { this.voucherViewOpen = false; this.voucherView = null; this.voucherViewDocNum = null; }

  /** Open a saved receipt voucher in the entry tab with its data filled in (view). */
  openReceiptInForm(row: any): void {
    this.activeTab = 'form';
    this.resetForm();
    this.loading = true;

    const docNum = Number(row.DocumentNumber);
    const year   = this.vYear(row.Date);
    this.receiptForm.date          = (this.datePipe.transform(row.Date, 'yyyy-MM-dd') as string) || this.receiptForm.date;
    this.receiptForm.financialYear = year;
    this.receiptForm.description   = row.Description ?? row['Des'] ?? '';
    this.receiptForm.customerAccountName = row['CusName'] ?? '';
    this.receiptForm.amount        = row['Amount'] ?? 0;

    // The receipt's GL entry gives the real account numbers + amounts.
    this.jvService.getVoucher(docNum, year, 1, row.Doctype).subscribe({
      next: (v) => {
        const lines = v?.Lines ?? [];
        const credit = lines.find(l => (l.Credit || 0) > 0);
        if (credit) {
          this.receiptForm.customerAccountNumber = credit.Acc;
          this.receiptForm.creditAccountNumber   = credit.Acc;
          this.receiptForm.customerAccountName    = credit.AccName ?? this.receiptForm.customerAccountName;
          this.receiptForm.amount                 = credit.Credit;
        }
        // Cheques of this voucher → staged cheques list.
        this.receiptService.getCheques(docNum, row.Trans_Num).subscribe({
          next: (chs) => {
            this.cheques = chs ?? [];
            this.calculateFinalBalance();
            const chequeTotal = this.finalBalance;
            const debits = lines.filter(l => (l.Debit || 0) > 0);
            const chequeDebit = chequeTotal > 0 ? debits.find(l => Math.abs((l.Debit || 0) - chequeTotal) < 0.01) : undefined;
            const cashDebit   = debits.find(l => l !== chequeDebit);
            if (chequeDebit) this.receiptForm.ChequedebtAccountNumber = chequeDebit.Acc;
            if (cashDebit) {
              this.receiptForm.debtAccountNumber = cashDebit.Acc;
              this.receiptForm.cashAmount        = cashDebit.Debit;
            }
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.loading = false; },
    });
  }

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
  searchDocNum: string = '';



  startDateModel: Date | null = null;
  endDateModel: Date | null = null;


  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  allData: AccountStatementResponse[] = [];
  // Data
  accountStatementData: any[] = [];

  cashReceiptVouchers: CashReceiptDto | null = null;

  // State
  loading: boolean = false;
  searched: boolean = false;
  modalRef!: NgbModalRef;

  // User info
  deliveryId: number | null = null;
  deliveryName: string | null = null;
  SystemType: number = 1;

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
    private jvService: JournalVouchersService,
    private flatpickrDefaults: FlatpickrDefaults,
    private route: ActivatedRoute
  ) {
    // Configure NgbModal defaults
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;

    // Set up flatpickr defaults based on language
    this.setFlatpickrLanguage();
  }

  ngOnInit(): void {
    this.setupUserData();
    // Honor workflow deep-link (?year=) — pre-set the financial year.
    const qp = this.route.snapshot.queryParamMap;
    if (qp.has('year')) this.receiptForm.financialYear = Number(qp.get('year')) || this.receiptForm.financialYear;
    if (this.deliveryId != null) {
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

    this.loadAllReceiptVouchers();

    // Listen for language changes to update flatpickr
    this.translate.onLangChange.subscribe(() => {
      this.setFlatpickrLanguage();
    });
  }
  loadAllReceiptVouchers(docNum?: string, dateFrom?: string, dateTo?: string): void {
    this.loading = true;
    this.receiptService.getAllReceiptVouchers(dateFrom, dateTo, docNum).subscribe({
      next: (data: ReceiptVoucherListDto[]) => {
        const mappedData = data as any[];
        this.allData = [...mappedData];
        this.accountStatementData = [...mappedData];
        this.totalItems = data.length;
        this.flattenCheques(data);
        this.applyPagination();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  flattenCheques(data: any[]): void {
    this.allFlattenedCheques = [];
    data.forEach(row => {
      if (row.Cheques && row.Cheques !== "[]") {
        try {
          // Some APIs return already parsed objects if using some interceptors, but user said "return string in json format"
          const parsed = typeof row.Cheques === 'string' ? JSON.parse(row.Cheques) : row.Cheques;
          if (Array.isArray(parsed)) {
            // Keep a reference to the parent voucher so each cheque row can link to its source document.
            const enriched = parsed.map(c => ({
              ...c,
              _docNum: row.DocumentNumber,
              _year: this.vYear(row.Date),
            }));
            this.allFlattenedCheques.push(...enriched);
          }
        } catch (e) {
          console.error("Error parsing cheques for row", row.DocumentNumber, e);
        }
      }
    });
  }

  /** Derive the 4-digit fiscal year from a date string (for source-voucher links). */
  vYear(dateStr: string): number {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }



  /**
 * Load customers from the VirtualInvoiceService
 */
  ChequesData: ChequeResponse[] = [];
  loadCheques(DocumentNumber: number, Trans_Num: number): void {
    this.ChequesData = [];
    this.loading = true;
    this.receiptService.getCheques(DocumentNumber, Trans_Num).subscribe({
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
      this.receiptDescription = this.translate.instant('ReceiptVoucher.ReceiptVoucherDesc') + this.receiptForm.invoiceNumber + " / " + invoice.InvoiceAmount.toString();
      this.receiptForm.description = this.receiptDescription;
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

    if (this.cheques.length > 0 || this.receiptForm.cashAmount > 0) {
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
          this.loadAllReceiptVouchers();
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
    this.finalBalance = 0;
    this.selectedCustomer = null;
    this.selectedInvoice = null;
    this.customerSearchTerm = '';
    this.invoiceSearchTerm = '';
    this.cheques = [];
    this.cashReceiptVouchers = null;
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
    // Cheques view: use loadAllReceiptVouchers with dates and account (mapped to docNum)
    if (this.listView === 'cheques') {
      const startDateObject = this.startDate ? new Date(this.startDate) : null;
      const endDateObject = this.endDate ? new Date(this.endDate) : null;

      const formattedStartDate = startDateObject ? (this.datePipe.transform(startDateObject, 'yyyy-MM-dd') as string) : undefined;
      const formattedEndDate = endDateObject ? (this.datePipe.transform(endDateObject, 'yyyy-MM-dd') as string) : undefined;

      // If account has value, add 1 to it (account is docNum)
      let docNumParam = this.accountNumber ?? undefined;
      if (this.accountNumber) {
        docNumParam = (Number(this.accountNumber) + 1).toString();
      }

      this.loadAllReceiptVouchers(docNumParam, formattedStartDate, formattedEndDate);
      return;
    }

    // If Document Number is specifically provided (e.g. from the searchDocNum field)
    if (this.searchDocNum) {
      this.loadAllReceiptVouchers(this.searchDocNum);
      return;
    }

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
        if (data) {
          var result = data.filter(c => c.Doctype == 2);
          this.accountStatementData = result;
          this.allData = [...result];
          this.flattenCheques(result);
          this.totalItems = result.length;

          this.applyPagination();
        }
        else {
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
  openChequesModal(content: any, DocumentNumber: any, Trans_Num: number): void {
    debugger
    this.loadCheques(DocumentNumber, Trans_Num);
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
      var ChequeAmount: number = Number(parseFloat(item.ChequeAmount.toString().replace(',', '.').replace(' ', '')));
      if (item.ChequeAmount) { this.finalBalance += ChequeAmount }
    });
  }



  AddCash() {
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


  PrintReceiptVoucherPDF(transNo: number) {
    this.reportService.generateDetailsReceiptVoucherPDF(transNo, this.SystemType).subscribe({
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


  /** Print whichever list (vouchers or all-cheques) is currently shown. */
  printActiveList(): void {
    if (this.listView === 'cheques') this.printChequesList();
    else this.printVouchersList();
  }

  /** Print the whole receipt-vouchers list currently shown (client-side). */
  printVouchersList(): void {
    const rows = this.accountStatementData || [];
    if (!rows.length) return;
    const t = (k: string) => this.translate.instant(k);
    const total = rows.reduce((s: number, r: any) => s + (Number(r['Amount']) || 0), 0);
    const headers = [
      t('AccountStatement.Date'), t('AccountStatement.DocumentNumber'),
      t('ReceiptVoucher.Customer'), t('ReceiptVoucher.Amount')
    ];
    const body = rows.map((r: any) => `
      <tr>
        <td>${this.pDate(r.Date)}</td>
        <td>${this.pEsc(r.DocumentNumber)}</td>
        <td>${this.pEsc(r['CusName'])}</td>
        <td class="num">${this.pNum(r['Amount'])}</td>
      </tr>`).join('');
    const foot = `<tr><td colspan="3">${t('ReceiptVoucher.Total')}</td><td class="num">${this.pNum(total)}</td></tr>`;
    this.openPrintTable(t('ReceiptVoucher.VouchersList'), headers, body, foot);
  }

  /** Print the whole "all cheques" list currently shown (client-side). */
  printChequesList(): void {
    const rows = this.allFlattenedCheques || [];
    if (!rows.length) return;
    const t = (k: string) => this.translate.instant(k);
    const total = rows.reduce((s: number, c: any) => s + (Number(c.amt) || 0), 0);
    const headers = [
      t('ReceiptVoucher.ChequeNumber'), t('ReceiptVoucher.ChequeDate'), t('ReceiptVoucher.ChequeAmount'),
      t('ReceiptVoucher.BankNumber'), t('ReceiptVoucher.BankName'), t('ReceiptVoucher.DrawerName'),
      t('ReceiptVoucher.CreditAccount')
    ];
    const body = rows.map((c: any) => `
      <tr>
        <td>${this.pEsc(c.chequeNo)}</td>
        <td>${this.pEsc(c.date)}</td>
        <td class="num">${this.pNum(c.amt)}</td>
        <td>${this.pEsc(c.bankNo)}</td>
        <td>${this.pEsc(c.bankName)}</td>
        <td>${this.pEsc(c.drawName)}</td>
        <td>${this.pEsc(c.CreditAcc)}</td>
      </tr>`).join('');
    const foot = `<tr><td>${t('ReceiptVoucher.Total')}</td><td></td><td class="num">${this.pNum(total)}</td><td colspan="4"></td></tr>`;
    this.openPrintTable(t('ReceiptVoucher.AllChequesList'), headers, body, foot);
  }

  // ---- print helpers -------------------------------------------------------
  private pEsc(v: any): string {
    return String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  }
  private pNum(n: any): string {
    return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  private pDate(d: any): string {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return this.pEsc(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${dt.getFullYear()}`;
  }

  /** Open a printable window with a titled table (header row + body + footer). */
  private openPrintTable(title: string, headers: string[], bodyRows: string, footHtml: string): void {
    const isRtl = (this.translate.currentLang || 'ar') === 'ar';
    const t = (k: string) => this.translate.instant(k);
    const range = (this.startDate || this.endDate)
      ? `${t('AccountStatement.StartDate')}: ${this.pEsc(this.startDate) || '—'} &nbsp; ${t('AccountStatement.EndDate')}: ${this.pEsc(this.endDate) || '—'}`
      : '';
    const headHtml = headers.map(h => `<th>${h}</th>`).join('');

    const html = `<!doctype html><html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#1f2937;}
  h2{margin:0 0 4px;font-size:18px;}
  .meta{color:#6b7280;font-size:12px;margin-bottom:14px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th,td{border:1px solid #cbd5e1;padding:6px 9px;text-align:${isRtl ? 'right' : 'left'};}
  thead th{background:#e8eaf6;}
  .num{text-align:${isRtl ? 'left' : 'right'};white-space:nowrap;}
  tfoot td{font-weight:700;background:#f8fafc;}
  @media print{body{margin:0;}}
</style></head>
<body>
  <h2>${title}</h2>
  ${range ? `<div class="meta">${range}</div>` : ''}
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>${footHtml}</tfoot>
  </table>
  <script>window.onload=function(){window.focus();window.print();};</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  onAccountSelected(customer: any): void {
    this.receiptForm.debtAccountNumber = customer.CustomerAccountNumber;
  }

  onAccountChequeSelected(customer: any): void {
    this.receiptForm.ChequedebtAccountNumber = customer.CustomerAccountNumber;
  }

}
