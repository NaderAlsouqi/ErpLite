import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface BankDto {
  bank_num: number;
  Bank: string;
  BEName: string;
  Accno?: number | null;
  CCntrNo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class BankService {
  private apiUrl = `${environment.apiUrl}/Banks`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getAll(): Observable<BankDto[]> {
    return this.http
      .get<BankDto[]>(`${this.apiUrl}/GetAll`)
      .pipe(catchError(this.handleError('GetAll')));
  }

  getById(id: number): Observable<BankDto> {
    return this.http
      .get<BankDto>(`${this.apiUrl}/GetById/${id}`)
      .pipe(catchError(this.handleError('GetById')));
  }

  add(bank: BankDto): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/Add`, bank)
      .pipe(catchError(this.handleError('Add')));
  }

  update(id: number, bank: BankDto): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/Update/${id}`, bank)
      .pipe(catchError(this.handleError('Update')));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/Delete/${id}`)
      .pipe(catchError(this.handleError('Delete')));
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let errorMessage = this.translate.instant('General.OperationFailed', { operation });

      if (error.status === 0) {
        errorMessage = this.translate.instant('General.ConnectionError');
      } else if (error.status === 404) {
        errorMessage = this.translate.instant('General.NotFound');
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }

      this.toastr.error(errorMessage, this.translate.instant('General.Error'));
      return throwError(() => new Error(errorMessage));
    };
  }
}
