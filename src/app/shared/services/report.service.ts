import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { CompanySettingsService } from './company-settings.service';
import { ReportPrintSettingsService } from './report-print-settings.service';
import * as XLSX from 'xlsx';

/** Output format for a standardized report. */
export type ReportFormat = 'print' | 'excel' | 'word';

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
    private authService: AuthService,
    private companySettings: CompanySettingsService,
    private printSettings: ReportPrintSettingsService,
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
   * One-shot output format for the NEXT printReport() call. Lets a screen keep
   * its existing print method + printReport(...) call unchanged: the export
   * dropdown sets this immediately before invoking the print method, and
   * printReport consumes it (routing to Excel/Word) then resets to 'print'.
   */
  private _nextFormat: ReportFormat = 'print';
  setNextFormat(format: ReportFormat): void { this._nextFormat = format; }

  /**
   * Print a standardized report with company logo — or, if a one-shot format
   * was set via setNextFormat(), export the same content as Excel / Word.
   */
  printReport(title: string, cols: { label: string }[], rows: string, filtersHtml = '', footerHtml = '', inPlace = false): void {
    const fmt = this._nextFormat;
    this._nextFormat = 'print';
    if (fmt === 'excel') { this.exportExcel(title, cols, rows, filtersHtml, footerHtml); return; }
    if (fmt === 'word')  { this.exportWord(title, cols, rows, filtersHtml, footerHtml); return; }
    this.getCompanyLogoBase64().subscribe(logoBase64 => {
      // inPlace (workflow auto-print) renders into a hidden iframe in the current tab —
      // reliable and popup-blocker-free; otherwise a fresh print window is opened below.
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
      const companyName = isRtl
        ? (this.companySettings.companyName || this.companySettings.companyEName)
        : (this.companySettings.companyEName || this.companySettings.companyName);
      const address  = this.companySettings.address;
      const taxNum   = this.companySettings.taxNum;
      const tel      = this.companySettings.tel;

      // Company-wide print styling (colors, fonts, header content, page setup)
      const ps = this.printSettings.value;
      const showLogo = ps.ShowLogo && !!logoBase64;

      const html = `
        <!DOCTYPE html>
        <html dir="${direction}">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            @page { size: ${ps.Orientation || 'portrait'}; }
            body { font-family: ${ps.FontFamily}; direction: ${direction}; padding: ${ps.MarginPx}px; margin: 0; color: ${ps.BodyTextColor}; }
            .print-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; direction: ltr; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
            .header-left { text-align: left; }
            .header-center { text-align: ${ps.TitleAlign || 'center'}; }
            .header-right { display: flex; align-items: center; justify-content: flex-end; }
            .print-header img { height: 50px; width: auto; object-fit: contain; }
            .print-header h2 { margin: 0; font-size: ${ps.TitleFontSize}px; color: ${ps.TitleColor}; font-weight: 700; }
            .co-name { font-size: ${ps.HeaderFontSize}px; font-weight: 700; color: ${ps.TitleColor}; margin-bottom: 2px; }
            .co-detail { font-size: 11px; color: ${ps.BodyTextColor}; margin-top: 2px; }
            .custom-header { text-align: center; font-weight: 600; color: ${ps.TitleColor}; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: ${ps.BaseFontSize}px; margin-top: 10px; }
            th, td { border: 1px solid ${ps.BorderColor}; padding: 6px 10px; text-align: ${textAlign}; }
            thead tr { background-color: ${ps.HeaderBg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { font-weight: 600; color: ${ps.HeaderTextColor}; font-size: ${ps.BaseFontSize}px; }
            tbody tr:nth-child(even) { background-color: ${ps.ZebraColor}; }
            tbody tr:hover { background-color: #e9f0fd; }
            .print-filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 16px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; background: #f8fafc; font-size: 11px; }
            .print-filters .filter-item { display: flex; gap: 4px; }
            .print-filters .filter-label { font-weight: 600; color: #475569; white-space: nowrap; }
            .print-filters .filter-value { color: #1e293b; }
            .custom-footer { margin-top: 16px; text-align: center; font-size: 12px; color: ${ps.BodyTextColor}; }
            .print-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: ${Math.max(0, (ps.MarginPx || 30) - 15)}px; }
              thead tr { background-color: ${ps.HeaderBg} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-footer { position: fixed; bottom: 0; width: 100%; left: 0; background: white; padding: 10px 20px; }
            }
          </style>
        </head>
        <body>
          ${ps.CustomHeader ? `<div class="custom-header">${ps.CustomHeader}</div>` : ''}
          <div class="print-header">
            <div class="header-left">
              ${ps.ShowCompanyName ? `<div class="co-name">${companyName}</div>` : ''}
              ${ps.ShowAddress   && address ? `<div class="co-detail">${address}</div>` : ''}
              ${ps.ShowTaxNumber && taxNum  ? `<div class="co-detail">${isRtl ? 'الرقم الضريبي' : 'Tax No'}: ${taxNum}</div>` : ''}
              ${ps.ShowTel       && tel     ? `<div class="co-detail">${isRtl ? 'التليفون' : 'Tel'}: ${tel}</div>` : ''}
            </div>
            <div class="header-center">
              <h2>${title}</h2>
            </div>
            <div class="header-right">
              <img id="print-logo" src="${showLogo ? logoBase64 : ''}" alt="Logo" style="${!showLogo ? 'display:none' : ''}" />
            </div>
          </div>
          ${filtersHtml ? `<div class="print-filters">${filtersHtml}</div>` : ''}
          <table>
            <thead>
              <tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          ${footerHtml ? `<div style="margin-top:16px;border-top:2px solid #334155;padding-top:12px;font-size:12px;direction:${direction}">${footerHtml}</div>` : ''}
          ${ps.CustomFooter ? `<div class="custom-footer">${ps.CustomFooter}</div>` : ''}
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
      `;

      if (inPlace) {
        // Render into a hidden iframe; its inline script calls window.print() on load.
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);
        const idoc = iframe.contentWindow!.document;
        idoc.open(); idoc.write(html); idoc.close();
        setTimeout(() => iframe.remove(), 60000);
        return;
      }
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(html);
      win.document.close();
    });
  }

  /**
   * Dispatch a standardized report to the chosen output format.
   * Reuses the exact same (title, cols, rows, filters, footer) a screen
   * already builds for printing — so a screen only needs to pass the format.
   */
  output(format: ReportFormat, title: string, cols: { label: string }[], rows: string,
         filtersHtml = '', footerHtml = ''): void {
    if (format === 'excel')      this.exportExcel(title, cols, rows, filtersHtml, footerHtml);
    else if (format === 'word')  this.exportWord(title, cols, rows, filtersHtml, footerHtml);
    else                         this.printReport(title, cols, rows, filtersHtml, footerHtml);
  }

  /** Sanitize a report title for use as a file / sheet name. */
  private safeName(title: string): string {
    return (title || 'report').replace(/[\\/:*?"<>|\[\]]/g, ' ').replace(/\s+/g, '-').slice(0, 60) || 'report';
  }

  private stamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Export a standardized report to Excel (.xlsx) using the same cols/rows
   * the print path uses. The HTML rows are parsed into a real table and
   * converted via SheetJS, so totals/sub-rows carry over as cells.
   */
  exportExcel(title: string, cols: { label: string }[], rows: string,
              _filtersHtml = '', _footerHtml = ''): void {
    try {
      const tableHtml =
        `<table><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>` +
        `<tbody>${rows}</tbody></table>`;
      const holder = document.createElement('div');
      holder.style.display = 'none';
      holder.innerHTML = tableHtml;
      document.body.appendChild(holder);
      const table = holder.querySelector('table') as HTMLTableElement;
      const sheetName = this.safeName(title).replace(/-/g, ' ').slice(0, 31) || 'Report';
      const wb = XLSX.utils.table_to_book(table, { sheet: sheetName, raw: true });
      document.body.removeChild(holder);

      const ws = wb.Sheets[wb.SheetNames[0]];
      if (ws) {
        // Readable column widths (the default is too narrow for Arabic headers).
        (ws as any)['!cols'] = cols.map(c => ({ wch: Math.min(45, Math.max(14, ((c?.label || '').length) + 6)) }));
      }

      const fileName = `${this.safeName(title)}-${this.stamp()}.xlsx`;

      if (this.translate.currentLang === 'ar') {
        // SheetJS (community) does NOT write the RTL flag, so post-process the
        // .xlsx (a zip) and inject rightToLeft="1" — Arabic reports then read
        // right-to-left (first column on the right), matching the printout.
        const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        import('jszip')
          .then(m => {
            const JSZip: any = (m as any).default || m;
            return JSZip.loadAsync(data).then((zip: any) => {
              const tasks = Object.keys(zip.files)
                .filter(p => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
                .map(p => zip.file(p).async('string').then((s: string) => {
                  if (!s.includes('rightToLeft')) {
                    s = s.replace(/<sheetView /g, '<sheetView rightToLeft="1" ');
                  }
                  zip.file(p, s);
                }));
              return Promise.all(tasks).then(() => zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              }));
            });
          })
          .then((blob: Blob) => this.downloadBlob(blob, fileName))
          .catch(err => {
            console.error('RTL post-process failed; saving LTR', err);
            XLSX.writeFile(wb, fileName);
          });
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (e) {
      console.error('exportExcel failed', e);
      this.toastr.error(this.translate.instant('General.Error'));
    }
  }

  /**
   * Export a standardized report to Word (.doc). Word opens this HTML-based
   * document natively with the table, company header, filters and footer
   * preserved — same content as the printout, but as an editable file.
   */
  exportWord(title: string, cols: { label: string }[], rows: string,
             filtersHtml = '', footerHtml = ''): void {
    this.getCompanyLogoBase64().subscribe(logoBase64 => {
      const isRtl = this.translate.currentLang === 'ar';
      const direction = isRtl ? 'rtl' : 'ltr';
      const textAlign = isRtl ? 'right' : 'left';
      const now = new Date();
      const createdAt = isRtl
        ? `${now.toLocaleDateString('ar-EG')}   ${now.toLocaleTimeString('ar-EG')}`
        : now.toLocaleString('en-US');
      const createdBy = this.authService.currentUserValue?.DeliveryName || 'User';
      const createdByLabel = this.translate.instant('Reports.CreatedBy');
      const createdAtLabel = this.translate.instant('Reports.CreatedAt');
      const companyName = isRtl
        ? (this.companySettings.companyName || this.companySettings.companyEName)
        : (this.companySettings.companyEName || this.companySettings.companyName);
      const address = this.companySettings.address;
      const taxNum = this.companySettings.taxNum;
      const tel = this.companySettings.tel;

      const html = `
        <!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40" dir="${direction}">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: ${direction}; color: #334155; }
            .hdr { text-align: center; margin-bottom: 12px; }
            .co-name { font-size: 16px; font-weight: 700; }
            .co-detail { font-size: 11px; }
            h2 { font-size: 18px; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #9ec5fe; padding: 5px 8px; text-align: ${textAlign}; }
            thead tr { background-color: #cfe2ff; }
            th { color: #084298; }
            .flt { border: 1px solid #e2e8f0; padding: 8px; margin-bottom: 10px; font-size: 11px; background: #f8fafc; }
            .ftr { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b;
                   display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="hdr">
            ${logoBase64 ? `<img src="${logoBase64}" style="height:48px" /><br/>` : ''}
            <div class="co-name">${companyName || ''}</div>
            ${address ? `<div class="co-detail">${address}</div>` : ''}
            ${taxNum ? `<div class="co-detail">${isRtl ? 'الرقم الضريبي' : 'Tax No'}: ${taxNum}</div>` : ''}
            ${tel ? `<div class="co-detail">${isRtl ? 'التليفون' : 'Tel'}: ${tel}</div>` : ''}
            <h2>${title}</h2>
          </div>
          ${filtersHtml ? `<div class="flt">${filtersHtml}</div>` : ''}
          <table>
            <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${footerHtml ? `<div style="margin-top:14px;border-top:2px solid #334155;padding-top:10px;font-size:12px">${footerHtml}</div>` : ''}
          <div class="ftr">
            <div><strong>${createdByLabel}:</strong> ${createdBy}</div>
            <div><strong>${createdAtLabel}:</strong> ${createdAt}</div>
          </div>
        </body>
        </html>`;

      const base = `${this.safeName(title)}-${this.stamp()}`;
      // Real .docx via html-docx-js (lazy-loaded). Falls back to Word-HTML .doc.
      import('html-docx-js-typescript')
        .then(mod => mod.asBlob(html))
        .then(out => {
          const blob = (out instanceof Blob)
            ? out
            : new Blob([out as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          this.downloadBlob(blob, `${base}.docx`);
        })
        .catch(err => {
          console.error('docx export failed, falling back to .doc', err);
          this.downloadBlob(new Blob(['﻿', html], { type: 'application/msword' }), `${base}.doc`);
        });
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
