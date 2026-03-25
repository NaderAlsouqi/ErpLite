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
 * Property names match C# TransferRefundInvoiceDto (snake_case as serialised by ASP.NET Core)
 */
export interface TransferRefundInvoiceData {
  serial_number: number;
  inv_number: string;
  inv_date: string;
  type_code: string;
  note: string;
  zip_code: string;
  city_code: string;
  original_serial_number: string;
  original_inv_number: string;
  original_total_amount: string;
  the_tax_number: string;
  the_global_tax_number: string;
  the_company_name: string;
  customer_name: string;
  customer_phone: string;
  income_source_sequence: string;
  return_reason: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PayableAmount: number;
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
  item_tax_type: number;
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
 * Field names match C# ReturnInvoiceRequest mixed casing
 */
export interface FotaraRefundInvoicePayload {
  inv_number: number;
  serial_number: number;
  inv_date: string;
  type_code: string;
  note: string;
  original_inv_number: string;
  original_serial_number: string;
  original_total_amount: string;
  the_tax_number: string;
  the_company_name: string;
  zip_code: string;
  city_code: string;
  CustomerName: string;
  customer_phone: string;
  income_source_sequence: string;
  return_reason: string;
  total_discount_amount: number;
  total_tax_amount: number;
  TaxExclusiveAmount: number;
  TaxInclusiveAmount: number;
  AllowanceTotalAmount: number;
  PrepaidAmount: number;
  PayableAmount: number;
  item_taxs: string;
  items: string;
  Test?: boolean;
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

    refundInvoiceData.original_total_amount = refundInvoiceData.original_total_amount?.toString() || '0';
    refundInvoiceData.zip_code = refundInvoiceData.zip_code || '';
    refundInvoiceData.city_code = refundInvoiceData.city_code || '';
    refundInvoiceData.customer_name = refundInvoiceData.customer_name || '';

    // Create a clean payload with Items and ItemTaxs encoded as strings
    const cleanPayload = this.createCleanRefundPayload(refundInvoiceData);

    if (this.taxType == 2) {
      cleanPayload.PayableAmount = parseFloat(refundInvoiceData.PayableAmount as any) || 0;
    }

    console.log('=== Fotara Refund Payload ===');
    console.table(cleanPayload);
    console.log('items (parsed):', JSON.parse(cleanPayload.items));
    console.log('item_taxs (parsed):', JSON.parse(cleanPayload.item_taxs));

