import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** API serializes DTOs in PascalCase (same as the rest of this app). */
export interface Attachment {
  Id: number;
  ModuleKey: string;
  EntityId?: string | null;
  FileName: string;
  FilePath: string;
  ContentType?: string;
  FileSize: number;
  UploadedBy?: string;
  UploadedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private api = `${environment.apiUrl}/Attachments`;

  constructor(private http: HttpClient) {}

  list(moduleKey: string, entityId?: string | null): Observable<Attachment[]> {
    let params = new HttpParams().set('moduleKey', moduleKey);
    if (entityId != null && `${entityId}` !== '') params = params.set('entityId', `${entityId}`);
    return this.http.get<Attachment[]>(`${this.api}/List`, { params });
  }

  upload(moduleKey: string, entityId: string | null | undefined, file: File): Observable<Attachment> {
    const form = new FormData();
    form.append('moduleKey', moduleKey);
    if (entityId != null && `${entityId}` !== '') form.append('entityId', `${entityId}`);
    form.append('file', file);
    return this.http.post<Attachment>(`${this.api}/Upload`, form);
  }

  /** Download (auth header is required, so fetch as blob then save). */
  download(att: Attachment): void {
    this.http.get(`${this.api}/Download/${att.Id}`, { responseType: 'blob' }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.FileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
