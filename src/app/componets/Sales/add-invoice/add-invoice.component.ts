import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { InvoiceService, TaxTypeDto } from '../../../shared/services/invoice.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { firstValueFrom } from 'rxjs';

// Angular Material imports
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FotaraService } from "../../../shared/services/fotara.service";

@Component({
  selector: 'app-add-invoice',
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
    SharedModule
  ],
  providers: [DatePipe],
  templateUrl: './add-invoice.component.html',
  styleUrl: './add-invoice.component.scss'
})
export class AddInvoiceComponent implements OnInit {
  // Add tax types property
  taxTypes: TaxTypeDto[] = [];
  Quotation: boolean = false;

  

  deliveryId: number | null = 0;
  taxTypeId: number | null = null;
  deliveryName: string | null = null;

  
  availableItems: any[] = [];
  filteredItems: any[] = [];
  selectedItem: any = null;
  itemSearchTerm: string = '';
  customerSearchTerm: string = '';
  includeTax: boolean = false;
  Sign: boolean = false;
  isCash: boolean = false;
  isTransfer: boolean = false;

  customers: any[] = [];
  filteredCustomers: any[] = [];
  selectedCustomer: any = null;

  payMethods: any[] = [];
  loading = false;

  currentLang: string = 'ar'; // Default language

      newRow = {
    MYear: new Date().getFullYear().toString(),
    Date: this.datePipe.transform(new Date(), 'dd/MM/yyyy'),
    DeliveryManNumber: null as number | null,
    CustomerAccountNumber: '',
    CustomerAccountName: '',
    Description:'',
    DiscountAmount: 0,
    TotalWithoutTax: 0,
    CashPay: 0,
    TotalWithTax: 0,
    TotalTax: 0,
    PayMethod: 0,
    IncludeTAX: 0,
    Sign: false,
    IsCash: 0,
    Items: [] as Array<{
      ItemNumber: number;
      Stores?: any[];
      TaxType?: number; // Add TaxType property
      [key: string]: any;
    }>,
  };


