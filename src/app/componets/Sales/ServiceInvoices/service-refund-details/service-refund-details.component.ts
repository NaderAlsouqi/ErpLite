import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ServiceInvoiceService as InvoiceService } from '../../../../shared/services/service-invoice.service';
import { ReportService } from '../../../../shared/services/report.service';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { FormsModule } from '@angular/forms';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';

interface RefundHeader {
  InvoiceDate: string;
  DocumentNumber: string;
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: number;
  TotalAmountWithoutTax: number;
  TotalAmountWithTax: number;
  TotalDiscount: number;
  TotalTax: number;
  FormattedDate?: string;
}

interface RefundItem {
  ItemNumber: string;
  ItemName: string;
  UnitCode: string;
  Quantity: number;
  UnitPrice: number;
  DiscountAmount: number;
  TaxAmount: number;
  TaxPercent: number;
  GrossAmount: number;
  NetAmount: number;
  TotalAmount: number;
}

@Component({
  selector: 'app-service-service-refund-details',
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
  providers: [DatePipe, ReportService, InvoiceService],
  templateUrl: './service-refund-details.component.html',
  styleUrl: './service-refund-details.component.scss'
})
export class ServiceRefundDetailsComponent implements OnInit {
  // Refund data
  refundHeader: RefundHeader = {} as RefundHeader;
  documentNumber: string = '';
  invoiceNumber: string = '';
  financialYear: string = '';
  loading: boolean = true;

  // Table data
  displayedColumns: string[] = ['ItemNumber', 'ItemName', 'UnitCode', 'Quantity', 'UnitPrice', 'DiscountAmount', 'TaxAmount', 'TaxPercent', 'GrossAmount', 'NetAmount', 'TotalAmount'];
  dataSource = new MatTableDataSource<RefundItem>([]);

  constructor(
    private route: ActivatedRoute,
    private invoiceService: InvoiceService,
    private translate: TranslateService,
    private reportService: ReportService,
    private location: Location,
    private toastr: ToastrService,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    // Get refund parameters from route params
    this.route.queryParams.subscribe(params => {
      this.documentNumber = params['doc'];
      this.invoiceNumber = params['bill'];
      this.financialYear = params['year'];

      if (this.documentNumber && this.invoiceNumber && this.financialYear) {
        this.loadRefundDetails(this.documentNumber, this.invoiceNumber, this.financialYear);
      } else {
        this.toastr.error(
          this.translate.instant('RefundDetailsPage.ParametersNotProvided'),
          this.translate.instant('General.Error')
        );
        this.goBack();
      }
    });

    // Subscribe to language changes to update translations
    this.translate.onLangChange.subscribe(() => {
      // Update translations if needed
    });
  }

  /**
   * Load refund details from the service
   * @param documentNumber The refund document number
   * @param invoiceNumber The original invoice number
   * @param year The financial year
   */
  private loadRefundDetails(documentNumber: string, invoiceNumber: string, year: string): void {
    this.loading = true;
    debugger;
    // Add method to invoice service
    this.invoiceService.getRefundDetails(documentNumber, invoiceNumber, year).subscribe({

      next: (data: any) => {
        if (data && data.Header) {
          this.refundHeader = data.Header;

          // Format the date if exists
          if (this.refundHeader.InvoiceDate) {
            this.refundHeader.FormattedDate = this.datePipe.transform(
              this.refundHeader.InvoiceDate, 'yyyy-MM-dd'
            ) ?? undefined;
          }

          // Format items for the table
          if (data.Items && Array.isArray(data.Items)) {
            const formattedItems = data.Items.map((item: RefundItem) => ({
              ItemNumber: item.ItemNumber,
              ItemName: item.ItemName,
              UnitCode: item.UnitCode,
              Quantity: item.Quantity,
              UnitPrice: item.UnitPrice.toFixed(6),
              DiscountAmount: item.DiscountAmount.toFixed(3),
              TaxAmount: item.TaxAmount.toFixed(6),
              TaxPercent: item.TaxPercent + '%',
              GrossAmount: item.GrossAmount.toFixed(3),
              NetAmount: item.NetAmount.toFixed(3),
              TotalAmount: item.TotalAmount.toFixed(3)
            }));

            this.dataSource.data = formattedItems;
          } else {
            this.dataSource.data = [];
          }
        } else {
          this.toastr.warning(
            this.translate.instant('RefundDetailsPage.NoRefundDataFound'),
            this.translate.instant('General.Warning')
          );
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading refund details:', error);
        this.toastr.error(
          this.translate.instant('RefundDetailsPage.FailedToLoadRefundDetails'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  /**
   * Print the refund as a PDF report
   */
  printRefund(): void {
    this.loading = true;

    this.reportService.GenerateServiceTransferedRefundPDF(this.documentNumber, this.invoiceNumber, this.financialYear).subscribe({
      next: (response: Blob) => {
        const blobResponse: Blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blobResponse);
        window.open(url);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error generating PDF:', err);
        this.toastr.error(
          this.translate.instant('RefundDetailsPage.FailedToGeneratePDF'),
          this.translate.instant('General.Error')
        );
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