    return this.http.post<FotaraApiResponse>(`${this.fotaraApiUrl}/${fotaraPath}`, cleanPayload, { headers })
      .pipe(
        catchError((error) => {
          console.error('Fotara API 400 error body:', error.error);
          console.error('Fotara API error status:', error.status);
          console.error('Full payload sent:', cleanPayload);
          return this.handleError('Send refund to Fotara API')(error);
        }),
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
    // Remove credentials using destructuring
    const { Client_Id, Secret_Key, items, item_taxs, ...basePayload } = refundInvoiceData;

    // Process items — return_item_discount_Amount is a percentage stored in DB
    // All monetary amounts are recalculated from PriceAmount × Qty × discount%
    const processedItems = items.map(item => {
      const priceAmount = parseFloat(item.return_item_PriceAmount as any) || 0;
      const qty = parseInt(item.return_InvoicedQuantity as any) || 1;
      const discountPercent = parseFloat(item.return_item_discount_Amount as any) || 0;
      const taxPercent = parseFloat(item.return_item_tax_Percent as any) || 0;

      const grossAmount = parseFloat((priceAmount * qty).toFixed(5));
      const discountAmount = parseFloat((grossAmount * discountPercent / 100).toFixed(5));
      const netAmount = parseFloat((grossAmount - discountAmount).toFixed(5));
      const taxAmount = parseFloat((netAmount * taxPercent / 100).toFixed(5));
      const roundingAmount = parseFloat((netAmount + taxAmount).toFixed(5));

      return {
        return_id: item.return_id?.toString() || '',
        return_unitCode: item.return_unitCode || 'PCE',
        return_InvoicedQuantity: qty,
        return_item_LineExtensionAmount: netAmount,
        return_item_TaxAmount: taxAmount,
        return_item_RoundingAmount: roundingAmount,
        return_item_tax_Percent: taxPercent,
        return_item_tax_type: parseInt(item.return_item_tax_type as any) || 0,
        return_item_Name: item.return_item_Name || item.return_id || '',
        return_item_PriceAmount: priceAmount,
        return_item_discount_Amount: discountAmount,
        return_item_TaxableAmount: netAmount
      };
    });

    // Compute all header totals from recalculated items
    // TaxExclusiveAmount = gross before discount (PriceAmount × Qty)
    const computedTaxExclusive = parseFloat(processedItems.reduce((sum, item) => sum + (item.return_item_PriceAmount * item.return_InvoicedQuantity), 0).toFixed(5));
    const computedNetAmount = parseFloat(processedItems.reduce((sum, item) => sum + item.return_item_LineExtensionAmount, 0).toFixed(5));
    const computedTaxAmount = parseFloat(processedItems.reduce((sum, item) => sum + item.return_item_TaxAmount, 0).toFixed(5));
    const computedTaxInclusive = parseFloat((computedNetAmount + computedTaxAmount).toFixed(5));
    const computedTotalDiscount = parseFloat(processedItems.reduce((sum, item) => sum + item.return_item_discount_Amount, 0).toFixed(5));

    const finalOriginalTotal = parseFloat(refundInvoiceData.original_total_amount as any) || computedTaxInclusive;

    // Process item_taxs — recalculate monetary amounts from recalculated items
    const processedItemTaxs = item_taxs.map(tax => {
      const taxType = parseInt((tax.item_tax_type ?? 0) as any);
      const matchingItems = processedItems.filter(item => item.return_item_tax_type === taxType);
      const priceToReturn = parseFloat(matchingItems.reduce((sum, item) => sum + item.return_item_LineExtensionAmount, 0).toFixed(5));
      const taxPercent = parseInt(tax.item_tax_percent as any) || 0;
      return {
        item_price_to_return: priceToReturn,
        item_tax_to_return: parseFloat((priceToReturn * taxPercent / 100).toFixed(5)),
        item_tax_percent: taxPercent,
        item_tax_type: taxType
      };
    });

    // Map fields matching C# ReturnInvoiceRequest exactly
    const cleanPayload: FotaraRefundInvoicePayload = {
      inv_number: parseInt(refundInvoiceData.inv_number as any, 10),
      serial_number: parseInt(refundInvoiceData.serial_number as any, 10),
      inv_date: refundInvoiceData.inv_date || '',
      type_code: (refundInvoiceData.type_code === '381' || !refundInvoiceData.type_code) ? '012' : refundInvoiceData.type_code,
      note: refundInvoiceData.note || '',
      original_inv_number: refundInvoiceData.original_inv_number?.toString() || '',
      original_serial_number: refundInvoiceData.original_serial_number || '',
      original_total_amount: finalOriginalTotal.toString(),
      the_tax_number: refundInvoiceData.the_tax_number || '',
      the_company_name: refundInvoiceData.the_company_name || '',
      zip_code: refundInvoiceData.zip_code || '',
      city_code: refundInvoiceData.city_code || '',
      CustomerName: refundInvoiceData.customer_name || '',
      customer_phone: refundInvoiceData.customer_phone || '',
      income_source_sequence: refundInvoiceData.income_source_sequence || '',
      return_reason: refundInvoiceData.return_reason || 'مرتجع',
      total_discount_amount: computedTotalDiscount,
      total_tax_amount: computedTaxAmount,
      TaxExclusiveAmount: computedTaxExclusive,
      TaxInclusiveAmount: computedTaxInclusive,
      AllowanceTotalAmount: computedTotalDiscount,
      PrepaidAmount: finalOriginalTotal,
      PayableAmount: computedTaxInclusive,
      item_taxs: JSON.stringify(processedItemTaxs),
      items: JSON.stringify(processedItems)
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