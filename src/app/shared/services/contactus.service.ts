import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContactUs {
  contactId: number;
  phone: string;
  email: string;
  addressAr: string;
  addressEn: string;
  mapUrl: string;
  fax: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface ContactUsUpdate {
  phone: string;
  email: string;
  addressAr: string;
  addressEn: string;
  mapUrl: string;
  fax: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactusService {
  private apiUrl = `${environment.apiUrl}/ContactUs`;

  constructor(private http: HttpClient) { }

  getCurrentContact(): Observable<ContactUs> {
    return this.http.get<ContactUs>(`${this.apiUrl}/current`);
  }

  updateContact(id: number, contact: ContactUsUpdate): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, contact);
  }
}
