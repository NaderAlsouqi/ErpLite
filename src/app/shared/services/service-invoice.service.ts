import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Define interfaces for service invoice data
export interface ServiceInvoiceMainData {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
  IsTransferred: boolean;
}

export interface ServiceInvoiceHeader {
  TransactionNumber: number;
  InvoiceNumber: string;
  InvoiceDate: string;
  CustomerName: string;
  CustomerAccountNumber: string;
  FinancialYear: number;
  TotalAmount: number;
  IsTransferred: boolean;
  QRCode?: string;
  // Add additional fields as needed
}

export interface ServiceInvoiceItem {
  ItemNumber: string;
  ItemName: string;
  Quantity: number;
  ItemPrice: number;
  ItemTotalAmount: number;
  ItemTaxRate: number;
  ItemTaxAmount: number;
  // Add additional fields as needed
}

export interface ServiceInvoiceDetails {
  InvoiceHeader: ServiceInvoiceHeader;
  Items: ServiceInvoiceItem[];
}

export interface UpdateQRCodeDto {
  TransNumber: string;
  QRCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceInvoiceService {
  private apiUrl = `${environment.apiUrl}/ServiceInvoice`;

  constructor(private http: HttpClient) { }

  /**
   * Error handling helper method
   */
  private handleError(operation: string) {
    return (error: any) => {
      console.error(`${operation} failed:`, error);
      return throwError(() => error);
    };
  }

  /**
   * Get all service invoices for a delivery person
   * @param deliveryId ID of the delivery person
   * @returns Observable of service invoice data
   */
  getInvoicesMainData(deliveryId: number): Observable<ServiceInvoiceMainData[]> {
    return this.http.get<ServiceInvoiceMainData[]>(`${this.apiUrl}/GetInvoicesMainData/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get service invoices main data'))
      );
  }

  /**
   * Get all untransferred service invoices for a delivery person
   * @param deliveryId ID of the delivery person
   * @returns Observable of untransferred service invoice data
   */
  getUntransferredInvoicesMainData(deliveryId: number): Observable<ServiceInvoiceMainData[]> {
    return this.http.get<ServiceInvoiceMainData[]>(`${this.apiUrl}/GetUntransferredInvoicesMainData/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get untransferred service invoices'))
      );
  }

  /**
   * Get all transferred service invoices for a delivery person
   * @param deliveryId ID of the delivery person
   * @returns Observable of transferred service invoice data
   */
  getTransferredInvoicesMainData(deliveryId: number): Observable<ServiceInvoiceMainData[]> {
    return this.http.get<ServiceInvoiceMainData[]>(`${this.apiUrl}/GetTransferredInvoicesMainData/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get transferred service invoices'))
      );
  }

  /**
   * Get transfer invoice data by transaction number and financial year
   * @param transNo Transaction number
   * @param myear Financial year
   * @returns Observable of transfer invoice data
   */
  getTransferInvoiceData(transNo: number, myear: number): Observable<any> {
    debugger;
    return this.http.get<any>(`${this.apiUrl}/GetTransferInvoiceData/${transNo}/${myear}`)
      .pipe(
        catchError(this.handleError('Get transfer invoice data'))
      );
  }

  /**
   * Get invoice details by transaction number
   * @param transNo Transaction number
   * @returns Observable of invoice details
   */
  getInvoiceDetails(transNo: number): Observable<ServiceInvoiceDetails> {
    return this.http.get<ServiceInvoiceDetails>(`${this.apiUrl}/GetInvoiceDetails/${transNo}`)
      .pipe(
        catchError(this.handleError('Get service invoice details'))
      );
  }

  /**
   * Update QR code for a service invoice
   * @param updateQRCodeDto The update data with transaction number and QR code
   * @returns Observable of operation result
   */
  updateQRCode(updateQRCodeDto: UpdateQRCodeDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/UpdateQRCode`, updateQRCodeDto)
      .pipe(
        catchError(this.handleError('Update QR code'))
      );
  }

  /**
   * Get QR code for a service invoice
   * @param transNo Transaction number
   * @returns Observable of QR code data
   */
  getQRCode(transNo: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/GetQRCode/${transNo}`)
      .pipe(
        catchError(this.handleError('Get QR code'))
      );
  }

  // Delete a service invoice that hasn't been transferred
  deleteInvoice(transactionNumber: number, financialYear: number): Observable<any> {
    const deleteInvoiceDto = {
      TransactionNumber: transactionNumber,
      FinancialYear: financialYear
    };
    
    return this.http.delete<any>(`${this.apiUrl}/DeleteInvoice`, {
      body: deleteInvoiceDto
    });
  }
}
