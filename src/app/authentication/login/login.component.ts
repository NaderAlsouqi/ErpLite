import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../shared/services/auth.service';
import { Renderer2 } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { firstValueFrom } from 'rxjs';
import { BiFotaraService } from "../../shared/services/bifotara.service";
import { InvoiceService } from '../../shared/services/invoice.service';
import { ServiceInvoiceService, ServiceInvoiceMainData } from '../../shared/services/service-invoice.service';
import { EventListenerFocusTrapInertStrategy } from '@angular/cdk/a11y';


interface VirtualInvoiceData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
}


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],

})



export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  showPassword = false;
  toggleClass = 'eye-off-line';
  active = 'Angular';
  loading = false;

  constructor(
    private renderer: Renderer2,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private fotaraService: BiFotaraService,
    private invoiceService: InvoiceService,
    private serviceInvoiceService: ServiceInvoiceService,

  ) {
    //this.renderer.setStyle(document.body, 'background', 'url("../../../assets/images/form-bg.png")');

  }

  ngOnInit(): void {
    //document.body.classList.add('authentication-background');

    this.loginForm = this.formBuilder.group({
      Login_Name: ['', [Validators.required]],
      Password: ['', [Validators.required]]
    });
  }

  ngOnDestroy(): void {
    //document.body.classList.remove('authentication-background');
  }

  onSubmit(): void {
    debugger;
    if (this.loginForm.invalid || this.loading) {
      return;
    }

    this.loading = true;
    const loginRequest = this.loginForm.value;

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        if (response.Token) {
          this.transferData();

          this.toastr.success('Login successful', 'Welcome!');

          // Get appropriate homepage based on user's role
          const homepage = this.authService.getHomepageByRole();

          // this.router.navigate([homepage]);   
          this.router.navigateByUrl(homepage)
        } else {
          this.toastr.error('Login failed');
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.toastr.error(error.error?.message || 'An error occurred during login');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }



  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.toggleClass = this.showPassword ? 'eye-line' : 'eye-off-line';
  }

  /**
  * Transfer selected invoices
  */
  transferData() {
    const user = this.authService.currentUserValue;
    if (user) {
      if ((user.SystemType == 1 && user.Roles.includes('SalesTransfer'))) {
        this.loadInvoices();
      }
      else if (user.SystemType == 3 && user.Roles.includes('ServiceTransfer')) {
        this.loadServiceInvoices();
      }
    }
  }


  // Keep track of selected transaction numbers
  selectedTransactionNumbers = new Set<string>();
  transferInProgress: boolean = false;
  originalData: VirtualInvoiceData[] = [];


  async transferInvoices(): Promise<void> {
    debugger;

    if (this.selectedTransactionNumbers.size === 0) {
      return;
    }

    // Set loading state to prevent multiple transfers
    this.transferInProgress = true;

    try {
      // Process each selected invoice serially to prevent overwhelming the API
      for (const transactionNumber of this.selectedTransactionNumbers) {
        try {
          // Step 1: Get invoice details
          console.log(`Fetching details for transaction ${transactionNumber}`);
          // Find the financial year for this transaction number
          const invoiceRow = this.originalData.find(row => row.TransactionNumber === transactionNumber);
          if (!invoiceRow) {
            console.error(`Invoice data not found for transaction ${transactionNumber}`);
            continue;
          }

          const financialYear = invoiceRow.FinancialYear;
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
              } else {
                console.error(`QR code update failed for transaction ${transactionNumber}:`, qrUpdateResponse);
                // If QR code update fails, still consider it a partial success but note the issue
              }
            } catch (qrUpdateError) {
              console.error(`Error updating QR code for transaction ${transactionNumber}:`, qrUpdateError);
              // If QR code update fails, still consider it a partial success but note the issue
            }
          } else {
            console.error(`No QR code or unsuccessful response for transaction ${transactionNumber}:`, fotaraResponse);
          }
        } catch (error) {
          console.error(`Error processing transaction ${transactionNumber}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in transfer process:', error);

    } finally {
      this.transferInProgress = false;
    }

  }


  /**
* Transfer selected invoices - now using TransactionNumber
*/
  async transferSelectedInvoices(): Promise<void> {
    if (this.selectedTransactionNumbers.size === 0) {
      return;
    }

    try {


      // Process each selected invoice serially to prevent overwhelming the API
      for (const transactionNumber of this.selectedTransactionNumbers) {
        try {
          // Step 1: Get invoice details
          console.log(`Fetching details for service transaction ${transactionNumber}`);
          // Find the financial year for this transaction number
          const invoiceRow = this.originalData.find(row => row.TransactionNumber === transactionNumber);
          if (!invoiceRow) {
            console.error(`Service invoice data not found for transaction ${transactionNumber}`);
            continue;
          }

          const financialYear = invoiceRow.FinancialYear;
          const invoiceData = await firstValueFrom(
            this.serviceInvoiceService.getTransferInvoiceData(Number(transactionNumber), Number(financialYear))
          );

          // Step 2: Send to Fotara API
          console.log(`Sending service transaction ${transactionNumber} to Fotara API`);
          const fotaraResponse = await firstValueFrom(this.fotaraService.sendToFotaraApi(invoiceData));

          // Step 3: Check response status and update QR code in database if successful
          if (fotaraResponse.status === 'success' && fotaraResponse.qr_code) {
            console.log(`Updating QR code for service transaction ${transactionNumber}`);
            try {
              const qrUpdateResponse = await firstValueFrom(
                this.serviceInvoiceService.updateQRCode({
                  TransNumber: transactionNumber,
                  QRCode: fotaraResponse.qr_code
                })
              );

              // Just log and add to successful transfers, no warnings ever
              console.log(`QR code update processed for virtual transaction ${transactionNumber}`, qrUpdateResponse);
              // No warnings at all, regardless of response
            } catch (qrUpdateError) {
              // Just log the error and continue, no warnings
              console.error(`Error updating QR code for virtual transaction ${transactionNumber}:`, qrUpdateError);

              // No warnings here either
            }
          } else {
            console.error(`No QR code or unsuccessful response for service transaction ${transactionNumber}:`, fotaraResponse);
          }
        } catch (error) {
          console.error(`Error processing service transaction ${transactionNumber}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in transfer process:', error);

    } finally {
      this.transferInProgress = false;
    }
  }




  /**
   * Load invoices data from service
   */
  private loadInvoices(): void {
    debugger;
    this.selectedTransactionNumbers.clear(); // Clear selections when loading new data

    this.invoiceService.GetUntransferredInvoicesMainData(0).subscribe({
      next: (data) => {
        const formattedData = data.map((invoice: any) => ({
          InvoiceDate: this.formatDate(invoice.InvoiceDate),
          InvoiceNumber: invoice.InvoiceNumber,
          TransactionNumber: invoice.TransactionNumber,
          CustomerName: invoice.CustomerName,
          FinancialYear: Math.floor(Number(invoice.FinancialYear)).toString(),
          InvoiceAmount: parseFloat(invoice.InvoiceAmount).toFixed(3),
        }));

        // Store all data
        this.originalData = [...formattedData];

        if (this.originalData.length > 0) {
          this.originalData.forEach(row => {
            this.selectedTransactionNumbers.add(row.TransactionNumber);
          });
        }

        this.transferInvoices();

      },
      error: (error) => {
        console.error('Error loading invoices:', error);
      }
    });
  }



  /**
   * Load invoices data from service
   */
  private loadServiceInvoices(): void {
    this.selectedTransactionNumbers.clear(); // Clear selections when loading new data
    this.serviceInvoiceService.getUntransferredInvoicesMainData(0).subscribe({
      next: (data) => {
        console.log('Service invoices data:', data);

        const formattedData = data.map((invoice: ServiceInvoiceMainData) => ({
          InvoiceDate: this.formatDate(invoice.InvoiceDate),
          InvoiceNumber: invoice.InvoiceNumber,
          TransactionNumber: invoice.TransactionNumber,
          CustomerName: invoice.CustomerName,
          FinancialYear: Math.floor(Number(invoice.FinancialYear)).toString(),
          InvoiceAmount: parseFloat(invoice.InvoiceAmount).toFixed(3),
        }));
        // Store all data
        this.originalData = [...formattedData];

        if (this.originalData.length > 0) {
          this.originalData.forEach(row => {
            this.selectedTransactionNumbers.add(row.TransactionNumber);
          });
        }

        this.transferSelectedInvoices();

      },
      error: (error) => {
        console.error('Error loading invoices:', error);
      }
    });
  }

  /**
* Format API date to yyyy-MM-dd
*/
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }


}