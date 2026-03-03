import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface Customer {
  CustomerAccountNumber: number;
  CustomerAccountName: string;
}

export interface Bank {
  Bank: string;
  BEName: string;
  bank_num: number
}

export interface Account {
  CustomerAccountNumber: number;
  CustomerAccountArabicName: string;
}


export interface Invoice {
  InvoiceNumber: string;
  CustomerName: string;
  FinancialYear: number;
  InvoiceAmount: number;
}

export interface CashReceiptDto {
  Date: string;
  DeliveryManNumber: number;
  Username: string;
  CreditAccountNumber: number;
  CreditAccountName: string;
  InvoiceNumber: string;
  FinancialYear: number;
  DebtAccountNumber: number;
  ChequeDebtAccountNumber: number;
  Amount: number;
  ChequeAmount: number;
  Description?: string;
}

export interface ChequeResponse {
  ChequeNumber: string;
  ChequeDate: string;
  BankNumber: number;
  BankName: string;
  ChequeAmount: number;
}


export interface ChequeDto {
  Trans_Num: number;
  doc_num: number;
}

export interface CheqReceiptDto extends CashReceiptDto {
  Cheques: ChequeResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class ReceiptVouchersService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getCustomers(deliveryId: number): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Accounts/GetCustomers/${deliveryId}`)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }

  getBanks(): Observable<Bank[]> {
    return this.http.get<Bank[]>(`${this.apiUrl}/Accounts/GetBanks`)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }

    getCustomersLevelZero(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Accounts/GetCustomerAccountsLevelZero`)
      .pipe(
        catchError(this.handleError('Get customers'))
      );
  }

getCheques(documentNumber: number,Trans_Num: number): Observable<ChequeResponse[]> {
    return this.http.get<ChequeResponse[]>(`${this.apiUrl}/Invoice/GetAllCheqs/${documentNumber}/${Trans_Num}`)
      .pipe(
        catchError(this.handleError('Get cheques'))
      );
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/Invoice/GetInvoices`)
      .pipe(
        catchError(this.handleError('Get invoices'))
      );
  }

  addCashReceipt(cashReceipt: CashReceiptDto): Observable<any> {
    const formData = new FormData();
    formData.append('DebtAccountNumber', cashReceipt.DebtAccountNumber.toString());
    formData.append('FinancialYear', cashReceipt.FinancialYear.toString());
    formData.append('Date', cashReceipt.Date);
    formData.append('DeliveryManNumber', cashReceipt.DeliveryManNumber.toString());
    formData.append('InvoiceNumber', cashReceipt.InvoiceNumber);
    formData.append('Username', cashReceipt.Username);
    formData.append('Amount', cashReceipt.Amount.toString());
    formData.append('Description', cashReceipt.Description || '');
    formData.append('CreditAccountNumber', cashReceipt.CreditAccountNumber.toString());
  
    return this.http.post(`${this.apiUrl}/Invoice/AddNewCashReceipt`, formData)
      .pipe(
        catchError(this.handleError('Add cash receipt'))
      );
  }
  
  addChequeReceipt(receipt: CheqReceiptDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Invoice/AddNewChequeReceipt`, receipt)
      .pipe(
        catchError(this.handleError('Add cheque receipt'))
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
}
