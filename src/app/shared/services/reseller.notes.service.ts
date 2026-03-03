import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

export interface NoteDto {
  NoteId: number;
  Man_id?: number;
  Name: string;
  Subject: string;
  Note: string;
  Phone: string;
  Email: string;
}

export interface GetNotesDto {
  manId?: number;
  name?: string;
  phone?: string;
  email?: string;
  status_id?: number;
}

export interface InsertNoteDto {
  manId?: number;
  name: string;
  subject: string;
  note: string;
  phone: string;
  email: string;
}



// Notes Response interface
export interface NotesResponse {
  Name: string;
  Subject: string;
  Note: number;
  Phone: string;
  Email: string;
}



@Injectable({
  providedIn: 'root',
})

export class ResellerNotesService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}


  insertNote(note: InsertNoteDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Notes/InsertNote`, note);
  }

   getNotes(params: GetNotesDto): Observable<NotesResponse[]> {
    return this.http.post<any[]>(`${this.apiUrl}/Notes/GetNotes`, params).pipe(
      map((notes) => notes.map(note => ({
        NoteId: note.NoteId,
        Man_id: note.Man_id,
        Name: note.Name,
        Subject: note.Subject,
        Note: note.Note,
        Phone: note.Phone,
        Email: note.Email,
      })))
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