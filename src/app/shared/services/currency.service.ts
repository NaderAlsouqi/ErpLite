import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface CurrencyDto {
  cur_no: number;
  cur: string;
  ename: string;
  dec?: number | null;
  lrate?: number | null;
  bank_num?: number | null;
  BoxOffice?: string | null;
  CodeNo?: number | null;
  AccountNo?: string | null;
  SwiftCode?: string | null;
  CurSmallAr?: string | null;
  CurSmallEn?: string | null;
  CurShortCutAR?: string | null;
  CurShortCutEn?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private apiUrl = `${environment.apiUrl}/Currencies`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  getAll(): Observable<CurrencyDto[]> {
    return this.http
      .get<CurrencyDto[]>(`${this.apiUrl}/GetAll`)
      .pipe(catchError(this.handleError('GetAll')));
  }

  getById(id: number): Observable<CurrencyDto> {
    return this.http
      .get<CurrencyDto>(`${this.apiUrl}/GetById/${id}`)
      .pipe(catchError(this.handleError('GetById')));
  }

  add(currency: CurrencyDto): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/Add`, currency)
      .pipe(catchError(this.handleError('Add')));
  }

  update(id: number, currency: CurrencyDto): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/Update/${id}`, currency)
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
