import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';
/**
 * Interface for Transfer Invoice data returned from the API
 */
export interface TransferInvoiceData {
  serial_number: string;
  inv_number: number;
  inv_date: string;
  type_code: string;
  note: string;
  the_tax_number: string;
  the_global_tax_number: string;
  income_source_sequence: string;
  Client_Id: string;
  Secret_Key: string;
  the_company_name: string;
  zip_code: string;
  city_code: string;
  customer_name: string;
  customer_phone: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PayableAmount: number;
  items: TransferInvoiceItem[];
}

/**
 * Interface for Transfer Refund Invoice data returned from the API
 */
export interface TransferRefundInvoiceData {
  serial_number: number;
  inv_number: number;
  inv_date: string;
  type_code: string;
  note: string;
  zip_code: string;
  city_code: string;
  OriginalSerialNumber: string;
  OriginalInvNumber: string;
  original_total_amount: string;
  the_tax_number: string;
  the_global_tax_number: string;
  TheCompanyName: string;
  CustomerName: string;
  CustomerPhone: string;
  IncomeSourceSequence: string;
  ReturnReason: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PayableAmount: number;
  PrepaidAmount: number;
  items: TransferRefundInvoiceItem[];
  item_taxs: TransferRefundInvoiceTax[];
  Client_Id?: string;
  Secret_Key?: string;
}

/**
 * Interface for Transfer Refund Invoice Item data
 */
export interface TransferRefundInvoiceItem {
  return_id: string;
  return_unitCode: string;
  return_InvoicedQuantity: number;
  return_item_LineExtensionAmount: number;
  return_item_TaxAmount: number;
  return_item_RoundingAmount: number;
  return_item_tax_Percent: number;
  return_item_Name: string;
  return_item_PriceAmount: number;
  return_item_discount_Amount: number;
  return_item_tax_type: number;
}

/**
 * Interface for Transfer Refund Invoice Tax data
 */
export interface TransferRefundInvoiceTax {
  item_price_to_return: number;
  item_tax_to_return: number;
  item_tax_percent: number;
}

/**
 * Interface for Transfer Invoice payload to Fotara API
 * with Items as string
 */
export interface FotaraInvoicePayload {
  serial_number: string;
  inv_number: number;
  inv_date: string;
  type_code: string;
  note: string;
  the_tax_number: string;
  the_global_tax_number: string;
  income_source_sequence: string;
  the_company_name: string;
  zip_code: string;
  city_code: string;
  customer_name: string;
  customer_phone: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PayableAmount: number;
  items: string;
}

/**
 * Interface for Transfer Refund Invoice payload to Fotara API
 * with Items and item_taxs as strings
 */
export interface FotaraRefundInvoicePayload {
  inv_number: number;
  serial_number: number;
  inv_date: string;
  type_code: string;
  note: string;
  zip_code: string;
  city_code: string;
  OriginalSerialNumber: string;
  OriginalInvNumber: string;
  original_total_amount: string;
  the_tax_number: string;
  the_global_tax_number: string;
  TheCompanyName: string;
  CustomerName: string;
  CustomerPhone: string;
  IncomeSourceSequence: string;
  ReturnReason: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PayableAmount: string;
  PrepaidAmount: number;
  items: string;
  item_taxs: string;
}

/**
 * Interface for Transfer Invoice Item data
 */
export interface TransferInvoiceItem {
  id: number;
  InvoicedQuantity: number;
  item_PriceAmount: number;
  item_discount_Amount: number;
  item_Name: string;
  item_tax_Percent: number;
  item_TaxAmount: number;
  item_LineExtensionAmount: number;
  item_RoundingAmount: number;
  unitCode: string;
  item_tax_type: number;
}

/**
 * Interface for QR code update request
 */
export interface QrCodeUpdateRequest {
  TransNumber: string;
  QRCode: string;
}

/**
 * Interface for Refund QR code update request to match the C# DTO
 */
export interface RefundQrCodeUpdateRequest {
  RefundNumber: number;
  Bill: string;
  MyYear: number;
  QRCode: string;
}

/**
 * Interface for Fotara API response - Updated with the actual response format
 */
