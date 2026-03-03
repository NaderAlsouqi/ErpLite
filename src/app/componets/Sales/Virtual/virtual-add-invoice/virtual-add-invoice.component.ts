import { Component, OnInit, TemplateRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { 
  VirtualInvoiceService, 
  VirtualBranchDto, 
  VirtualItemDto, 
  VirtualCustomerDto,
  BillInvoiceDto,
  VirtualAddBranchDto,
  VirtualAddCustomerDto,
  VirtualAddItemDto,
  VirtualAddUnitDto,
  VirtualUnitDto,
  VirtualUpdateBranchDto,
  VirtualUpdateCustomerDto,
  VirtualUpdateItemDto,
  VirtualUpdateUnitDto
} from '../../../../shared/services/virtual-invoice.service';
import { InvoiceService, TaxTypeDto } from '../../../../shared/services/invoice.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { firstValueFrom } from 'rxjs';

// Angular Material imports
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Add these imports
import { FlatpickrModule } from 'angularx-flatpickr';
import { FlatpickrDefaults } from 'angularx-flatpickr';
import { FotaraService } from "../../../../shared/services/fotara.service";


interface VirtualInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
}


@Component({
  selector: 'app-virtual-add-invoice',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbAccordionModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    SharedModule,
    FlatpickrModule // Add this to your existing imports
  ],
  providers: [
    DatePipe,
    FlatpickrDefaults // Add this provider
  ],
  templateUrl: './virtual-add-invoice.component.html',
  styleUrl: './virtual-add-invoice.component.scss'
})
export class VirtualAddInvoiceComponent implements OnInit {
  // Branch, items, and customers collections
  branches: VirtualBranchDto[] = [];
  availableItems: VirtualItemDto[] = [];
  filteredItems: VirtualItemDto[] = [];
  customers: VirtualCustomerDto[] = [];
  filteredCustomers: VirtualCustomerDto[] = [];
  
  // Tax types (from regular invoice service)
  taxTypes: TaxTypeDto[] = [];
  
  // Units
  units: { UnitNumber: number; UnitArabicName: string; UnitEnglishName: string }[] = [];
  availableUnits: VirtualUnitDto[] = [];
  filteredUnits: VirtualUnitDto[] = [];
  
  // InvoiceTypes
  InvoiceTypes: any[] = [];

  // Selected values
  selectedBranch: VirtualBranchDto | null = null;
  selectedCustomer: VirtualCustomerDto | null = null;
  selectedItem: VirtualItemDto | null = null;
  
  // Search terms
  branchSearchTerm: string = '';
  customerSearchTerm: string = '';
  itemSearchTerm: string = '';
  unitSearchTerm: string = '';
  TaxMode: boolean=false;
  Include: boolean=false;
  Quotation: boolean = false;
  isTransfer: boolean = false;
  
  // Virtual invoice data
  newRow = {
    BranchNo: 0,
    Date: this.datePipe.transform(new Date(), 'dd/MM/yyyy'),
    CustomerAccountNumber: 0,
    Description: '',
    TotalWithoutTax: 0,
    TotalWithTax: 0,
    TotalTax: 0,
    DiscountAmount: 0,
    IncludeTAX: 0,
    Sign: false,
    InvoiceType: 0,
    Items: [] as Array<{
      ItemNumber: string;
      UnitNumber: number;
      ItemName: string;
      Quantity: number;
      Price: number;
      TaxType?: number;
      ItemTaxRate?: number;
      ItemTaxAmount?: number;
      ItemDiscountAmount?: number;
      ItemTotalPriceWithoutTax?: number;
      ItemTotalPriceAfterTax?: number;
      [key: string]: any;
    }>,
  };

  deliveryId: number | null = 0;
  taxTypeId: number | null = null;
  deliveryName: string | null = null;
  
  // UI state
  includeTax: boolean = false;
  Sign: boolean = false;
  loading = false;
  currentLang: string = 'ar'; // Default language
  isEditingBranch = false;
  isEditingCustomer = false;
  isEditingItem = false;
  isEditingUnit = false;

  // New objects for modal forms
  newBranch: VirtualAddBranchDto = {
    BranchNo: 0,
    BranchNameArabic: '',
    BranchNameEnglish: ''
  };

