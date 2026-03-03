import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AboutUs, AboutUsUpdate } from '../interfaces/aboutus.interface';

@Injectable({
  providedIn: 'root'
})
export class AboutService {
  private apiUrl = `${environment.apiUrl}/AboutUs`;

  constructor(private http: HttpClient) { }

  getCurrentAbout(): Observable<AboutUs> {
    return this.http.get<AboutUs>(`${this.apiUrl}/current`);
  }

  updateAbout(id: number, about: AboutUsUpdate): Observable<any> {
    // Only send the required fields for update
    const updateData: AboutUsUpdate = {
      contentAr: about.contentAr,
      contentEn: about.contentEn,
      videoLink: about.videoLink
    };
    return this.http.put(`${this.apiUrl}/${id}`, updateData);
  }
}