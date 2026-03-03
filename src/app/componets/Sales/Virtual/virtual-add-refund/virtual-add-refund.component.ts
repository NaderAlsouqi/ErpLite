import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { VirtualInvoiceService } from '../../../../shared/services/virtual-invoice.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";

@Component({
  selector: 'app-virtual-add-refund',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    SharedModule
  ],
  templateUrl: './virtual-add-refund.component.html',
  styleUrl: './virtual-add-refund.component.scss'
})
export class VirtualAddRefundComponent {
  // Form and data properties
  refundForm: FormGroup;
  invoiceNumber: string = '';
  invoiceDetails: any = null;
  returnQuantities: number[] = [];
  loading: boolean = false;
  submitting: boolean = false;

  constructor(
    private fb: FormBuilder,
    private virtualInvoiceService: VirtualInvoiceService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {
    this.refundForm = this.fb.group({
      invoiceNumber: ['', Validators.required],
    });
    this.resetForm();
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
      this.translate.instant('VirtualPaybackPage.FormReset'),
      this.translate.instant('General.Info')
    );
  }

  /**
   * Fetch invoice details by invoice number
   */
  getInvoiceDetails(): void {
    if (!this.invoiceNumber.trim()) {
      this.toastr.warning(
        this.translate.instant('VirtualPaybackPage.EnterInvoiceNumber'), 
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.loading = true;
    this.virtualInvoiceService.getInvoiceDetailsByBillNumber(this.invoiceNumber).subscribe({
      next: (response: any) => {
        this.invoiceDetails = response;
        this.returnQuantities = Array(this.invoiceDetails.Items.length).fill(0);
        this.loading = false;
        
        // Success notification for fetched invoice
        this.toastr.success(
          this.translate.instant('VirtualPaybackPage.InvoiceLoadSuccess', { 
            number: this.invoiceNumber,
            items: this.invoiceDetails.Items.length
          }),
          this.translate.instant('General.Success')
        );
      },
      error: (error) => {
        this.toastr.error(
          this.translate.instant('VirtualPaybackPage.ErrorFetchingInvoice'), 
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
      
      this.toastr.warning(
        this.translate.instant('VirtualPaybackPage.MaxQuantityExceeded', {
          max: maxQuantity
        }),
        this.translate.instant('General.Warning')
      );
    } else if (this.returnQuantities[index] < 0) {
      this.returnQuantities[index] = 0;
      
      this.toastr.warning(
        this.translate.instant('VirtualPaybackPage.NegativeQuantity'),
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
   * Calculate total refund amount including tax
   */
  calculateTotalRefund(): number {
    if (!this.invoiceDetails || !this.invoiceDetails.Items) {
      return 0;
    }
    
    return this.invoiceDetails.Items.reduce((total: number, item: any, index: number) => {
      const returnQty = this.returnQuantities[index] || 0;
      
      // Use the price with tax (unit price with tax = total price with tax / quantity)
      const unitPriceWithTax = item.ItemTotalPriceAfterTax / item.Quantity || 0;
      
      return total + (returnQty * unitPriceWithTax);
    }, 0);
  }

  /**
   * Process refund submission
   */
  submitPayback(): void {
    debugger;
    if (!this.isValidPayback()) {
      this.toastr.warning(
        this.translate.instant('VirtualPaybackPage.NoItemsSelected'), 
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.toastr.info(
      this.translate.instant('VirtualPaybackPage.ProcessingPayback'),
      this.translate.instant('General.Processing')
    );
    
    this.submitting = true;
    
    try {
      
      const originalArray = this.returnQuantities;
      const selectedItems:any=[];


      for (let i = 0; i < this.returnQuantities.length; i++) {
       
         if(originalArray[i] > 0) 
         {

        const item = this.invoiceDetails.Items[i]
      
        const returnQty = originalArray[i];
        const unitTax = (item.ItemTaxAmount || 0) / (item.Quantity || 1);
        const unitTotalWithTax = (item.ItemTotalPriceAfterTax || 0) / (item.Quantity || 1);

        const selectedItem ={
          ItemNumber: String(item.ItemNumber),
          ItemTaxRate: item.ItemTaxRate,
          ItemTotalTax: +(unitTax * returnQty).toFixed(6),
          ItemTotalWithTax: +(unitTotalWithTax * returnQty).toFixed(3),
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
          DeliveryManNumber: String(this.invoiceDetails.InvoiceHeader.DeliveryManNumber || '0'), 
          Cluse: String(this.invoiceDetails.InvoiceHeader.Cluse || '1'), 
          IncludeTax: !!this.invoiceDetails.InvoiceHeader.IncludeTAX,
          CashPay: 0,
          InvoiceTotalTax: this.calculateItemsTotalTax(selectedItems),
          Description: `مرتجع للفاتورة رقم ${this.invoiceNumber}`,
        },
        Items: selectedItems,
      };

      this.virtualInvoiceService.insertSalesInvoicePayback(paybackPayload).subscribe({
        next: (response) => {
          const totalRefundAmount = this.calculateTotalRefund().toFixed(3);
          this.toastr.success(
            this.translate.instant('VirtualPaybackPage.PaybackSuccessWithAmount', {
              amount: totalRefundAmount,
              invoice: this.invoiceNumber
            }), 
            this.translate.instant('General.Success')
          );
          this.resetForm();
          this.submitting = false;
        },
        error: (err) => {
          this.toastr.error(
            this.translate.instant('VirtualPaybackPage.PaybackError') + 
            (err.error?.message ? ': ' + err.error.message : ''), 
            this.translate.instant('General.Error')
          );
          this.submitting = false;
        },
      });
    } catch (error) {
      this.toastr.error(
        this.translate.instant('VirtualPaybackPage.SubmissionProcessError'),
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
        const unitTax = (item.ItemTotalTax / item.Quantity) || 0;
        return total + (unitTax * item.Quantity);
      }, 0);
    } catch (error) {
      this.toastr.error(
        this.translate.instant('VirtualPaybackPage.TaxCalculationError'),
        this.translate.instant('General.Error')
      );
      return 0;
    }
  }

    /**
   * Calculate total tax for selected items
   
  private calculateItemsTotalTax(items: any[]): any {
    try {
      return items.reduce((total, item) => {
        const itemTaxPerUnit = item.ItemTotalTax / (this.getOriginalQuantity(item.ItemNumber) || 1);
        return total + (itemTaxPerUnit * item.Quantity);
      },0);
    } catch (error) {
      // Notify about tax calculation error
      this.toastr.error(
        this.translate.instant('PaybackPage.TaxCalculationError'),
        this.translate.instant('General.Error')
      );
      return 0;
    }
  }
*/
  
  /**
   * Get original quantity for an item
   */
  private getOriginalQuantity(itemNumber: string): number {
    const item = this.invoiceDetails.Items.find((i: any) => i.ItemNumber === itemNumber);
    return item ? item.Quantity : 0;
  }
}