  newCustomer: VirtualAddCustomerDto = {
    BranchNo: 0,
    CustomerNumber: 0,
    CustomerName: '',
    TaxNo: '',
    PhoneNo: ''
  };

  newItem: VirtualAddItemDto = {
    ItemNumber: '',
    ItemName: '',
    UnitNumber: 1,
    TaxNo: 0
  };

  newUnit: VirtualAddUnitDto = {
    UnitNumber: 1,
    UnitArabicName: '',
    UnitEnglishName: ''
  };

  // Date properties
  invoiceDate: string = '';
  maxDate: string = '';

  // Add dateOptions property
  dateOptions = {
    dateFormat: 'Y-m-d',
    allowInput: true,
    altInput: true,
    altFormat: 'd/m/Y',
    maxDate: 'today',
    locale: {
      firstDayOfWeek: this.translate.currentLang === 'ar' ? 6 : 0 // Saturday for Arabic, Sunday for English
    }
  };

  constructor(
    private virtualInvoiceService: VirtualInvoiceService,
    private invoiceService: InvoiceService, // For tax types
    private authService: AuthService,
    private datePipe: DatePipe,
    private toastr: ToastrService,
    private translate: TranslateService,
    private fotaraService: FotaraService,
    private modalService: NgbModal, // Add NgbModal service
    private flatpickrDefaults: FlatpickrDefaults // Add this to your constructor parameters
  ) {
    // Initialize flatpickr direction based on language
    this.setFlatpickrLanguage();
    this.getQuotation();
  }
  

  ngOnInit(): void {
    // Initialize the date properties
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    this.invoiceDate = this.maxDate;    
    this.loadBranches();
    this.loadItems();
    this.loadTaxTypes();
    this.loadUnits();
    this.loadCustomers(this.selectedBranch?.BranchNo);
    this.setupUserData();
    this.loadInvoiceTypes();
    this.currentLang = this.translate.currentLang || 'ar';

    // Subscribe to language changes to update the flatpickr locale
    this.translate.onLangChange.subscribe(() => {
      this.setFlatpickrLanguage();
    });
  }

  getQuotation()
  {
    debugger;
    const storedValue = localStorage.getItem('Quotation');
    
      if (storedValue === 'true') {
        this.Quotation = true;
        this.newRow.Description= '';
      } else {
        this.Quotation = false; // Covers 'false' string, null, or any other unexpected string
        this.newRow.Description= '.ملاحظة : لا تعتبر هذه الفاتورة مدفوعة دون إيصال رسمي من الشركة  ما لم تكن نقدية.  أنا الموقع ادناه استلمت البضاعة المذكورة أعلاه كاملة وسليمة وخالية من العيوب بالعدد والسعر المحددين واتعهد بدفع القيمة كاملة عند المطالبة دون انكار أو اشعار ويسقط حقي في توجيه اليمين.   المستلم هو العميل أو من ينوب عنه أو أحد موظفيه';

      }
  }

