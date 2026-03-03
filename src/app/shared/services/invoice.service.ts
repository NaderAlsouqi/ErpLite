import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';



export interface Customer {
  CustomerAccountNumber: number;
  CustomerAccountName: string;
}

export interface CustomerForItems {
  CustomerAccountNumber: number;
  CustomerAccountArabicName: string;
  CustomerAccountEnglishName: string;
}

export interface Invoice {
  InvoiceDate: string;
  InvoiceNumber: string;
  TransactionNumber: string;
  CustomerName: string;
  FinancialYear: string;
  InvoiceAmount: string;
}

// Add this interface for tax types
export interface TaxTypeDto {
  TaxNumber: number;
  TaxNameAr: string;
  TaxNameEn: string;
  TaxPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Get all invoices for a delivery person
  getInvoices(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetInvoicesMainInfo/${deliveryId}`);
  }

  // Get all Untransfered Invoices for a delivery person
  GetUntransferredInvoicesMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetUntransferredInvoicesMainData/${deliveryId}`);
  }

  // Get all Transfered Invoices for a delivery person
  GetTransferredInvoicesMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetTransferredInvoicesMainData/${deliveryId}`);
  }

  // Get details of a specific invoice
  getInvoiceDetails(TransactionNumber: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Invoice/GetInvoiceDetailsByTransNumber/${TransactionNumber}`);
  }  


    // Get all Transfered Invoices for a delivery person
  GetQuotationsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetQuotationsMainData/${deliveryId}`);
  }

  // Get details of a specific invoice
  getInvoiceDetailsByBillNumber(TransactionNumber: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Invoice/GetInvoiceDetailsByBillNumber/${TransactionNumber}`);
  }  

  // Create new invoice
  addInvoice(newInvoice: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Invoice/CreateBill`, newInvoice);
  }

  // Get customers assigned to a delivery person
  getCustomers(deliveryId: number): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Accounts/GetCustomers/${deliveryId}`);
  }

  // Get all customers for items selection
  getCustomersForItems(): Observable<CustomerForItems[]> {
    return this.http.get<CustomerForItems[]>(`${this.apiUrl}/Accounts/GetAllCustomerAccounts`);
  }

  // Get payment methods
  getPaymentMethods(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetAllInvoicePayMethods`);
  }

    // Create new invoice
  addQuotation(newQuotation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Invoice/Quotation`, newQuotation);
  }

  // Get available items
  getItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Item/GetItems`);
  }

  // Get cost centers
  getCostCenters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetCostCenters`);
  }

  // Get sales accounts
  getSalesAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Accounts/GetSalesAccounts`);
  }

  // Get stores and quantities by item
  getStoresByItem(itemNumber: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Item/GetStoreNumberAndQuantityByItem/${itemNumber}`);
  }

  // Insert sales invoice payback
  insertSalesInvoicePayback(paybackPayload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Invoice/InsertSalesInvoicePayback`, paybackPayload);
  }

  // Get all Refunded invoices for a delivery person
  getRefunds(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetRefundsMainInfo/${deliveryId}`);
  }


    // Delete a virtual refund that hasn't been transferred
    deleteRefund(documentNumber: string, billNumber: string, financialYear: number): Observable<any> {
      debugger;
      const deleteRefundDto = {
        DocumentNumber: documentNumber,
        BillNumber: billNumber,
        FinancialYear: financialYear
      };
      
      return this.http.delete<any>(`${this.apiUrl}/Invoice/DeleteRefund`, {
        body: deleteRefundDto
      }).pipe(
        catchError(this.handleError('Delete invoice refund'))
      );
    }


      /**
       * Handle Http operation that failed
       * @param operation - name of the operation that failed
       */
      private handleError(operation = 'operation') {
        return (error: any): Observable<never> => {
          console.error(`${operation} failed:`, error);
          return throwError(() => error);
        };
      }


  // Get all Untransfered Refunds for a delivery person
  GetUntransferredRefundsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetUntransferredRefundsMainData/${deliveryId}`);
  }

  // Get all Transfered Refunds for a delivery person
  GetTransferredRefundsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Invoice/GetTransferredRefundsMainData/${deliveryId}`);
  }

  /**
   * Get refund details by document number, invoice number, and financial year
   * @param documentNumber The refund document number
   * @param invoiceNumber The original invoice number
   * @param year The financial year
   * @returns Observable with the refund details
   */
  getRefundDetails(documentNumber: string, invoiceNumber: string, year: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/Invoice/GetRefundDetails?doc=${documentNumber}&bill=${invoiceNumber}&myear=${year}`
    );
  }

  // Add this new method to fetch tax types
  getTaxTypes(): Observable<TaxTypeDto[]> {
    return this.http.get<TaxTypeDto[]>(`${this.apiUrl}/Invoice/GetTaxTypes`);
  }

  // Delete an invoice that hasn't been transferred
  deleteInvoice(transactionNumber: number, financialYear: number): Observable<any> {
    const deleteInvoiceDto = {
      TransactionNumber: transactionNumber,
      FinancialYear: financialYear
    };
    
    return this.http.delete<any>(`${this.apiUrl}/Invoice/DeleteInvoice`, {
      body: deleteInvoiceDto
    });
  }
}
