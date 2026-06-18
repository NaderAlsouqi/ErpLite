import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ServiceInvoiceService as InvoiceService } from '../../../../shared/services/service-invoice.service';
import { CompanySettingsService } from '../../../../shared/services/company-settings.service';
import { ServBillService, SaveServBillRequest } from '../../../../shared/services/serv-bill.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-service-service-add-refund',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    HasPermissionDirective
  ],
  templateUrl: './service-add-refund.component.html',
  styleUrl: './service-add-refund.component.scss'
})
export class ServiceAddRefundComponent {
  /** When embedded inside another page (refunds tabs), hide this component's page header. */
  @Input() embedded = false;
  /** Emitted after a refund is saved, so an embedding page can refresh its list. */
  @Output() saved = new EventEmitter<void>();

  // Form and data properties
  refundForm: FormGroup;
  invoiceNumber: string = '';
  invoiceDetails: any = null;
  returnQuantities: number[] = [];
  loading: boolean = false;
  submitting: boolean = false;

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private sbService: ServBillService,
    private authService: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private cs: CompanySettingsService
  ) {
    this.refundForm = this.fb.group({
      invoiceNumber: ['', Validators.required],
    });
  }

  /**
   * Reset form and all data
   */
  resetForm(): void {
    this.refundForm.reset();
    this.invoiceNumber = '';
    this.invoiceDetails = null;
    this.returnQuantities = [];

    // Add notification for form reset
    this.toastr.info(
      this.translate.instant('PaybackPage.FormReset'),
      this.translate.instant('General.Info')
    );
  }

  /**
   * Fetch invoice details by invoice number
   */
  getInvoiceDetails(): void {
    debugger;
    debugger;
    if (!this.invoiceNumber.trim()) {
      this.toastr.warning(
        this.translate.instant('PaybackPage.EnterInvoiceNumber'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.loading = true;
    this.invoiceService.GetServiceInvoiceDetailsByBillNumber(this.invoiceNumber).subscribe({
      next: (response: any) => {
        this.invoiceDetails = response;
        this.returnQuantities = this.invoiceDetails.Items.map((item: any) => item.Quantity);
        this.loading = false;

        // Success notification for fetched invoice
        this.toastr.success(
          this.translate.instant('PaybackPage.InvoiceLoadSuccess', {
            number: this.invoiceNumber,
            items: this.invoiceDetails.Items.length
          }),
          this.translate.instant('General.Success')
        );
      },
      error: (error: any) => {
        // Replace console.error with toastr
        this.toastr.error(
          this.translate.instant('PaybackPage.ErrorFetchingInvoice'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }




  /**
   * Ensure return quantities don't exceed available quantities
   */
  validateReturnQuantity(index: number, maxQuantity: number): void {
    const previousValue = this.returnQuantities[index];

    if (this.returnQuantities[index] > maxQuantity) {
      this.returnQuantities[index] = maxQuantity;

      // Notification for exceeding max quantity
      this.toastr.warning(
        this.translate.instant('PaybackPage.MaxQuantityExceeded', {
          max: maxQuantity
        }),
        this.translate.instant('General.Warning')
      );
    } else if (this.returnQuantities[index] < 0) {
      this.returnQuantities[index] = 0;

      // Notification for negative quantity
      this.toastr.warning(
        this.translate.instant('PaybackPage.NegativeQuantity'),
        this.translate.instant('General.Warning')
      );
    }
  }

  /**
   * Check if at least one item has a return quantity
   */
  isValidPayback(): boolean {
    return this.returnQuantities.some((quantity) => quantity > 0);
  }

  /**
   * Calculate total refund amount
   */
  calculateTotalRefund(): number {
    if (!this.invoiceDetails || !this.invoiceDetails.Items) {
      return 0;
    }

    return this.invoiceDetails.Items.reduce((total: number, item: any, index: number) => {
      const returnQty = this.returnQuantities[index] || 0;
      const itemPrice = item.ItemTotalPriceAfterTax / item.Quantity;
      return total + (returnQty * itemPrice);
    }, 0);
  }

  /**
   * Process refund submission
   */
  submitPayback(): void {
    debugger;
    if (!this.isValidPayback()) {
      this.toastr.warning(
        this.translate.instant('PaybackPage.NoItemsSelected'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    // Notification for processing
    this.toastr.info(
      this.translate.instant('PaybackPage.ProcessingPayback'),
      this.translate.instant('General.Processing')
    );

    this.submitting = true;



    try {

      /**
   const selectedItems = this.invoiceDetails.Items.filter(
     (item: any, index: number) => this.returnQuantities[index] > 0
   ).map((item: any, index: number) => ({
     ItemNumber: String(item.ItemNumber),
     ItemTaxRate: item.ItemTaxRate,
     ItemTotalTax: item.ItemTaxAmount,
     ItemTotalWithTax: item.ItemTotalPriceAfterTax,
     Quantity: this.returnQuantities[this.invoiceDetails.Items.indexOf(item)],
     ItemDiscount: item.ItemDiscount || 0,
     Price: item.ItemPrice,
     StoreNumber: String(item.StoreNumber || ''), 
     AccountNumber: String(item.AccountNumber || ''), 
     UnitNumber: String(item.UnitNumber || '1'), 
     TaxNo:item.TaxNo,
     UnitRate: item.UnitRate || 1,
   }));

    */
      const originalArray = this.returnQuantities;
      const selectedItems: any = [];


      for (let i = 0; i < this.returnQuantities.length; i++) {

        if (originalArray[i] > 0) {

          const item = this.invoiceDetails.Items[i]

          const returnQty = originalArray[i];
          const unitTax = (item.ItemTaxAmount || 0) / (item.Quantity || 1);
          const unitTotalWithTax = (item.ItemTotalPriceAfterTax || 0) / (item.Quantity || 1);

          const selectedItem = {
            ItemNumber: String(item.ItemNumber),
            ItemTaxRate: item.ItemTaxRate,
            ItemTotalTax: +(unitTax * returnQty).toFixed(6),
            ItemTotalWithTax: +(unitTotalWithTax * returnQty).toFixed(this.cs.billDecimals),
            Quantity: returnQty,
            ItemDiscount: item.ItemDiscount || 0,
            Price: item.ItemPrice,
            StoreNumber: String(item.StoreNumber || '1'),
            AccountNumber: String(item.AccountNumber || '1'),
            UnitNumber: String(item.UnitNumber || '1'),
            UnitRate: item.UnitRate || 1,
            TaxNo: item.TaxNo || 1,
          }

          selectedItems.push(selectedItem);
        }
      }


      const paybackPayload = {
        InvoiceHeader: {
          DocumentNumber: String(this.invoiceDetails.InvoiceHeader.SellerInvoiceNumber),
          BillNumber: String(this.invoiceNumber),
          DocumentDate: new Date().toISOString(),
          CustomerNumber: String(this.invoiceDetails.InvoiceHeader.CustomerAccountNumber),
          FinancialYear: new Date().getFullYear(),
          CustomerName: this.invoiceDetails.InvoiceHeader.CustomerName,
          DeliveryManNumber: String(this.invoiceDetails.InvoiceHeader.DeliveryManNumber || ''),
          Cluse: String(this.invoiceDetails.InvoiceHeader.Cluse || ''),
          IncludeTax: Boolean(this.invoiceDetails.InvoiceHeader.IncludeTAX) || false,
          TaxNo: 2,
          CashPay: 0,
          InvoiceTotalTax: this.calculateItemsTotalTax(selectedItems),
          Description: this.translate.instant('PaybackPage.RefundDescription') + String(this.invoiceNumber),
          //{ invoiceNumber:  String(this.invoiceNumber) }),
        },
        Items: selectedItems,
      };

      this.invoiceService.insertSalesInvoicePayback(paybackPayload).subscribe({
        next: () => {
          // Build SaveServBillRequest for GL posting in billf1_serv
          const total    = selectedItems.reduce((s: number, i: any) => s + i.Quantity * i.Price, 0);
          const taxAmt   = this.calculateItemsTotalTax(selectedItems);
          const dTotal   = total + taxAmt;
          const userName = this.authService.currentUserValue?.DeliveryName ?? '';

          const refundReq: SaveServBillRequest = {
            BillNo:      0,
            VType:       48,
            DocType:     45,
            MyYear:      new Date().getFullYear(),
            Date:        new Date().toISOString().substring(0, 10),
            CusNo:       parseInt(this.invoiceDetails.InvoiceHeader.CustomerAccountNumber) || 0,
            CusName:     this.invoiceDetails.InvoiceHeader.CustomerName ?? '',
            CurNo:       1,
            Rate:        1,
            Dis:         0,
            TaxNo:       this.invoiceDetails.InvoiceHeader.TaxNo || 0,
            TaxTypeNo:   String(this.invoiceDetails.InvoiceHeader.Cluse || ''),
            TaxPerc:     selectedItems[0]?.ItemTaxRate ?? 0,
            TaxAmt:      taxAmt,
            Total:       total,
            DTotal:      dTotal,
            BrNo:        1,
            CusAcc:      parseInt(this.invoiceDetails.InvoiceHeader.CustomerAccountNumber) || 0,
            TaxAcc:      0,
            UserName:    userName,
            CashPay:     0,
            CashAcc:     0,
            InvType:     0,
            SalNo:       parseInt(this.invoiceDetails.InvoiceHeader.DeliveryManNumber || '0') || 0,
            Des:         'مرتجع فاتورة رقم ' + this.invoiceNumber,
            CcntrNo:     '',
            PoNumber:    '',
            ContactP:    '',
            DelvTerm:    '',
            BankName:    '',
            BankAcc:     '',
            AccountName: '',
            IbanNumber:  '',
            SwiftNo:     '',
            Lines: selectedItems.map((i: any) => ({
              Des:   String(i.ItemNumber),
              Qty:   i.Quantity,
              Price: i.Price,
              AccNo: parseInt(i.AccountNumber) || 0,
            })),
          };

          this.sbService.saveRefund(refundReq).subscribe({
            next: () => {
              const totalRefundAmount = this.calculateTotalRefund().toFixed(this.cs.billDecimals);
              this.toastr.success(
                this.translate.instant('PaybackPage.PaybackSuccessWithAmount', {
                  amount: totalRefundAmount,
                  invoice: this.invoiceNumber
                }),
                this.translate.instant('General.Success')
              );
              this.resetForm();
              this.saved.emit();
              this.submitting = false;
            },
            error: () => { this.submitting = false; },
          });
        },
        error: (err) => {
          this.toastr.error(
            this.translate.instant('PaybackPage.PaybackError') +
            (err.error?.message ? ': ' + err.error.message : ''),
            this.translate.instant('General.Error')
          );
          this.submitting = false;
        },
      });
    } catch (error) {
      // Catch any errors in the submission process
      this.toastr.error(
        this.translate.instant('PaybackPage.SubmissionProcessError'),
        this.translate.instant('General.Error')
      );
      this.submitting = false;
    }
  }

  /**
   * Calculate total tax for selected items
   */
  private calculateItemsTotalTax(items: any[]): number {
    try {
      return items.reduce((total, item) => {
        const itemTaxPerUnit = item.ItemTotalTax / (this.getOriginalQuantity(item.ItemNumber) || 1);
        return total + (itemTaxPerUnit * item.Quantity);
      }, 0);
    } catch (error) {
      // Notify about tax calculation error
      this.toastr.error(
        this.translate.instant('PaybackPage.TaxCalculationError'),
        this.translate.instant('General.Error')
      );
      return 0;
    }
  }

  /**
   * Get original quantity for an item
   */
  private getOriginalQuantity(itemNumber: string): number {
    const item = this.invoiceDetails.Items.find((i: any) => i.ItemNumber === itemNumber);
    return item ? item.Quantity : 0;
  }
}