  constructor(
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private datePipe: DatePipe,
    private toastr: ToastrService,
    private fotaraService: FotaraService,
    private translate: TranslateService
  ) {
    this.getQuotation();
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
        this.newRow.Description= '.ملاحظة : لا تعتبر هذه الفاتورة مدفوعة دون إيصال رسمي من الشركة ما لم تكن نقدية.  أنا الموقع ادناه استلمت البضاعة المذكورة أعلاه كاملة وسليمة وخالية من العيوب بالعدد والسعر المحددين واتعهد بدفع القيمة كاملة عند المطالبة دون انكار أو اشعار ويسقط حقي في توجيه اليمين.   المستلم هو العميل أو من ينوب عنه أو أحد موظفيه';

      }
  }


  ngOnInit(): void {
    this.setupUserData();
    this.newRow.Items = [];
    this.loadItems();
    this.loadCustomers(this.deliveryId);
    this.loadPayMethods();
    this.loadTaxTypes(); // Add this call to load tax types

    this.currentLang = this.translate.currentLang || 'ar'; // Set current language
  }



  // Add method to load tax types
  loadTaxTypes() {
    this.loading = true;
    this.invoiceService.getTaxTypes().subscribe({
      next: (taxTypes) => {
        this.taxTypes = taxTypes;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tax types:', error);
        this.toastr.error(
          this.translate.instant('AddInvoicePage.ErrorLoadingTaxTypes'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  private setupUserData(): void {

    const user = this.authService.currentUserValue;
    if (user) {
      this.deliveryId = user.DeliveryID;
      this.taxTypeId = user.TaxType;
      this.deliveryName = user.DeliveryName;
      //this.newRow.DeliveryManNumber = user.DeliveryID;


      this.isTransfer = user.Roles.includes('SalesTransfer');
    }    
  }

  loadItems() {
    this.loading = true;
    this.invoiceService.getItems().subscribe({
      next: (items) => {
        this.availableItems = items;
        this.filteredItems = [...this.availableItems];
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to fetch items!');
        this.loading = false;
      }
    });
  }

 loadCustomers(deliveryId: number | null) {  
    if (deliveryId==null) {
      return;
    }
    
    this.loading = true;
    this.invoiceService.getCustomers(deliveryId).subscribe({
      next: (customers) => {
        this.customers = customers;
        this.filteredCustomers = [...this.customers];
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to fetch customers!');
        this.loading = false;
      }
    });
  }


  loadPayMethods() {
    debugger;
    this.loading = true;
    this.invoiceService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.payMethods = methods.filter(x=>x.Type==this.taxTypeId);
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to fetch payment methods!');
        this.loading = false;
      }
    });
  }

  filterItems() {
    this.filteredItems = this.filterList(this.availableItems, this.itemSearchTerm);
  }

  filterCustomers() {
    this.filteredCustomers = this.filterCustomersList(this.customers, this.customerSearchTerm);
  }

  filterList(list: any[], term: string) {
    return list.filter((item) =>
      `${item.ItemNumber || ''} ${item.ItemArabicName || ''}`.toLowerCase().includes(term.toLowerCase())
    );
  }

  filterCustomersList(list: any[], term: string) {
    return list.filter((item) =>
      `${item.CustomerAccountNumber || ''} ${item.CustomerAccountName || ''}`.toLowerCase().includes(term.toLowerCase())
    );
  }

  onCustomerSelected(customer: any): void {
  this.selectedCustomer = customer;
    if (customer) {
      this.newRow.CustomerAccountNumber = customer.CustomerAccountNumber;
    }
  }

  onItemSelected(item: any): void {
    debugger;
    this.selectedItem=null;
    this.selectedItem = item;
    
    if (item?.ItemNumber) {
      this.loadItemDetails(item.ItemNumber);
    }
  }

  loadItemDetails(itemNumber: number): void {
    debugger;
    this.invoiceService.getStoresByItem(itemNumber).subscribe({
      next: (stores) => {
        if (this.selectedItem) {
          this.selectedItem.Stores = stores;
        }
      },
      error: (error) => {
        this.showError('Failed to fetch stores!');
      }
    });
  }

  loadStores(itemNumber: number, index: number) {
    this.invoiceService.getStoresByItem(itemNumber).subscribe({
      next: (stores) => {
        this.newRow.Items[index].Stores = stores;
      },
      error: (error) => {
        this.showError('Failed to load stores!');
      }
    });
  }


   ChangeItem  : any = null;
  updateItem(index: number) {
    const item = this.newRow.Items[index];
    this.ChangeItem = item;
  
    // Find the selected store if it exists
    const selectedStore = item.Stores?.find(
      (store) => store.StoreNumber === item['StoreNumber']
    );
  
    if (selectedStore && item['Quantity'] > selectedStore.Quantity) {
      this.showWarning(
        `Not enough stock in store (${selectedStore.StoreName}). Available: ${selectedStore.Quantity}`
      );
      item['Quantity'] = selectedStore.Quantity;
    }
  
    this.calculateItemTotals(item);
    this.calculateSummary();
    this.updateTax();
  }

  onStoreChange(index: number) {
    const item = this.newRow.Items[index];
    
    const selectedStore = item.Stores?.find(
      (store) => store.StoreNumber === item['StoreNumber']
    );

    if (selectedStore && item['Quantity'] > selectedStore.Quantity) {
      item['Quantity'] = selectedStore.Quantity;
      this.showWarning(
        `Quantity exceeds available stock in ${selectedStore.StoreName}. Adjusted to ${selectedStore.Quantity}`
      );
    }
  
    this.updateItem(index);
  }

  removeItem(index: number): void {
    this.newRow.Items.splice(index, 1);
    this.calculateSummary();
  }



  ResetItems(): void {
    debugger;
    for (var i = this.newRow.Items.length; i >= 0; i--) {
     this.newRow.Items.splice(i, 1);  
}

    this.calculateSummary();
  }

  updateTax(): void {
    debugger;
    // Calculate total tax across all items
    this.newRow.TotalTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item['ItemTaxAmount'] || 0),
      0
    );

    // Calculate grand total (including tax)
    this.newRow.TotalWithTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item['ItemTotalPriceAfterTax'] || 0),
      0
    );

   // if (this.ChangeItem)
   // {
   //  this.updateItem(this.ChangeItem);
   // }
  }

  addItem() {
    debugger;
    if (this.selectedItem) {
      // Find default tax type by matching the item's tax rate

    if (this.newRow.Items.find(item => item.ItemNumber === this.selectedItem.ItemNumber)) {
      this.toastr.warning(
        this.translate.instant('AddInvoicePage.TheItemHasAlreadyBeenEntered'),
        this.translate.instant('General.Warning')
      );
      return;
    }


      let defaultTaxType = null;
      
      if (this.selectedItem.ItemTaxRate !== undefined && this.selectedItem.ItemTaxRate !== null) {
        // Find tax type with matching percentage
        defaultTaxType = this.taxTypes.find(tax => 
          Math.abs(tax.TaxPercentage - this.selectedItem.ItemTaxRate) < 0.001
        );
      }
      
      // If no matching tax type is found, use the first one in the list as fallback
      if (!defaultTaxType && this.taxTypes.length > 0) {
        defaultTaxType = this.taxTypes[0];
      }
      
      const newItem= {
        ItemNumber: this.selectedItem.ItemNumber,
        ItemName: this.selectedItem.ItemArabicName,
        ItemPrice: this.selectedItem.SalePrice,
        Quantity: 1,
        ItemDiscountAmount: 0,
        ItemTaxAmount: 0,
        ItemTotalPriceWithoutTax: 0,
        ItemTotalPriceAfterTax: 0,
        ItemTaxRate: defaultTaxType?.TaxPercentage || 0,
        ItemDiscountedPrice: 0,
        StoreNumber: '',
        AccountNumber: '',
        UnitNumber: this.selectedItem.UnitNumber|| 1,
        UnitRate: 1,
        TaxType: defaultTaxType?.TaxNumber || 0 // Set tax type based on matched rate
      };

      this.newRow.Items.push(newItem);
      
      // Load store data for the new item
      if (this.selectedItem.ItemNumber) {
        this.loadStores(this.selectedItem.ItemNumber, this.newRow.Items.length - 1);
      }
      
      this.updateItem(this.newRow.Items.length - 1);
      this.selectedItem = null;
    } else {
      this.showWarning(this.translate.instant('AddInvoicePage.PleaseSelectItem'));
    }
  }

  calculateItemTotals(item: any) {
    debugger;
    const priceBeforeTax = item.Quantity * item.ItemPrice;
    const discountedPrice = this.includeTax ? priceBeforeTax : (priceBeforeTax - item.ItemDiscountAmount);

    item.ItemDiscountedPrice = discountedPrice;
    
    if (this.includeTax) {
      // If tax is included, we need to extract the tax from the discounted price
      item.ItemTotalPriceWithoutTax = discountedPrice / (1 + item.ItemTaxRate / 100);
      item.ItemTaxAmount = discountedPrice - item.ItemTotalPriceWithoutTax;
      item.ItemTotalPriceAfterTax = discountedPrice; // Total is the same as discounted price
    } else {
      // If tax is not included, we add the tax to the discounted price
      item.ItemTotalPriceWithoutTax = discountedPrice;
      item.ItemTaxAmount = discountedPrice * (item.ItemTaxRate / 100);
      item.ItemTotalPriceAfterTax = discountedPrice + item.ItemTaxAmount; // Add tax to get total
    }
  }

  calculateSummary() {
    debugger;
    if(!this.includeTax)
    {
      // Calculate total discount across all items
      this.newRow.DiscountAmount = this.newRow.Items.reduce(
      (sum, item) => sum + (item['ItemDiscountAmount'] || 0),
      0
      );
    }
 
    // Calculate subtotal (before tax)
    this.newRow.TotalWithoutTax = this.newRow.Items.reduce(
      (sum, item) => sum + (item['ItemTotalPriceWithoutTax'] || 0),
      0
    );
    
    // Update tax calculations
    this.updateTax();
  }

  onTaxTypeChange(index: number) {
    const item = this.newRow.Items[index];
    const selectedTaxType = this.taxTypes.find(tax => tax.TaxNumber === item.TaxType);
    
    if (selectedTaxType) {
      item['ItemTaxRate'] = selectedTaxType.TaxPercentage;
      this.updateItem(index);
    }
  }

  save() {
    debugger;
    this.calculateSummary();
  
    if (!this.selectedCustomer) {
      this.showWarning('Please select a customer!');
      return;
    }
  
    if (!this.selectedCustomer.CustomerAccountNumber) {
      this.showWarning('Please select a valid customer!');
      return;
    }

    if (this.newRow.CashPay==0) {
      this.toastr.warning(
        this.translate.instant('VirtualInvoicePage.PleaseSelectInvoiceType'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    if (this.newRow.Items.length === 0) {
      this.showWarning('Please add at least one item to the invoice!');
      return;
    }
  
    const customerAccountNumberAsString = this.selectedCustomer.CustomerAccountNumber.toString();
  
    const invoiceData = {
      MYear: this.newRow.MYear,
      Date: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DeliveryManNumber: this.deliveryId,
      CustomerAccountNumber: customerAccountNumberAsString,
      CustomerAccountName: this.selectedCustomer.CustomerAccountName,
      CustomerPhoneNo: this.selectedCustomer.PhoneNo,
      CustomerTaxNo: this.selectedCustomer.TaxNo,
      DiscountAmount: this.includeTax ? 0 : this.newRow.DiscountAmount,
      TotalWithoutTax: this.newRow.TotalWithoutTax,
      CashPay: this.newRow.PayMethod || 0,
      Description: this.newRow.Description,
      TotalWithTax: this.newRow.TotalWithTax,
      TotalTax: this.newRow.TotalTax,
      PayMethod: this.isCash ? 1 : 0,
      Cluse: this.newRow.CashPay,
      IncludeTAX: this.includeTax ? 1 : 0,
      Sign: this.newRow.Sign,
      Items: this.newRow.Items.map(item => ({
        ItemNumber: item.ItemNumber,
        Quantity: item['Quantity'],
        ItemPrice: item['ItemPrice'],
        StoreNumber: item['StoreNumber'] || 1,
        SalesAccountNumber: '609', // Hard Coded value
        ItemDiscountAmount: this.includeTax ? 0 : item['ItemDiscountAmount'],
        ItemTaxRate: item['ItemTaxRate'],
        UnitNumber: item['UnitNumber'],
        ItemTaxAmount: item['ItemTaxAmount'],
        ItemDiscountPercentage: this.includeTax ? 0 : (item['ItemDiscountAmount'] ? (item['ItemDiscountAmount'] / (item['Quantity'] * item['ItemPrice'])) * 100 : 0),
        ItemTotalPriceWithoutTax: item['ItemTotalPriceWithoutTax'],
        TaxType: item.TaxType // Include TaxType in the payload
      })),
    };
    
    this.loading = true;
    this.invoiceService.addInvoice(invoiceData).subscribe({
    next: (result) => {
        if(result!=null&&this.isTransfer){this.transferInvoices(result.TransNo,invoiceData.MYear);}
        this.showSuccess('Invoice added successfully!');
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to add invoice!');
        this.loading = false;
      }
    });
  }

  SaveQuotation()
  {
    debugger;
        this.calculateSummary();
  
    if (!this.selectedCustomer) {
      this.showWarning('Please select a customer!');
      return;
    }
  
    if (!this.selectedCustomer.CustomerAccountNumber) {
      this.showWarning('Please select a valid customer!');
      return;
    }

    if (this.newRow.Items.length === 0) {
      this.showWarning('Please add at least one item to the invoice!');
      return;
    }
  
    const customerAccountNumberAsString = this.selectedCustomer.CustomerAccountNumber.toString();
  
    const quotationData = {
      MYear: this.newRow.MYear,
      Date: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      DeliveryManNumber: this.deliveryId,
      CustomerAccountNumber: customerAccountNumberAsString,
      CustomerAccountName: this.selectedCustomer.CustomerAccountName,
      CustomerPhoneNo: this.selectedCustomer.PhoneNo || '',
      CustomerTaxNo: this.selectedCustomer.TaxNo || '',
      DiscountAmount: this.includeTax ? 0 : this.newRow.DiscountAmount,
      TotalWithoutTax: this.newRow.TotalWithoutTax,
      CashPay: this.newRow.PayMethod || 0,
      Description: this.newRow.Description,
      TotalWithTax: this.newRow.TotalWithTax,
      TotalTax: this.newRow.TotalTax,
      PayMethod: this.isCash ? 1 : 0,
      Cluse: this.newRow.CashPay,
      IncludeTAX: this.includeTax ? 1 : 0,
      Sign: false,
      Items: this.newRow.Items.map(item => ({
        ItemNumber: item.ItemNumber,
        Quantity: item['Quantity'],
        ItemPrice: item['ItemPrice'],
        StoreNumber: item['StoreNumber'] || 1,
        SalesAccountNumber: '609', // Hard Coded value
        ItemDiscountAmount: this.includeTax ? 0 : item['ItemDiscountAmount'],
        ItemTaxRate: item['ItemTaxRate'],
        UnitNumber: item['UnitNumber'],
        ItemTaxAmount: item['ItemTaxAmount'],
        ItemDiscountPercentage: this.includeTax ? 0 : (item['ItemDiscountAmount'] ? (item['ItemDiscountAmount'] / (item['Quantity'] * item['ItemPrice'])) * 100 : 0),
        ItemTotalPriceWithoutTax: item['ItemTotalPriceWithoutTax'],
        TaxType: item.TaxType // Include TaxType in the payload
      })),
    };
    
    this.loading = true;
    this.invoiceService.addQuotation(quotationData).subscribe({
      next: () => {
        this.showSuccess('Invoice added successfully!');
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to add invoice!');
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.newRow = {
      MYear: new Date().getFullYear().toString(),
      Date: this.datePipe.transform(new Date(), 'dd/MM/yyyy'),
      DeliveryManNumber: this.deliveryId,
      CustomerAccountNumber: '',
      CustomerAccountName: '',
      DiscountAmount: 0,
      TotalWithoutTax: 0,
      CashPay: 0,
      Description: '',
      TotalWithTax: 0,
      TotalTax: 0,
      PayMethod: 0,
      IncludeTAX: 0,
      Sign: false,
      IsCash: 0,
      Items: [],
    };
    this.selectedCustomer = null;
    this.customerSearchTerm = '';
    this.includeTax = false;
    this.isCash = false;
  }

  showWarning(message: string) {
    this.toastr.warning(message, 'Warning');
  }

  showSuccess(message: string) {
    this.toastr.success(message, 'Success');
  }

  showError(message: string) {
    this.toastr.error(message, 'Error');
  }

  AddSign()
  {

  }


    /**
     * Transfer selected invoices - now using TransactionNumber
     */
    transferInProgress: boolean = false;
    
    async transferInvoices(transactionNumber: string,financialYear: any): Promise<void> {
     
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
            console.log(`Fetching details for transaction ${transactionNumber}`);
            // Find the financial year for this transaction number            
            if (!transactionNumber) {
              console.error(`Invoice data not found for transaction ${transactionNumber}`);
              failedTransfers.push(transactionNumber);
              return;
            }
  
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

        
        // Show success message with counts
        if (successfulTransfers.length > 0) {          
            this.toastr.success('TransferInvoicesPage.SuccessMessage');
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


}