  private setupUserData(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.deliveryName = user.DeliveryName;
      this.taxTypeId=user.TaxType;

      this.isTransfer = user.Roles.includes('VirtualTransfer');
    }
  }

  /**
   * Load branches from the virtual invoice service
   */
  loadBranches(): void {
    this.loading = true;
    this.virtualInvoiceService.getBranches().subscribe({
      next: (data) => {
        this.branches = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading branches:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingBranches'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Load items from the virtual invoice service
   */
  loadItems(): void {
    this.loading = true;
    this.virtualInvoiceService.getItems().subscribe({
      next: (data) => {
        this.availableItems = data;
        this.filteredItems = [...this.availableItems];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingItems'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Load customers based on selected branch (if any)
   * @param branchNo Optional branch number to filter customers
   */
  loadCustomers(branchNo?: number): void {
    // If no branch selected, just initialize empty arrays
    if (!branchNo) {
      this.customers = [];
      this.filteredCustomers = [];
      return;
    }
    
    this.loading = true;
    this.virtualInvoiceService.getCustomers(branchNo).subscribe({
      next: (data) => {
        this.customers = data;
        this.filteredCustomers = [...this.customers];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingCustomers'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
        
        // Initialize empty arrays on error
        this.customers = [];
        this.filteredCustomers = [];
      }
    });
  }

  /**
   * Load tax types from regular invoice service
   */
  loadTaxTypes(): void {
    debugger;
    this.loading = true;
    this.invoiceService.getTaxTypes().subscribe({
      next: (taxTypes) => {
        this.taxTypes = taxTypes;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tax types:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingTaxTypes'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  loadInvoiceTypes() {
    this.loading = true;
    this.invoiceService.getPaymentMethods().subscribe({
      next: (types) => {
        this.InvoiceTypes = types.filter(x=>x.Type==this.taxTypeId);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading Invoice Types:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingInvoiceTypes'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Load available units
   */
  loadUnits(): void {
    this.loading = true;
    this.virtualInvoiceService.getUnits().subscribe({
      next: (data) => {
        this.availableUnits = data;
        this.filteredUnits = [...this.availableUnits];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.toastr.error(
          this.translate.instant('VirtualInvoicePage.ErrorLoadingUnits'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Handle branch selection
   */
  onBranchSelected(branch: VirtualBranchDto): void {
    this.selectedBranch = branch;
    if (branch && branch.BranchNo) {
      this.newRow.BranchNo = branch.BranchNo;
      this.loadCustomers(branch.BranchNo);
    }
  }

  /**
   * Handle customer selection
   */
  onCustomerSelected(customer: VirtualCustomerDto): void {
    this.selectedCustomer = customer;
    if (customer) {
      this.newRow.CustomerAccountNumber = customer.CustomerAccountNumber;
    }
  }

  /**
   * Handle item selection
   */

  /**
   * Filter branches list based on search term
   */
  filterBranches(): void {
    if (!this.branches) return;
    
    // Filter branches by branch number or name
    const term = this.branchSearchTerm.toLowerCase();
    this.branches = this.branches.filter(branch => 
      branch.BranchNo.toString().includes(term) || 
      branch.BranchNameArabic.toLowerCase().includes(term) ||
      (branch.BranchNameEnglish && branch.BranchNameEnglish.toLowerCase().includes(term))
    );
  }

  /**
   * Filter customers list based on search term
   */
  filterCustomers(): void {
    if (!this.customers) return;
    
    const term = this.customerSearchTerm.toLowerCase();
    this.filteredCustomers = this.customers.filter(customer =>
      customer.CustomerAccountName.toLowerCase().includes(term) ||
      customer.CustomerAccountNumber.toString().includes(term)
    );
  }

  /**
   * Filter items list based on search term
   */
  filterItems(): void {
    if (!this.availableItems) return;
    
    const term = this.itemSearchTerm.toLowerCase();
    this.filteredItems = this.availableItems.filter(item =>
      item.ItemArabicName.toLowerCase().includes(term) ||
      item.ItemNumber.toString().includes(term)
    );
  }

  /**
   * Filter units list based on search term
   */
  filterUnits(): void {
    if (!this.availableUnits) return;
    
    const term = this.unitSearchTerm.toLowerCase();
    this.filteredUnits = this.availableUnits.filter(unit =>
      unit.ArabicName.toLowerCase().includes(term) ||
      (unit.EnglishName && unit.EnglishName.toLowerCase().includes(term)) ||
      unit.UnitNumber.toString().includes(term)
    );
  }

  /**
   * Add selected item to invoice
   */
  addItem(): void {
    if (this.selectedItem) {

    if (this.newRow.Items.find(item => item.ItemNumber === this.selectedItem?.ItemNumber)) {
      this.toastr.warning(
        this.translate.instant('AddInvoicePage.TheItemHasAlreadyBeenEntered'),
        this.translate.instant('General.Warning')
      );
      return;
    }

      // Find default tax type by matching the item's tax rate
      let defaultTaxType = this.taxTypes.length > 0 ? this.taxTypes[0] : null;
      
      const newItem = {
        ItemNumber: this.selectedItem.ItemNumber,
        ItemName: this.selectedItem.ItemArabicName,
        UnitNumber: this.selectedItem.UnitNumber || 1,
        Price: 0, // User will input the price
        Quantity: 1,
        ItemDiscountAmount: 0, // Initialize discount amount to zero
        ItemTaxAmount: 0,
        ItemTotalPriceWithoutTax: 0,
        ItemTotalPriceAfterTax: 0,
        ItemTaxRate: defaultTaxType?.TaxPercentage || 0,
        TaxType: defaultTaxType?.TaxNumber || 0
      };
      
      this.newRow.Items.push(newItem);
      this.updateItem(this.newRow.Items.length - 1);
      this.selectedItem = null;
    } else {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectItem'),
        this.translate.instant('General.Warning')
      );
    }
  }


onTaxModeChange(newValue:string)
{
 let ItemSelected= newValue;
 console.log(ItemSelected);
 if(ItemSelected=="112"||ItemSelected=="122")  this.TaxMode=true; else this.TaxMode=false; 
 }

  /**
   * Remove item from invoice
   */
  removeItem(index: number): void {
    this.newRow.Items.splice(index, 1);
    this.calculateSummary();
  }


    /**
   * Remove item from invoice
   */
  ResetItems(): void {
    debugger;
    for (var i = this.newRow.Items.length; i >= 0; i--) {
     this.newRow.Items.splice(i, 1);  
}

    this.calculateSummary();
  }



  /**
   * Update calculations for a specific item
   */
  updateItem(index: number): void {
    const item = this.newRow.Items[index];
    this.calculateItemTotals(item);
    this.calculateSummary();
  }

  /**
   * Calculate totals for an item
   */
  calculateItemTotals(item: any): void {
    const priceBeforeTax = item.Quantity * item.Price;
    const discountedPrice = priceBeforeTax - (item.ItemDiscountAmount || 0);
    
    item.ItemDiscountedPrice = discountedPrice;
    
    if (this.includeTax) {
      // If tax is included, extract the tax from the discounted price
      item.ItemTotalPriceWithoutTax = discountedPrice / (1 + item.ItemTaxRate / 100);
      item.ItemTaxAmount = discountedPrice - item.ItemTotalPriceWithoutTax;
      item.ItemTotalPriceAfterTax = discountedPrice; // Total is the same as discounted price
    } else {
      // If tax is not included, add the tax to the discounted price
      item.ItemTotalPriceWithoutTax = discountedPrice;
      item.ItemTaxAmount = discountedPrice * (item.ItemTaxRate / 100);
      item.ItemTotalPriceAfterTax = discountedPrice + item.ItemTaxAmount; // Add tax to get total
    }
  }

  /**
   * Calculate summary totals for the entire invoice
   */
  calculateSummary(): void {
    // Calculate total discount across all items
    this.newRow.DiscountAmount = this.newRow.Items.reduce(
      (sum, item) => sum + (item.ItemDiscountAmount || 0),
      0
    );
    
    // Calculate subtotal (before tax)
    this.newRow.TotalWithoutTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item.ItemTotalPriceWithoutTax || 0),
      0
    );
    
    // Update tax calculations
    this.updateTax();
  }


    public onIncludeTaxChange(event: boolean) {
      debugger;

      this.Include = event;
    }
  /**
   * Update tax calculations
   */
  updateTax(): void {
    // Calculate total tax across all items
    this.newRow.TotalTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item.ItemTaxAmount || 0),
      0
    );
    
    // Calculate grand total (including tax)
    this.newRow.TotalWithTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item.ItemTotalPriceAfterTax || 0),
      0
    );
  }

  /**
   * When tax type changes for an item
   */
  onTaxTypeChange(index: number): void {
    const item = this.newRow.Items[index];
    const selectedTaxType = this.taxTypes.find(tax => tax.TaxNumber === item.TaxType);
    
    if (selectedTaxType) {
      item.ItemTaxRate = selectedTaxType.TaxPercentage;
      this.updateItem(index);
    }
  }

  /**
   * Handle date changes
   */
  onDateChange(): void {
    if (this.invoiceDate) {
      const selectedDate = new Date(this.invoiceDate);
      this.newRow.Date = this.datePipe.transform(selectedDate, 'dd/MM/yyyy');
    }
  }

  
  onItemSelected(item: VirtualItemDto): void {
    this.selectedItem=null;
    this.selectedItem = item;
  }
  
  save() {
    this.calculateSummary();
    
    // Validate required fields
    if (!this.selectedBranch) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectBranch'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    if (this.newRow.InvoiceType==0) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectInvoiceType'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    if (!this.selectedCustomer) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectCustomer'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    
    if (this.newRow.Items.length === 0) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseAddItems'),
        this.translate.instant('General.Warning')
      );
      return;
    }
  
    const selectedDate = new Date(this.invoiceDate);
    const customerAccountNumberAsString = this.selectedCustomer.CustomerAccountNumber.toString();
  
    const invoiceData = {
      MYear: selectedDate.getFullYear().toString(), // Use selected year
      Date: this.datePipe.transform(selectedDate, 'yyyy-MM-dd'), // Use selected date
      DeliveryManNumber: this.deliveryId,
      CustomerAccountNumber: customerAccountNumberAsString,
      CustomerAccountName: this.selectedCustomer.CustomerAccountName,
      DiscountAmount: this.newRow.DiscountAmount,
      TotalWithoutTax: this.newRow.TotalWithoutTax,
      CashPay: 0, // Default to 0 for virtual invoices
      Description: this.newRow.Description,
      TotalWithTax: this.newRow.TotalWithTax,
      TotalTax: this.newRow.TotalTax,
      PayMethod: 0, // Default payment method
      Cluse: this.newRow.InvoiceType,
      IncludeTAX: this.includeTax ? 1 : 0,
      Sign: this.newRow.Sign,
      Items: this.newRow.Items.map(item => ({
        ItemNumber: item.ItemNumber,
        Quantity: item.Quantity.toString(),
        ItemPrice: item.Price.toString(),
        StoreNumber: "1", // Default store for virtual invoices
        SalesAccountNumber: '609', // Hard Coded value
        ItemDiscountAmount: item.ItemDiscountAmount || 0,
        ItemTaxRate: item.ItemTaxRate || 0,
        UnitNumber: item.UnitNumber || 1, // Default unit number
        ItemTaxAmount: item.ItemTaxAmount || 0,
        ItemDiscountPercentage: item.ItemDiscountAmount && item.Price > 0 ? 
          (item.ItemDiscountAmount / (item.Quantity * item.Price)) * 100 : 0,
        ItemTotalPriceWithoutTax: item.ItemTotalPriceWithoutTax || 0,
        TaxType: item.TaxType // Include TaxType in the payload
      })),
    };
    
    this.loading = true;
    this.virtualInvoiceService.addInvoice(invoiceData).subscribe({
      next: (result) => {
        if(result!=null&&this.isTransfer){this.transferInvoices(result.TransNo,invoiceData.MYear);}
        this.toastr.success(          
          this.translate.instant('VirtualInvoicePage.InvoiceCreatedSuccess', {
            transNumber: result.TransNo,            
            billNumber: ''
          }),
          this.translate.instant('General.Success')
        );
        
        // Reset the form to create a new invoice
        this.resetForm();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating invoice:', error);
        let errorMessage = this.translate.instant('VirtualInvoicePage.ErrorCreatingInvoice');
        this.toastr.error(
          errorMessage,
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  SaveQuotation()
  {
    this.calculateSummary();
    
    // Validate required fields
    if (!this.selectedBranch) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectBranch'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    if (!this.selectedCustomer) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectCustomer'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    if (this.newRow.Items.length === 0) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseAddItems'),
        this.translate.instant('General.Warning')
      );
      return;
    }
  
    const selectedDate = new Date(this.invoiceDate);
    const customerAccountNumberAsString = this.selectedCustomer.CustomerAccountNumber.toString();
  
    const quotationData = {
      MYear: selectedDate.getFullYear().toString(), // Use selected year
      Date: this.datePipe.transform(selectedDate, 'yyyy-MM-dd'), // Use selected date
      DeliveryManNumber: this.deliveryId,
      CustomerAccountNumber: customerAccountNumberAsString,
      CustomerAccountName: this.selectedCustomer.CustomerAccountName,
      CustomerPhoneNo: this.selectedCustomer.PhoneNo,
      CustomerTaxNo: this.selectedCustomer.TaxNo,
      DiscountAmount: this.newRow.DiscountAmount,
      TotalWithoutTax: this.newRow.TotalWithoutTax,
      CashPay: 0, // Default to 0 for virtual invoices
      Description: this.newRow.Description,
      TotalWithTax: this.newRow.TotalWithTax,
      TotalTax: this.newRow.TotalTax,
      PayMethod: 0, // Default payment method
      Cluse: this.newRow.InvoiceType,
      IncludeTAX: this.includeTax ? 1 : 0,
      Sign: false,
      Items: this.newRow.Items.map(item => ({
        ItemNumber: item.ItemNumber,
        Quantity: item.Quantity.toString(),
        ItemPrice: item.Price.toString(),
        StoreNumber: "1", // Default store for virtual invoices
        SalesAccountNumber: '609', // Hard Coded value
        ItemDiscountAmount: item.ItemDiscountAmount || 0,
        ItemTaxRate: item.ItemTaxRate || 0,
        UnitNumber: item.UnitNumber || 1, // Default unit number
        ItemTaxAmount: item.ItemTaxAmount || 0,
        ItemDiscountPercentage: item.ItemDiscountAmount && item.Price > 0 ? 
          (item.ItemDiscountAmount / (item.Quantity * item.Price)) * 100 : 0,
        ItemTotalPriceWithoutTax: item.ItemTotalPriceWithoutTax || 0,
        TaxType: item.TaxType // Include TaxType in the payload
      })),
    };
    
    this.loading = true;
    this.virtualInvoiceService.addQuotation(quotationData).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('VirtualInvoicePage.QuotationCreatedSuccess', {
            transNumber: '',
            billNumber: ''
          }),
          this.translate.instant('General.Success')
        );
        
        // Reset the form to create a new invoice
        this.resetForm();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating quotation:', error);
        let errorMessage = this.translate.instant('VirtualInvoicePage.ErrorCreatingQuotation');
        this.toastr.error(
          errorMessage,
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });

  }


  /**
   * Reset the form to initial state
   */
  resetForm(): void {
    this.newRow = {
      BranchNo: this.selectedBranch?.BranchNo || 0,
      Date: this.datePipe.transform(new Date(this.invoiceDate), 'dd/MM/yyyy'),
      CustomerAccountNumber: 0,
      Description: '',
      TotalWithoutTax: 0,
      TotalWithTax: 0,
      TotalTax: 0,
      DiscountAmount: 0,
      IncludeTAX: 0,
      Sign:false,
      InvoiceType: 0,
      Items: []
    };
    this.selectedCustomer = null;
    this.customerSearchTerm = '';
    this.selectedItem = null;
    this.itemSearchTerm = '';
    this.includeTax = false;
  }


    /**
   * Open modal to add new branch
   */
    openAddBranchModal(content: TemplateRef<any>, branch?: VirtualBranchDto): void {
      this.isEditingBranch = !!branch;
      
      if (this.isEditingBranch && branch) {
        // Editing mode - populate with existing branch data
        this.newBranch = {
          BranchNo: branch.BranchNo,
          BranchNameArabic: branch.BranchNameArabic,
          BranchNameEnglish: branch.BranchNameEnglish
        };
      } else {
        // Adding mode - initialize with empty data
        this.newBranch = {
          BranchNo: 0,
          BranchNameArabic: '',
          BranchNameEnglish: ''
        };
      }
      
      this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
    }
  
    /**
     * Save new branch
     */
    saveBranch(): void {
      if (!this.newBranch.BranchNameArabic) {
        this.toastr.warning(
          this.translate.instant('VirtualInvoicePage.FillRequiredFields'),
          this.translate.instant('General.Warning')
        );
        return;
      }
  
      this.loading = true;
      
      if (this.isEditingBranch) {
        // Update existing branch
        const updateData: VirtualUpdateBranchDto = {
          BranchNo: this.newBranch.BranchNo,
          ArabicName: this.newBranch.BranchNameArabic,
          EnglishName: this.newBranch.BranchNameEnglish
        };
        
        this.virtualInvoiceService.updateBranch(updateData).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success(
                this.translate.instant('VirtualInvoicePage.BranchUpdatedSuccess'),
                this.translate.instant('General.Success')
              );
              
              // Reload all branches to get updated data
              this.loadBranches();
              
              // Close the modal
              this.modalService.dismissAll();
            } else {
              this.toastr.error(
                response.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingBranch'),
                this.translate.instant('General.Error')
              );
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating branch:', error);
            this.toastr.error(
              error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingBranch'),
              this.translate.instant('General.Error')
            );
            this.loading = false;
          }
        });
      } else {
        // Add new branch
        this.virtualInvoiceService.addBranch(this.newBranch).subscribe({
          next: (response) => {
            if (response.success) {
              this.toastr.success(
                this.translate.instant('VirtualInvoicePage.BranchAddedSuccess'),
                this.translate.instant('General.Success')
              );
              
              // Reload all branches to get updated list including the new branch
              this.loadBranches();
              
              // Close the modal
              this.modalService.dismissAll();
            } else {
              this.toastr.error(
                response.message || this.translate.instant('VirtualInvoicePage.ErrorAddingBranch'),
                this.translate.instant('General.Error')
              );
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error adding branch:', error);
            this.toastr.error(
              error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorAddingBranch'),
              this.translate.instant('General.Error')
            );
            this.loading = false;
          }
        });
      }
    }

    

  /**
   * Open modal to add or edit customer
   */
  openAddCustomerModal(content: TemplateRef<any>, customer?: VirtualCustomerDto): void {
    if (!this.selectedBranch && !customer) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.SelectBranchFirst'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    this.isEditingCustomer = !!customer;
    
    if (this.isEditingCustomer && customer) {
      // Editing mode - populate with existing customer data
      this.newCustomer = {
        BranchNo: this.selectedBranch?.BranchNo || 0,
        CustomerNumber: customer.CustomerAccountNumber,
        CustomerName: customer.CustomerAccountName,
        TaxNo: customer.TaxNo || '',
        PhoneNo: customer.PhoneNo || ''
      };
    } else {
      // Adding mode - initialize with empty data
      this.newCustomer = {
        BranchNo: this.selectedBranch?.BranchNo || 0,
        CustomerNumber: 0,
        CustomerName: '',
        TaxNo: '',
        PhoneNo: ''
      };
    }
    
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
  }

  /**
   * Save or update customer
   */
  saveCustomer(): void {
    debugger;
    if (!this.newCustomer.CustomerName) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.FillRequiredFields'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.loading = true;
    
    if (this.isEditingCustomer) {
      // Update existing customer
      const updateData: VirtualUpdateCustomerDto = {
        BranchNo: this.newCustomer.BranchNo,
        CustomerNumber: this.newCustomer.CustomerNumber,
        NewName: this.newCustomer.CustomerName,
        NewTaxNo: this.newCustomer?.TaxNo,
        NewPhoneNo: this.newCustomer?.PhoneNo
      };
      
      this.virtualInvoiceService.updateCustomer(updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.CustomerUpdatedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all customers for the current branch
            this.loadCustomers(this.selectedBranch?.BranchNo);
            
            // Close the modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingCustomer'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating customer:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingCustomer'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    } else {
      // Add new customer (existing code)
      this.virtualInvoiceService.addCustomer(this.newCustomer).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.CustomerAddedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all customers for the current branch to include the new one
            this.loadCustomers(this.selectedBranch?.BranchNo);
            
            // Close the modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorAddingCustomer'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding customer:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorAddingCustomer'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    }
  }

  /**
   * Open modal to add or edit item
   */
  openAddItemModal(content: TemplateRef<any>, item?: VirtualItemDto): void {
    this.isEditingItem = !!item;
    
    if (this.isEditingItem && item) {
      // Editing mode - populate with existing item data
      this.newItem = {
        ItemNumber: item.ItemNumber,
        ItemName: item.ItemArabicName,
        UnitNumber: item.UnitNumber || 1,
        TaxNo: this.taxTypes.length > 0 ? this.taxTypes[0].TaxNumber : 0
      };
    } else {
      // Adding mode - initialize with empty data
      this.newItem = {
        ItemNumber: '',
        ItemName: '',
        UnitNumber: 1,
        TaxNo: this.taxTypes.length > 0 ? this.taxTypes[0].TaxNumber : 0
      };
    }
    
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
  }

  /**
   * Save or update item
   */
  saveItem(): void {
    if (!this.newItem.ItemName) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.FillRequiredFields'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.loading = true;
    
    if (this.isEditingItem) {
      // Update existing item
      const updateData: VirtualUpdateItemDto = {
        ItemNumber: this.newItem.ItemNumber,
        NewItemName: this.newItem.ItemName,
        NewUnitNumber: this.newItem.UnitNumber || 1,
        NewTaxNo: this.newItem.TaxNo
      };
      
      this.virtualInvoiceService.updateItem(updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.ItemUpdatedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all items
            this.loadItems();
            
            // Close the modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingItem'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating item:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingItem'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    } else {
      // Add new item (existing code)
      this.virtualInvoiceService.addItem(this.newItem).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.ItemAddedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all items to ensure we have the most current data
            this.loadItems();
            
            // Close the modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorAddingItem'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding item:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorAddingItem'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    }
  }

  /**
   * Open modal to add or edit unit
   */
  openAddUnitModal(content: TemplateRef<any>, unit?: VirtualUnitDto): void {
    this.isEditingUnit = !!unit;
    
    if (this.isEditingUnit && unit) {
      // Editing mode - populate with existing unit data
      this.newUnit = {
        UnitNumber: unit.UnitNumber,
        UnitArabicName: unit.ArabicName,
        UnitEnglishName: unit.EnglishName
      };
    } else {
      // Adding mode - initialize with empty data
      this.newUnit = {
        UnitNumber: 0,
        UnitArabicName: '',
        UnitEnglishName: ''
      };
    }
    
    // Open the unit modal
    this.modalService.open(content, { 
      ariaLabelledBy: 'modal-unit-title', 
      size: 'lg',
      backdrop: false,
      windowClass: 'secondary-modal'
    });
  }

  /**
   * Save or update unit
   */
  saveUnit(): void {
    if (!this.newUnit.UnitArabicName) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.FillRequiredFields'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.loading = true;
    
    if (this.isEditingUnit) {
      // Update existing unit
      const updateData: VirtualUpdateUnitDto = {
        UnitNumber: this.newUnit.UnitNumber,
        NewArabicName: this.newUnit.UnitArabicName,
        NewEnglishName: this.newUnit.UnitEnglishName
      };
      
      this.virtualInvoiceService.updateUnit(updateData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.UnitUpdatedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all units
            this.loadUnits();
            
            // Close the modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingUnit'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating unit:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorUpdatingUnit'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    } else {
      // Add new unit (existing code)
      this.virtualInvoiceService.addUnit(this.newUnit).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success(
              this.translate.instant('VirtualInvoicePage.UnitAddedSuccess'),
              this.translate.instant('General.Success')
            );
            
            // Reload all units to ensure we have the most current data
            this.loadUnits();
            
            // Store the unit number to select it after reload
            const newUnitNumber = this.newUnit.UnitNumber;
            
            // After reloading units, set the unit in the add item form
            setTimeout(() => {
              this.newItem.UnitNumber = newUnitNumber;
            }, 300);
            
            // Close only the unit modal
            this.modalService.dismissAll();
          } else {
            this.toastr.error(
              response.message || this.translate.instant('VirtualInvoicePage.ErrorAddingUnit'),
              this.translate.instant('General.Error')
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding unit:', error);
          this.toastr.error(
            error.error?.message || this.translate.instant('VirtualInvoicePage.ErrorAddingUnit'),
            this.translate.instant('General.Error')
          );
          this.loading = false;
        }
      });
    }
  }

  // Add this method to handle language changes for flatpickr
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

  /**
   * Helper method to find a unit by its number
   * @param unitNumber The unit number to find
   * @returns The found unit or undefined
   */
  findUnitByNumber(unitNumber: any): VirtualUnitDto | undefined {
    if (!this.availableUnits) return undefined;
    return this.availableUnits.find(unit => unit.UnitNumber === Number(unitNumber));
  }

AddSign()
{

}

  
  /**
   * Transfer selected invoices
   */
  transferInProgress: boolean = false;

  async transferInvoices(transactionNumber: string,financialYear: any): Promise<void> {
    debugger;
    
    // Set loading state to prevent multiple transfers
    this.transferInProgress = true;
    this.loading = true;
    try {
      // Track successful and failed transfers
      const successfulTransfers: string[] = [];
      const failedTransfers: string[] = [];
      
      // Process each selected invoice serially to prevent overwhelming the API
        try {
          // Step 1: Get invoice details
          console.log(`Fetching details for virtual transaction ${transactionNumber}`);

          // Find the financial year for this transaction number
          if (!transactionNumber) {
            console.error(`Virtual invoice data not found for transaction ${transactionNumber}`);
            failedTransfers.push(transactionNumber);
            return;
          }
          
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
         
      // Show success message with counts
      if (successfulTransfers.length > 0) {               
        this.toastr.success('VirtualTransferInvoicesPage.SuccessMessage');
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


}