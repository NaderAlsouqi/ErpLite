import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ServiceInvoiceService, ServiceInvoiceDetails } from '../../../../shared/services/service-invoice.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReportService } from '../../../../shared/services/report.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-service-invoice-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    SharedModule,
    MatTableModule,
    NgbModule
    ],
  templateUrl: './service-invoice-details.component.html',
  styleUrl: './service-invoice-details.component.scss'
})
export class ServiceInvoiceDetailsComponent implements OnInit {
  transactionNumber: string = '';
  invoiceDetails: ServiceInvoiceDetails | null = null;
  loading: boolean = true;
  qrCodeData: string = '';
  
  // Table configuration for items
  displayedColumns: string[] = ['ItemNumber', 'ItemName', 'Quantity', 'UnitPrice', 'TaxPercentage', 'TaxAmount', 'TotalPrice'];
  dataSource = new MatTableDataSource<any>([]);
  
  constructor(
    private route: ActivatedRoute,
    private serviceInvoiceService: ServiceInvoiceService,
    private reportService: ReportService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private location: Location
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      // Change 'id' to 'TransactionNumber' to match route definition
      this.transactionNumber = params['TransactionNumber'];
      if (this.transactionNumber) {
        this.loadInvoiceDetails(parseInt(this.transactionNumber, 10));
        this.loadQRCode(parseInt(this.transactionNumber, 10));
      } else {
        this.toastr.error(
          this.translate.instant('ServiceInvoiceDetailsPage.InvalidTransactionNumber'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }
  
  /**
   * Load invoice details data from service
   */
  private loadInvoiceDetails(transactionNumber: number): void {
    this.loading = true;
    
    this.serviceInvoiceService.getInvoiceDetails(transactionNumber).subscribe({
      next: (data) => {
        console.log('Service invoice details:', data);
        this.invoiceDetails = data;
        
        // Set items for the table
        if (data && data.Items) {
          this.dataSource.data = data.Items;
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading service invoice details:', error);
        this.toastr.error(
          this.translate.instant('ServiceInvoiceDetailsPage.LoadError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }
  
  /**
   * Load QR code data
   */
  private loadQRCode(transactionNumber: number): void {
    this.serviceInvoiceService.getQRCode(transactionNumber).subscribe({
      next: (data) => {
        if (data) {
          this.qrCodeData = data;
        }
      },
      error: (error) => {
        console.error('Error loading QR code:', error);
      }
    });
  }
  
  /**
   * Format date to local format
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  /**
 * Generate and open the invoice PDF in a new tab
 */
printInvoice(): void {
  debugger;
  if (!this.invoiceDetails || !this.transactionNumber) {
    this.toastr.error(
      this.translate.instant('ServiceInvoiceDetailsPage.PrintError'),
      this.translate.instant('General.Error')
    );
    return;
  }
  
  // Show loading toast
  const loadingToastRef = this.toastr.info(
    this.translate.instant('ServiceInvoiceDetailsPage.GeneratingPDF'),
    this.translate.instant('General.Processing'),
    { disableTimeOut: true }
  );
  
  // Get the invoice number from the invoice details
  const billNumber = this.invoiceDetails.InvoiceHeader?.InvoiceNumber || this.transactionNumber;
  
  this.reportService.generateTransferredServiceInvoicePDF(
    
    this.transactionNumber, 
    billNumber
  ).subscribe({
    next: (pdfBlob: Blob) => {
      // Close the loading toast
      this.toastr.clear(loadingToastRef.toastId);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Open the PDF in a new window/tab
      window.open(url, '_blank');

      // Optional: revoke the URL after some time to free memory
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      this.toastr.success(
        this.translate.instant('ServiceInvoiceDetailsPage.PDFGenerated'),
        this.translate.instant('General.Success')
      );
    },
    error: (error) => {
      // Close the loading toast
      this.toastr.clear(loadingToastRef.toastId);
      
      console.error('Error generating PDF:', error);
      this.toastr.error(
        this.translate.instant('ServiceInvoiceDetailsPage.PDFGenerationError'),
        this.translate.instant('General.Error')
      );
    }
  });
}

  
  /**
   * View QR code in modal
   */
  viewQRCode(qrModal: any): void {
    if (!this.qrCodeData) {
      this.toastr.warning(
        this.translate.instant('ServiceInvoiceDetailsPage.NoQRCode'),
        this.translate.instant('General.Warning')
      );
      return;
    }
    
    this.modalService.open(qrModal, { centered: true });
  }
  
  /**
   * Calculate subtotal
   */
  getSubtotal(): number {
    if (!this.invoiceDetails || !this.invoiceDetails.Items) return 0;
    
    return this.invoiceDetails.Items.reduce((sum, item) => sum + (item.ItemTotalAmount || 0), 0);
  }
  
  /**
   * Calculate total tax
   */
  getTotalTax(): number {
    if (!this.invoiceDetails || !this.invoiceDetails.Items) return 0;
    
    return this.invoiceDetails.Items.reduce((sum, item) => sum + (item.ItemTaxAmount || 0), 0);
  }
  
  /**
   * Calculate grand total
   */
  getGrandTotal(): number {
    return this.getSubtotal() + this.getTotalTax();
  }
  
  /**
   * Navigate back to the previous page
   */
  goBack(): void {
    this.location.back();
  }
}