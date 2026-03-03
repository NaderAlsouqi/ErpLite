import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VirtualInvoiceService } from '../../../../shared/services/virtual-invoice.service'; 
import { ReportService } from '../../../../shared/services/report.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { FormsModule } from '@angular/forms';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-virtual-invoice-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    SharedModule,
    FormsModule,
    NgbAccordionModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule
  ],
  providers: [DatePipe, ReportService, VirtualInvoiceService],
  templateUrl: './virtual-invoice-details.component.html',
  styleUrl: './virtual-invoice-details.component.scss'
})
export class VirtualInvoiceDetailsComponent implements OnInit {
  // Invoice data
  invoiceHeader: any = {};
  TransactionNumber: string = '';
  loading: boolean = true;
  
  // Table data
  displayedColumns: string[] = ['ItemNumber', 'ItemName', 'Quantity', 'ItemPrice','Discount', 'ItemTotalPrice', 'ItemTaxRate', 'ItemTaxAmount', 'ItemTotalPriceAfterTax'];
  dataSource = new MatTableDataSource<any>([]);
  
  // UI state
  accordionActiveIds = ['invoice-header', 'invoice-items'];
  
  constructor(
    private route: ActivatedRoute,
    private virtualInvoiceService: VirtualInvoiceService,
    private translate: TranslateService,
    private reportService: ReportService,
    private location: Location,
    private toastr: ToastrService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    // Get invoice number from route params
    this.route.paramMap.subscribe(params => {
      const TransNumber = params.get('TransactionNumber');
      if (TransNumber) {
        this.TransactionNumber = TransNumber;
        this.loadInvoiceDetails(this.TransactionNumber);
      } else {
        this.toastr.error('Invoice number not provided');
        this.goBack();
      }
    });
    
    // Subscribe to language changes to update translations
    this.translate.onLangChange.subscribe(() => {
      // Update translations if needed
    });
  }

  /**
   * Load virtual invoice details from the service
   * @param TransactionNumber The invoice TransactionNumber to load details for
   */
  private loadInvoiceDetails(TransactionNumber: string): void {
    this.loading = true;
    
    this.virtualInvoiceService.getInvoiceDetails(TransactionNumber).subscribe({
      next: (data: any) => {
        this.invoiceHeader = data.InvoiceHeader;
        
        // Format the date if exists
        if (this.invoiceHeader.InvoiceDate) {
          this.invoiceHeader.FormattedDate = this.datePipe.transform(
            this.invoiceHeader.InvoiceDate, 'yyyy-MM-dd'
          );
        }
        
        // Format items for the table
        const formattedItems = data.Items.map((item: any) => ({
          ItemNumber: item.ItemNumber,
          ItemName: item.ItemName,
          Quantity: item.Quantity,
          Discount: item.Discount | 0,
          ItemPrice: item.ItemPrice.toFixed(3),
          ItemTotalPrice: item.ItemTotalPrice.toFixed(3),
          ItemTaxRate: item.ItemTaxRate + '%',
          ItemTaxAmount: item.ItemTaxAmount,
          ItemTotalPriceAfterTax: item.ItemTotalPriceAfterTax,
          //ItemTaxAmount: item.ItemTaxAmount.toFixed(3),
          //ItemTotalPriceAfterTax: item.ItemTotalPriceAfterTax.toFixed(3),

        }));
        
        this.dataSource.data = formattedItems;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading virtual invoice details:', error);
        this.toastr.error('Failed to load virtual invoice details', 'Error');
        this.loading = false;
      }
    });
  }

  /**
   * Print the virtual invoice as a PDF report
   */
  printInvoice(): void {
    this.loading = true;
    
    this.reportService.VirtualInvoiceReport(this.TransactionNumber).subscribe({
      next: (response: Blob) => {
        const blobResponse: Blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blobResponse);
        window.open(url);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error generating PDF:', err);
        this.toastr.error('Failed to generate virtual invoice PDF', 'Error');
        this.loading = false;
      },
    });
  }

  /**
   * Navigate back to previous page
   */
  goBack(): void {
    this.location.back();
  }
}