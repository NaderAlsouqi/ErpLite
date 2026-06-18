import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

export interface SalesmanDto {
  Man:    number;
  Name:   string;
  MEName: string;
}

@Injectable({ providedIn: 'root' })
export class SalesmanService {
  private apiUrl = `${environment.apiUrl}/Salesman`;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  getAll(): Observable<SalesmanDto[]> {
    return this.http
      .get<SalesmanDto[]>(`${this.apiUrl}/GetAll`)
      .pipe(catchError(this.handleError('GetAll')));
  }

  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let msg = this.translate.instant('General.OperationFailed', { operation });
      if (error.status === 0) msg = this.translate.instant('General.ConnectionError');
      this.toastr.error(msg, this.translate.instant('General.Error'));
      return throwError(() => new Error(msg));
    };
  }
}
