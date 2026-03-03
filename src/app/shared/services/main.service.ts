import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MainPage, MainPageUpdate } from '../interfaces/main.interface';

@Injectable({
  providedIn: 'root'
})
export class MainService {
  private apiUrl = `${environment.apiUrl}/MainPage`;

  constructor(private http: HttpClient) { }

  getCurrentMain(): Observable<MainPage> {
    return this.http.get<MainPage>(`${this.apiUrl}/current`);
  }

  updateMain(id: number, mainPage: MainPageUpdate): Observable<any> {
    const formData = new FormData();
    if (mainPage.backgroundImage) {
      formData.append('backgroundImage', mainPage.backgroundImage);
    }
    formData.append('mainTextAr', mainPage.mainTextAr);
    formData.append('mainTextEn', mainPage.mainTextEn);
    formData.append('subtextAr', mainPage.subtextAr);
    formData.append('subtextEn', mainPage.subtextEn);

    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }
}