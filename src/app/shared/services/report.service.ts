import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

// Customer interface
export interface Customer {
  CustomerAccountNumber: string;
  CustomerAccountName: string;
}

// Account Statement Request interface
export interface AccountStatementRequest {
  startDate: string;
  endDate: string;
  branch: number;
  accountNumberStart: number | string;
  accountNumberEnd: number | string;
}

// Account Statement Response interface
export interface AccountStatementResponse {
  DocumentNumber: string;
  Doctype: number;
  Date: string;
  AccountNumber: number;
  AccountName: string;
  CurrencyName: string;
  CurrencyRate: number;
  DocumentType: string;
  Description: string;
  Dept: number;
  Credit: number;
  Net: number;
  Year: number;
  Balance?: number;
  Trans_Num: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService,
    private authService: AuthService
  ) { }

  /**
   * Get company logo URL from server
   */
  getCompanyLogoUrl(): Observable<string> {
    return this.http.get(`${this.apiUrl}/Image`, { responseType: 'text' });
  }

  /**
   * Fetch company logo as base64 data URI for embedding in print/export
   */
  getCompanyLogoBase64(): Observable<string> {
    return new Observable<string>(obs => {
      this.http.get(`${this.apiUrl}/Image/file`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => { obs.next(reader.result as string); obs.complete(); };
          reader.onerror = () => { obs.next(''); obs.complete(); };
          reader.readAsDataURL(blob);
        },
        error: () => {
          fetch('/assets/images/brand-logos/desktop-logo.png')
            .then(r => r.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => { obs.next(reader.result as string); obs.complete(); };
              reader.readAsDataURL(blob);
            })
            .catch(() => { obs.next(''); obs.complete(); });
        }
      });
    });
  }

  /**
   * Get customers by delivery ID
   */
  getCustomers(deliveryId: number): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Accounts/GetCustomers/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }


  getVirtualCustomers(deliveryId: number): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Accounts/Virtual/GetCustomers/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }

  /**
   * Get account statement details
   */
  getAccountStatementDetails(request: AccountStatementRequest): Observable<AccountStatementResponse[]> {
    const formattedStartDate = formatDate(request.startDate, 'dd/MM/yyyy', 'en-US');
    const formattedEndDate = formatDate(request.endDate, 'dd/MM/yyyy', 'en-US');

    const params = new HttpParams()
      .set('startDate', formattedStartDate)
      .set('endDate', formattedEndDate)
      .set('branch', request.branch.toString())
      .set('accountNumberStart', request.accountNumberStart.toString())
      .set('accountNumberEnd', request.accountNumberEnd.toString());

    return this.http
      .get<AccountStatementResponse[]>(`${this.apiUrl}/Invoice/GetAccStatementDetails`, { params })
      .pipe(
        map((data) => this.calculateBalances(data)),
        catchError(this.handleError('Get account statement details'))
      );
  }

  /**
   * Calculate running balance
   */
  private calculateBalances(data: AccountStatementResponse[]): AccountStatementResponse[] {
    let runningBalance = 0;
    return data?.map((item) => {
      // Use Net value for balance calculation as specified in your code
      runningBalance += item.Net;
      return {
        ...item,
        Balance: runningBalance,
      };
    });
  }

  /**
   * Generate account statement report as PDF
   */
  AccountStatementReport(requestPayload: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/Report/AccountStatementReport`, requestPayload, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError('Generate account statement report'))
    );
  }


  /**
 * Generate account statement report as PDF
 */
  VirtualInvoicesReport(requestPayload: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/Report/InvoicesReport`, requestPayload, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError('Generate account statement report'))
    );
  }


  /**
* Generate account statement report as PDF
*/
  DeliveryNotesReport(params: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/Report/DeliveryNotesReport`, params, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError('Generate delivery notes report'))
    );
  }


  DeliveryNoteByIdReport(Id: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/Report/DeliveryNoteByIdReport`, Id, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError('Generate delivery note by Id report'))
    );
  }

  /**
* Generate account statement report as PDF
*/
  RefundsReport(requestPayload: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/Report/RefundsReport`, requestPayload, {
      responseType: 'blob',
    }).pipe(
      catchError(this.handleError('Generate account statement report'))
    );
  }


  /**
   * Generate invoice report as PDF
   */
  InvoiceReport(billNumber: string): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.apiUrl}/Report/GenerateInvoicePDF/${billNumber}`,
      {},
      {
        responseType: 'blob' as 'json',
      }
    ).pipe(
      catchError(this.handleError('Generate invoice report'))
    );
  }

  /**
   * Generate transferred invoice with QR code report as PDF
   */
  printTransferredInvoice(transactionNumber: string, invoiceNumber: string): Observable<Blob> {
    // Change from GET to POST method to match the server's requirements
    return this.http.post(
      `${this.apiUrl}/Report/GenerateTransferedInvoicePDF/${transactionNumber}/${invoiceNumber}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate transferred invoice report'))
    );
  }

  /**
   * Generate refund report as PDF
   * @param documentNumber The refund document number
   * @param invoiceNumber The original invoice number
   * @param year The financial year
   * @returns Observable with the PDF blob
   */
  GenerateTransferedRefundPDF(documentNumber: string, invoiceNumber: string, year: string): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.apiUrl}/Report/GenerateTransferedRefundPDF/${documentNumber}/${invoiceNumber}/${year}`,
      {}, // Empty body
      {
        responseType: 'blob' as 'json',
      }
    ).pipe(
      catchError(this.handleError('Generate refund report'))
    );
  }

  GenerateServiceTransferedRefundPDF(documentNumber: string, invoiceNumber: string, year: string): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.apiUrl}/Report/GenerateServiceTransferedRefundPDF/${documentNumber}/${invoiceNumber}/${year}`,
      {}, // Empty body
      {
        responseType: 'blob' as 'json',
      }
    ).pipe(
      catchError(this.handleError('Generate service refund report'))
    );
  }




  /**
   * Generate refund report as PDF
   * @param documentNumber The refund document number
   * @param invoiceNumber The original invoice number
   * @param year The financial year
   * @returns Observable with the PDF blob
   */
  GenerateTransferedVirtualRefundPDF(documentNumber: string, invoiceNumber: string, year: string): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.apiUrl}/Report/GenerateTransferedVirtualRefundPDF/${documentNumber}/${invoiceNumber}/${year}`,
      {}, // Empty body
      {
        responseType: 'blob' as 'json',
      }
    ).pipe(
      catchError(this.handleError('Generate refund report'))
    );
  }




  /**
   * Handle HTTP errors
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      let errorMessage = this.translate.instant('Reports.FailedOperation', { operation: operation.toLowerCase() });

      if (error.status === 0) {
        errorMessage = this.translate.instant('Reports.ConnectionError');
      } else if (error.status === 404) {
        errorMessage = this.translate.instant('Reports.ReportNotFound');
      } else if (error.error instanceof Blob) {
        // For blob errors, try to extract message
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorJson = JSON.parse(reader.result as string);
            this.toastr.error(
              errorJson.message || errorMessage,
              this.translate.instant('General.Error')
            );
          } catch {
            this.toastr.error(
              errorMessage,
              this.translate.instant('General.Error')
            );
          }
        };
        reader.readAsText(error.error);
        // Return early since we're handling the toastr in the async reader
        return throwError(() => new Error(errorMessage));
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }

      this.toastr.error(
        errorMessage,
        this.translate.instant('General.Error')
      );

      return throwError(() => new Error(errorMessage));
    };
  }



  /**
   * Generate invoice report as PDF
   */
  VirtualInvoiceReport(billNumber: string): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.apiUrl}/Report/GenerateVirtualInvoicePDF/${billNumber}`,
      {},
      {
        responseType: 'blob' as 'json',
      }
    ).pipe(
      catchError(this.handleError('Generate invoice report'))
    );
  }


  /**
   * Generate transferred invoice with QR code report as PDF
   */
  printTransferredVirtualInvoice(transactionNumber: string, invoiceNumber: string): Observable<Blob> {
    // Change from GET to POST method to match the server's requirements
    return this.http.post(
      `${this.apiUrl}/Report/GenerateTransferedVirtualInvoicePDF/${transactionNumber}/${invoiceNumber}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate transferred invoice report'))
    );
  }


  /**
  * Generate transferred invoice with QR code report as PDF
  */
  printQuotation(transactionNumber: string, invoiceNumber: string): Observable<Blob> {
    // Change from GET to POST method to match the server's requirements
    return this.http.post(
      `${this.apiUrl}/Report/GenerateQuotationPDF/${transactionNumber}/${invoiceNumber}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate quotation report'))
    );
  }

  VirtualprintQuotation(transactionNumber: string, invoiceNumber: string): Observable<Blob> {
    // Change from GET to POST method to match the server's requirements
    return this.http.post(
      `${this.apiUrl}/Report/VirtualGenerateQuotationPDF/${transactionNumber}/${invoiceNumber}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate quotation report'))
    );
  }





  /**
   * Generate PDF for a transferred service invoice
   * @param transNumber Transaction number
   * @param billNumber Invoice number (optional)
   * @returns Observable of PDF as Blob
   */
  generateTransferredServiceInvoicePDF(transNumber: string, billNumber?: string): Observable<Blob> {

    return this.http.post(
      `${this.apiUrl}/Report/GenerateTransferedServiceInvoicePDF/${transNumber}/${billNumber || transNumber}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate transferred invoice report'))
    );
  }

  /**
   * Get transfer invoice data by transaction number and financial year
   * @param transNo Transaction number
   * @param myear Financial year
   * @returns Observable of transfer invoice data
   */
  generateDetailsReceiptVoucherPDF(transNo: number, systemType: number): Observable<Blob> {
    return this.http.post(
      `${this.apiUrl}/Report/GenerateReceiptVoucherPDF/${transNo}/${systemType}`,
      {}, // Empty body
      {
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError('Generate receipt voucher report'))
    );
  }

  /**
   * Print a standardized report with company logo
   */
  printReport(title: string, cols: { label: string }[], rows: string): void {
    this.getCompanyLogoBase64().subscribe(logoBase64 => {
      const win = window.open('', '_blank');
      if (!win) return;

      const isRtl = this.translate.currentLang === 'ar';
      const direction = isRtl ? 'rtl' : 'ltr';
      const textAlign = isRtl ? 'right' : 'left';
      const now = new Date();
      const createdAt = isRtl
        ? `${now.toLocaleDateString('ar-EG')} \u00A0 \u00A0 ${now.toLocaleTimeString('ar-EG')}`
        : now.toLocaleString('en-US');
      const createdBy = this.authService.currentUserValue?.DeliveryName || 'User';
      const createdByLabel = this.translate.instant('Reports.CreatedBy');
      const createdAtLabel = this.translate.instant('Reports.CreatedAt');
      const companyName = this.authService.currentUserValue?.DeliveryName || 'ErpLite';

      win.document.write(`
        <!DOCTYPE html>
        <html dir="${direction}">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${direction}; padding: 30px; margin: 0; color: #334155; }
            .print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
            .header-left { display: flex; align-items: center; }
            .print-header img { height: 50px; width: auto; object-fit: contain; }
            .print-header .company-name { margin: 0 15px; font-size: 18px; font-weight: 700; color: #1e293b; }
            .print-header h2 { margin: 0; font-size: 20px; color: #1e293b; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: ${textAlign}; }
            th { background-color: #f1f5f9; font-weight: 600; color: #334155; text-transform: uppercase; font-size: 10px; letter-spacing: 0.025em; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .print-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 15px; }
              th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
              .print-footer { position: fixed; bottom: 0; width: 100%; left: 0; background: white; padding: 10px 20px; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="header-left">
              <img id="print-logo" src="${logoBase64 || ''}" alt="Logo" style="${!logoBase64 ? 'display:none' : ''}" />
              <span class="company-name">${companyName}</span>
            </div>
            <h2>${title}</h2>
          </div>
          <table>
            <thead>
              <tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="print-footer">
            <div><strong>${createdByLabel}:</strong> ${createdBy}</div>
            <div><strong>${createdAtLabel}:</strong> ${createdAt}</div>
          </div>
          <script>
            window.onload = () => {
              const img = document.getElementById('print-logo');
              const doPrint = () => {
                window.print();
                setTimeout(() => { window.close(); }, 500);
              };

              if (img && img.src && img.complete) {
                doPrint();
              } else if (img && img.src) {
                img.onload = doPrint;
                img.onerror = doPrint;
              } else {
                doPrint();
              }
            };
          </script>
        </body>
        </html>
      `);
      win.document.close();
    });
  }
}
