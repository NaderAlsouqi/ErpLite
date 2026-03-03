import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// DTOs for Virtual Invoice
export interface VirtualBranchDto {
  BranchNo: number;
  BranchNameArabic: string;
  BranchNameEnglish: string;
}

export interface VirtualItemDto {
  ItemNumber: string;
  ItemArabicName: string;
  UnitNumber: number;
  UnitArabicName: string;
  UnitEnglishName: string;
}

export interface VirtualCustomerDto {
  CustomerAccountNumber: number;
  CustomerAccountName: string;
  BranchNameArabic: string;
  BranchNameEnglish: string;
  TaxNo: string;
  PhoneNo: string;
}

export interface VirtualAddItemDto {
  ItemNumber: string;
  ItemName: string;
  UnitNumber?: number;
  TaxNo: number;
}

export interface VirtualAddCustomerDto {
  BranchNo: number;
  CustomerNumber: number;
  CustomerName: string;
  TaxNo?: string;
  PhoneNo?: string;
}

export interface VirtualAddBranchDto {
  BranchNo: number;
  BranchNameArabic: string;
  BranchNameEnglish?: string;
}

export interface VirtualAddUnitDto {
  UnitNumber: number;
  UnitArabicName: string;
  UnitEnglishName?: string;
}

export interface VirtualUnitDto {
  UnitNumber: number;
  ArabicName: string;
  EnglishName: string;
}

export interface VirtualUpdateBranchDto {
  BranchNo: number;
  ArabicName: string;
  EnglishName?: string;
}

export interface VirtualUpdateCustomerDto {
  BranchNo: number;
  CustomerNumber: number;
  NewName?: string;
  NewTaxNo?: string;
  NewPhoneNo?: string;
}

export interface VirtualUpdateItemDto {
  ItemNumber: string;
  NewItemName?: string;
  NewUnitNumber?: number;
  NewTaxNo?: number;
}

export interface VirtualUpdateUnitDto {
  UnitNumber: number;
  NewArabicName?: string;
  NewEnglishName?: string;
}

export interface BillInvoiceDto {
  // Define the structure based on your actual invoice data
  BranchNo: number;
  CustomerAccountNumber: number;
  Date: string;
  Items: BillInvoiceItemDto[];
  // Add other properties as needed
}

export interface BillInvoiceItemDto {
  ItemNumber: string;
  Quantity: number;
  Price: number;
  // Add other properties as needed
}

export interface ApiResponse {
  success: boolean;
  message: string;
  transactionNumber?: string;
  billNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VirtualInvoiceService {
  private apiUrl = `${environment.apiUrl}/VirtualInvoice`;

  constructor(private http: HttpClient) { }

  /**
   * Get all branches
   * @returns Observable of branch data
   */
  getBranches(): Observable<VirtualBranchDto[]> {
    return this.http.get<VirtualBranchDto[]>(`${this.apiUrl}/Branches`)
      .pipe(
        catchError(this.handleError('Get branches'))
      );
  }

  /**
   * Get all items
   * @returns Observable of item data
   */
  getItems(): Observable<VirtualItemDto[]> {
    return this.http.get<VirtualItemDto[]>(`${this.apiUrl}/Items`)
      .pipe(
        catchError(this.handleError('Get items'))
      );
  }

  /**
   * Get customers, optionally filtered by branch
   * @param branchNo Optional branch number to filter customers
   * @returns Observable of customer data
   */
  getCustomers(branchNo?: number): Observable<VirtualCustomerDto[]> {
    let url = `${this.apiUrl}/Customers`;
    if (branchNo !== undefined && branchNo !== null) {
      url += `?branchNo=${branchNo}`;
    }
    return this.http.get<VirtualCustomerDto[]>(url)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }

  /**
   * Add a new item
   * @param item Item data to add
   * @returns Observable of API response
   */
  addItem(item: VirtualAddItemDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/Item`, item)
      .pipe(
        catchError(this.handleError('Add item'))
      );
  }

  /**
   * Add a new customer
   * @param customer Customer data to add
   * @returns Observable of API response
   */
  addCustomer(customer: VirtualAddCustomerDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/Customer`, customer)
      .pipe(
        catchError(this.handleError('Add customer'))
      );
  }