export interface FotaraApiResponse {
  status: string;
  message: string;
  qr_code: string;
  invoice: {
    EINV_RESULTS: {
      status: string;
      INFO: any[];
      WARNINGS: any[];
      ERRORS: any[];
    };
    EINV_STATUS: string;
    EINV_SINGED_INVOICE: string;
    EINV_QR: string;
    EINV_NUM: string;
    EINV_INV_UUID: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FotaraService {
  private apiUrl = environment.apiUrl;
  private fotaraApiUrl = environment.fotaraApiUrl;

  taxType: number = 1;
  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private authService: AuthService,
    private translate: TranslateService
  ) { }

  /**
   * Get transfer invoice data by transaction number and financial year
   * @param transactionNumber The transaction number to fetch data for
   * @param financialYear The financial year of the invoice
   * @returns Observable with transfer invoice data
   */
  getTransferInvoice(transactionNumber: string, financialYear: string): Observable<TransferInvoiceData> {
    // Convert parameters to integers as required by the API
    const transNo = parseInt(transactionNumber, 10);
    const myear = parseInt(financialYear, 10);

    // Validate parameters to avoid API errors
    if (isNaN(transNo) || isNaN(myear)) {
      const errorMessage = this.translate.instant('TransferInvoicesPage.InvalidParameters');
      this.toastr.error(errorMessage, this.translate.instant('General.Error'));
      return throwError(() => new Error(errorMessage));
    }

    return this.http.get<TransferInvoiceData>(
      `${this.apiUrl}/Invoice/transfer/${transNo}/${myear}`
    ).pipe(
      catchError(error => {
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        this.toastr.error(
          this.translate.instant('TransferInvoicesPage.InvoiceDetailsError'),
          this.translate.instant('General.Error')
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Get transfer refund invoice data by document number, bill number, and year
   * @param docNumber Document number
   * @param billNumber Bill number
   * @param year Financial year
   * @returns Observable with transfer refund invoice data
   */
  getTransferRefundInvoiceData(docNumber: string, billNumber: string, year: string): Observable<TransferRefundInvoiceData> {
    return this.http.get<TransferRefundInvoiceData>(
      `${this.apiUrl}/Invoice/GetTransferRefundInvoiceData?doc=${docNumber}&bill=${billNumber}&myear=${year}`
    ).pipe(
      catchError(this.handleError('Get transfer refund invoice data'))
    );
  }



  /**
   * Get transfer refund invoice data by document number, bill number, and year
   * @param docNumber Document number
   * @param billNumber Bill number
   * @param year Financial year
   * @returns Observable with transfer refund invoice data
   */
  getTransferVirtualRefundInvoiceData(docNumber: string, billNumber: string, year: string): Observable<TransferRefundInvoiceData> {
    return this.http.get<TransferRefundInvoiceData>(
      `${this.apiUrl}/VirtualInvoice/GetTransferRefundInvoiceData?doc=${docNumber}&bill=${billNumber}&myear=${year}`
    ).pipe(
      catchError(this.handleError('Get transfer refund invoice data'))
    );
  }

  /**
   * Send invoice data to Fotara API to generate QR code
   * @param invoiceData The invoice data to send
   * @returns Observable with the API response containing QR code
   */
  sendToFotaraApi(invoiceData: TransferInvoiceData): Observable<FotaraApiResponse> {
    debugger;


    // Validate that credentials exist in the invoice data
    if (!invoiceData.Client_Id || !invoiceData.Secret_Key) {
      const errorMessage = this.translate.instant('FotaraService.MissingCredentials');
      this.toastr.error(errorMessage, this.translate.instant('General.Error'));
      return throwError(() => new Error(errorMessage));
    }

    // Create headers with credentials from the invoice data
    const headers = new HttpHeaders({
      'ClientId': invoiceData.Client_Id,
      'SecretKey': invoiceData.Secret_Key,
      'Content-Type': 'application/json'
    });


    // Create a clean payload with Items encoded as string
    const cleanPayload = this.createCleanPayload(invoiceData);

    if (this.taxType == 2) {
      let numberValue: number = parseInt(invoiceData.serial_number);
      let stringValue: string = numberValue.toString();
      cleanPayload.serial_number = stringValue;
    }


    const user = this.authService.currentUserValue;
    if (user) {
      this.taxType = user?.TaxType;
    }
    const fotaraPath = this.taxType == 1 ? 'Invoice/sendInvoice' : 'Invoice/sendIncome';



    // Log the payload for debugging (remove in production)
    console.log('Sending payload to Fotara API:', cleanPayload);
    //return this.http.post<FotaraApiResponse>(`${this.fotaraApiUrl}/inv`, cleanPayload, { headers })
    return this.http.post<FotaraApiResponse>(`${this.fotaraApiUrl}/${fotaraPath}`, cleanPayload, { headers })
      .pipe(
        catchError(this.handleError('Send to Fotara API')),
        map(response => {
          // Check if API response indicates success
          if (response && response.status === 'success') {
            // Show success toast
            this.toastr.success(
              this.translate.instant('FotaraService.InvoiceSubmittedSuccessfully'),
              this.translate.instant('General.Success')
            );
          } else {
            // If response exists but status isn't success, it's an API error
            const errorMessage = response.message || this.translate.instant('FotaraService.UnknownError');
            this.toastr.error(errorMessage, this.translate.instant('General.Error'));
          }
          return response;
        })
      );


  }

  /**
   * Send refund invoice data to Fotara API to generate QR code
   * @param refundInvoiceData The refund invoice data to send
   * @returns Observable with the API response containing QR code
   */
  sendRefundToFotaraApi(refundInvoiceData: TransferRefundInvoiceData): Observable<FotaraApiResponse> {
    debugger;
    // Validate that credentials exist in the invoice data
    if (!refundInvoiceData.Client_Id || !refundInvoiceData.Secret_Key) {
      const errorMessage = this.translate.instant('FotaraService.MissingCredentials');
      this.toastr.error(errorMessage, this.translate.instant('General.Error'));
      return throwError(() => new Error(errorMessage));
    }

    // Create headers with credentials from the invoice data
    const headers = new HttpHeaders({
      'ClientId': refundInvoiceData.Client_Id,
      'SecretKey': refundInvoiceData.Secret_Key,
      'Content-Type': 'application/json'
    });

    const user = this.authService.currentUserValue;
    if (user) {
      this.taxType = user?.TaxType;
    }

    const fotaraPath = this.taxType == 1 ? 'Invoice/returnInvoice' : 'Invoice/returnIncome';

    refundInvoiceData.original_total_amount = refundInvoiceData.original_total_amount.toString();
    refundInvoiceData.zip_code = refundInvoiceData.zip_code || "";
    refundInvoiceData.city_code = refundInvoiceData.city_code || "";
    refundInvoiceData.CustomerName = refundInvoiceData.CustomerName || "";


    // Create a clean payload with Items and item_taxs encoded as strings
    const cleanPayload = this.createCleanRefundPayload(refundInvoiceData);

    if (this.taxType == 2) {
      let numberValue: number = refundInvoiceData.PayableAmount;
      let stringValue: string = numberValue.toString();
      cleanPayload.PayableAmount = stringValue;
    }

cleanPayload.CustomerName = "Test";
cleanPayload.city_code = "Amm";

    // Log the payload for debugging (remove in production)
    console.log('Sending refund payload to Fotara API:', cleanPayload);

    return this.http.post<FotaraApiResponse>(`${this.fotaraApiUrl}/${fotaraPath}`, cleanPayload, { headers })
      .pipe(
        catchError(this.handleError('Send refund to Fotara API')),
        map(response => {
          // Check if API response indicates success
          if (response && response.status === 'success') {
            // Show success toast
            this.toastr.success(
              this.translate.instant('FotaraService.RefundSubmittedSuccessfully'),
              this.translate.instant('General.Success')
            );
          } else {
            // If response exists but status isn't success, it's an API error
            const errorMessage = response.message || this.translate.instant('FotaraService.UnknownError');
            this.toastr.error(errorMessage, this.translate.instant('General.Error'));
          }
          return response;
        })
      );
  }

  /**
   * Create a clean payload without credentials and with Items as encoded string
   * @param invoiceData Original invoice data
   * @returns Clean payload without Client_Id and Secret_Key and with Items as string
   */
  private createCleanPayload(invoiceData: TransferInvoiceData): FotaraInvoicePayload {
    // First remove credentials using destructuring
    const { Client_Id, Secret_Key, items, ...basePayload } = invoiceData;

    // Create the final payload with Items encoded as string
    const cleanPayload: FotaraInvoicePayload = {
      ...basePayload,
      items: JSON.stringify(items), // Encode Items array as JSON string
    };


    return cleanPayload;
  }

  /**
   * Create a clean refund payload without credentials and with items and item_taxs as encoded strings
   * @param refundInvoiceData Original refund invoice data
   * @returns Clean payload without Client_Id and Secret_Key and with encoded arrays
   */
  private createCleanRefundPayload(refundInvoiceData: TransferRefundInvoiceData): FotaraRefundInvoicePayload {
    // First remove credentials using destructuring
    const { Client_Id, Secret_Key, items, item_taxs, ...basePayload } = refundInvoiceData;

    // Process the items to make sure each has the TaxableAmount field
    const processedItems = items.map(item => ({
      ...item,
      return_item_TaxableAmount: item.return_item_LineExtensionAmount  // Set TaxableAmount equal to LineExtensionAmount
    }));

    // Create the final payload with items and item_taxs encoded as strings
    const cleanPayload: FotaraRefundInvoicePayload = {
      ...basePayload,
      the_global_tax_number: refundInvoiceData.the_tax_number,
      PayableAmount: refundInvoiceData.PayableAmount.toString(),
      PrepaidAmount: parseInt(refundInvoiceData.original_total_amount), // Fixed: Set PrepaidAmount equal to original_total_amount
      items: JSON.stringify(processedItems), // Encode processed items array as JSON string
      item_taxs: JSON.stringify(item_taxs) // Encode item_taxs array as JSON string
    };

    return cleanPayload;
  }

  /**
   * Update QR code in the database
   * @param transNumber Transaction number
   * @param qrCode QR code data
   * @returns Observable with the API response
   */
  updateQrCode(transNumber: string, qrCode: string): Observable<any> {
    const request: QrCodeUpdateRequest = {
      TransNumber: transNumber,
      QRCode: qrCode
    };

    return this.http.post(`${this.apiUrl}/Invoice/update-qrcode`, request, { responseType: 'text' })
      .pipe(
        // Don't use catchError here as it's causing the double toast issue
        // Instead, handle errors in the transferSelectedInvoices method
        map(response => {
          console.log('QR code update response:', response);
          // If the response is a string with 'successfully', it's a success
          if (typeof response === 'string' && response.includes('successfully')) {
            return { success: true, message: response };
          }
          return { success: false, message: response };
        })
      );
  }

  /**
   * Update QR code in the database for refund invoice
   * @param docNumber Document number
   * @param billNumber Bill/invoice number
   * @param year Financial year
   * @param qrCode QR code data
   * @returns Observable with the API response
   */
  updateRefundQrCode(docNumber: string, billNumber: string, year: string, qrCode: string): Observable<any> {
    const request: RefundQrCodeUpdateRequest = {
      RefundNumber: parseInt(docNumber, 10),
      Bill: billNumber,
      MyYear: parseFloat(year),
      QRCode: qrCode
    };

    return this.http.post(`${this.apiUrl}/Invoice/update-refund-qrcode`, request, { responseType: 'text' })
      .pipe(
        map(response => {
          console.log('Refund QR code update response:', response);
          // If the response is a string with 'successfully', it's a success
          if (typeof response === 'string' && response.includes('successfully')) {
            return { success: true, message: response };
          }
          return { success: false, message: response };
        })
      );
  }



  /**
   * Update QR code in the database for refund invoice
   * @param docNumber Document number
   * @param billNumber Bill/invoice number
   * @param year Financial year
   * @param qrCode QR code data
   * @returns Observable with the API response
   */
  updateVirtualRefundQrCode(docNumber: string, billNumber: string, year: string, qrCode: string): Observable<any> {
    const request: RefundQrCodeUpdateRequest = {
      RefundNumber: parseInt(docNumber, 10),
      Bill: billNumber,
      MyYear: parseFloat(year),
      QRCode: qrCode
    };

    return this.http.post(`${this.apiUrl}/VirtualInvoice/update-refund-qrcode`, request, { responseType: 'text' })
      .pipe(
        map(response => {
          console.log('Refund QR code update response:', response);
          // If the response is a string with 'successfully', it's a success
          if (typeof response === 'string' && response.includes('successfully')) {
            return { success: true, message: response };
          }
          return { success: false, message: response };
        })
      );
  }

  /**
   * Handle HTTP errors and show user-friendly messages
   */
  private handleError(operation: string) {
    debugger;
    return (error: any): Observable<never> => {
      console.error(`${operation} failed:`, error);

      let errorMessage = this.translate.instant('General.OperationFailed', { operation });

      if (error.status === 0) {
        errorMessage = this.translate.instant('General.ConnectionError');
      } else if (error.status === 404) {
        errorMessage = this.translate.instant('General.NotFound');
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
   * Get transfer invoice data by transaction number and financial year
   * @param transactionNumber The transaction number to fetch data for
   * @param financialYear The financial year of the invoice
   * @returns Observable with transfer invoice data
   */
  getVirtualTransferInvoice(transactionNumber: string, financialYear: string): Observable<TransferInvoiceData> {
    // Convert parameters to integers as required by the API
    const transNo = parseInt(transactionNumber, 10);
    const myear = parseInt(financialYear, 10);

    // Validate parameters to avoid API errors
    if (isNaN(transNo) || isNaN(myear)) {
      const errorMessage = this.translate.instant('TransferInvoicesPage.InvalidParameters');
      this.toastr.error(errorMessage, this.translate.instant('General.Error'));
      return throwError(() => new Error(errorMessage));
    }

    return this.http.get<TransferInvoiceData>(
      `${this.apiUrl}/VirtualInvoice/GetTransferVirtualInvoiceData/${transNo}/${myear}`
    ).pipe(
      catchError(error => {
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error
        });
        this.toastr.error(
          this.translate.instant('TransferInvoicesPage.InvoiceDetailsError'),
          this.translate.instant('General.Error')
        );
        return throwError(() => error);
      })
    );
  }









}