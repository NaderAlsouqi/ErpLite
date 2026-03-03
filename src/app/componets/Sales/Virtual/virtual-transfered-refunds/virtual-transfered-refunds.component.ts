import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from "../../../../shared/common/sharedmodule";
import { VirtualInvoiceService } from "../../../../shared/services/virtual-invoice.service";
import { AuthService } from "../../../../shared/services/auth.service";
import { ReportService } from "../../../../shared/services/report.service"; // Add this import

// Material Table imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent, MatPaginator } from '@angular/material/paginator';

interface RefundData {
  InvoiceDate: string;
  DocumentNumber: string;
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  TransactionNumber: string;
}

@Component({
  selector: 'app-virtual-transfered-refunds',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    FormsModule,
    SharedModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './virtual-transfered-refunds.component.html',
  styleUrl: './virtual-transfered-refunds.component.scss'
})
export class VirtualTransferedRefundsComponent implements OnInit {
  // Table configuration
  displayedColumns: string[] = [
    'RefundDate', 
    'RefundNumber', 
    'InvoiceNumber',
    'CustomerName', 
    'FinancialYear', 
    'RefundAmount',
    'actions'
  ];
  dataSource = new MatTableDataSource<RefundData>([]);
  
  // Pagination
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalItems: number = 0;
  
  // State
  loading: boolean = true;
  
  // User info
  deliveryId: number = 0;
  deliveryName: string | null = null;
  
  // Add a set to keep track of documents currently being printed
  printingDocuments = new Set<string>();
  
  constructor(
    private virtualInvoiceService: VirtualInvoiceService,
    private authService: AuthService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private router: Router,
    private reportService: ReportService // Add ReportService
  ) {}
  
  ngOnInit(): void {
    this.getUserInfo();
    this.loadRefunds();
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private getUserInfo(): void {
    const userInfo = this.authService.currentUserValue;
    if (userInfo) {
      this.deliveryId = userInfo.DeliveryID;
      this.deliveryName = userInfo.DeliveryName;
    } else {
      this.toastr.error(
        this.translate.instant('General.UserInfoNotFound'),
        this.translate.instant('General.Error')
      );
      this.router.navigate(['/dashboard']);
    }
  }

  loadRefunds(): void {
    debugger;
    if (this.deliveryId==null) {
      return;
    }
    
    this.loading = true;
    
    this.virtualInvoiceService.GetTransferredRefundsMainData(this.deliveryId).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.totalItems = data.length;
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translate.instant('VirtualRefundsPage.LoadError'),
          this.translate.instant('General.Error')
        );
        this.loading = false;
      }
    });
  }

  // Sorting and pagination
  onSortChange(sort: Sort): void {
    // Handle sorting logic
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  // Filtering
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Check if a document is currently being printed
  isPrinting(documentNumber: string): boolean {
    return this.printingDocuments.has(documentNumber);
  }
  
  // Generate PDF for a refund
  generateRefundPDF(refund: RefundData): void {
    if (this.isPrinting(refund.DocumentNumber)) {
      return;
    }
    
    this.printingDocuments.add(refund.DocumentNumber);
    
    this.reportService.GenerateTransferedVirtualRefundPDF(
      refund.DocumentNumber,
      refund.InvoiceNumber,
      refund.FinancialYear
    ).subscribe({
      next: (response) => {
        // Handle successful response - create a URL for the blob and open/download it
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Open PDF in a new tab
        window.open(url, '_blank');
        
        this.toastr.success(
          this.translate.instant('VirtualRefundsPage.PDFGeneratedSuccess'),
          this.translate.instant('General.Success')
        );
        
        this.printingDocuments.delete(refund.DocumentNumber);
      },
      error: (error) => {
        console.error('Error generating PDF:', error);
        this.toastr.error(
          this.translate.instant('VirtualRefundsPage.PDFGenerationError'),
          this.translate.instant('General.Error')
        );
        this.printingDocuments.delete(refund.DocumentNumber);
      }
    });
  }
}