  /**
   * Add a new branch
   * @param branch Branch data to add
   * @returns Observable of API response
   */
  addBranch(branch: VirtualAddBranchDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/Branch`, branch)
      .pipe(
        catchError(this.handleError('Add branch'))
      );
  }

  /**
   * Add a new unit
   * @param unit Unit data to add
   * @returns Observable of API response
   */
  addUnit(unit: VirtualAddUnitDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/Unit`, unit)
      .pipe(
        catchError(this.handleError('Add unit'))
      );
  }

  /**
   * Create a new virtual invoice
   * @param requestData Object containing invoice data wrapped in an 'invoice' property
   * @returns Observable of API response with transaction and bill numbers
   */
  createInvoice(requestData: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/Invoice`, requestData)
      .pipe(
        catchError(this.handleError('Create invoice'))
      );
  }


  // Create new invoice
  addInvoice(newInvoice: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Invoice`, newInvoice);
  }

  
  // Create new invoice
  addQuotation(newQuotation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Quotation`, newQuotation);
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


  // Get all Untransfered Invoices for a delivery person
  GetUntransferredInvoicesMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetUntransferredVirtualInvoicesMainData/${deliveryId}`);
  }

  // Get all Transfered Invoices for a delivery person
  GetTransferredInvoicesMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetTransferredVirtualInvoicesMainData/${deliveryId}`);
  }


  // Get all Transfered Invoices for a delivery person
  GetQuotationsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetQuotationsMainData/${deliveryId}`);
  }


  // Get details of a specific invoice
  getInvoiceDetails(TransactionNumber: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/Invoice/GetVirtualInvoiceDetailsByTransNumber/${TransactionNumber}`);
  }  

  // Get details of a specific invoice
  getInvoiceDetailsByBillNumber(TransactionNumber: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/Invoice/GetVirtualInvoiceDetailsByBillNumber/${TransactionNumber}`);
  }  

  /**
   * Update QR code for a virtual invoice
   * @param TransNumber Transaction number of the invoice
   * @param qrCode QR code to update
   * @returns Observable of the update result
   */
  updateVirtualInvoiceQrCode(TransNumber: string, qrCode: string): Observable<any> {
    const body = { TransNumber, qrCode };
    return this.http.post<any>(`${this.apiUrl}/update-qrcode`, body)
      .pipe(
        catchError(this.handleError('Update virtual invoice QR code'))
      );
  }

  /**
   * Get all units, optionally filtered by unit number
   * @param unitNumber Optional unit number to filter
   * @returns Observable of unit data
   */
  getUnits(unitNumber?: number): Observable<VirtualUnitDto[]> {
    let url = `${this.apiUrl}/Units`;
    if (unitNumber !== undefined && unitNumber !== null) {
      url += `?unitNumber=${unitNumber}`;
    }
    return this.http.get<VirtualUnitDto[]>(url)
      .pipe(
        catchError(this.handleError('Get units'))
      );
  }

  /**
   * Update an existing branch
   * @param branch Branch data to update
   * @returns Observable of API response
   */
  updateBranch(branch: VirtualUpdateBranchDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/Branch`, branch)
      .pipe(
        catchError(this.handleError('Update branch'))
      );
  }

  /**
   * Update an existing customer
   * @param customer Customer data to update
   * @returns Observable of API response
   */
  updateCustomer(customer: VirtualUpdateCustomerDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/Customer`, customer)
      .pipe(
        catchError(this.handleError('Update customer'))
      );
  }

  /**
   * Update an existing item
   * @param item Item data to update
   * @returns Observable of API response
   */
  updateItem(item: VirtualUpdateItemDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/Item`, item)
      .pipe(
        catchError(this.handleError('Update item'))
      );
  }

  /**
   * Update an existing unit
   * @param unit Unit data to update
   * @returns Observable of API response
   */
  updateUnit(unit: VirtualUpdateUnitDto): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/Unit`, unit)
      .pipe(
        catchError(this.handleError('Update unit'))
      );
  }


  /**
   * Get all invoices for a delivery person
   * @param deliveryId ID of the delivery person
   * @returns Observable of invoice data
   */
  GetInvoicesMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetInvoicesMainData/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get invoices main data'))
      );
  }

  // Delete a virtual invoice that hasn't been transferred
  deleteInvoice(transactionNumber: number, financialYear: number): Observable<any> {
    const deleteInvoiceDto = {
      TransactionNumber: transactionNumber,
      FinancialYear: financialYear
    };
    
    return this.http.delete<any>(`${this.apiUrl}/DeleteInvoice`, {
      body: deleteInvoiceDto
    }).pipe(
      catchError(this.handleError('Delete virtual invoice'))
    );
  }





  // Virtual Refunds Methods

  // Insert sales invoice payback
  insertSalesInvoicePayback(paybackPayload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/InsertSalesInvoicePayback`, paybackPayload);
  }

  // Get all Refunded invoices for a delivery person
  getRefunds(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetRefunds/${deliveryId}`);
  }

  // Get all Untransfered Refunds for a delivery person
  GetUntransferredRefundsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetUntransferredRefundsMainData/${deliveryId}`);
  }

  // Get all Transfered Refunds for a delivery person
  GetTransferredRefundsMainData(deliveryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetTransferredRefundsMainData/${deliveryId}`);
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
      `${this.apiUrl}/GetRefundDetails?doc=${documentNumber}&bill=${invoiceNumber}&myear=${year}`
    );
  }


  // Delete a virtual refund that hasn't been transferred
  deleteRefund(documentNumber: string, billNumber: string, financialYear: number): Observable<any> {
    debugger;
    const deleteRefundDto = {
      DocumentNumber: documentNumber,
      BillNumber: billNumber,
      FinancialYear: financialYear
    };
    
    return this.http.delete<any>(`${this.apiUrl}/DeleteRefund`, {
      body: deleteRefundDto
    }).pipe(
      catchError(this.handleError('Delete virtual refund'))
    );
  }




}