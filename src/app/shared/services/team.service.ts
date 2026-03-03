import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeamMember, TeamMemberUpdate } from '../interfaces/team.interface';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl = `${environment.apiUrl}/Team`;

  constructor(private http: HttpClient) { }

  getAllTeamMembers(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(this.apiUrl);
  }

  getTeamMemberById(id: number): Observable<TeamMember> {
    return this.http.get<TeamMember>(`${this.apiUrl}/${id}`);
  }

  createTeamMember(member: TeamMemberUpdate): Observable<any> {
    const formData = new FormData();
    this.appendTeamMemberData(formData, member);
    return this.http.post(this.apiUrl, formData);
  }

  updateTeamMember(id: number, member: TeamMemberUpdate): Observable<any> {
    const formData = new FormData();
    this.appendTeamMemberData(formData, member);
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  deleteTeamMember(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  private appendTeamMemberData(formData: FormData, member: TeamMemberUpdate): void {
    formData.append('nameAr', member.nameAr);
    formData.append('nameEn', member.nameEn);
    formData.append('positionAr', member.positionAr);
    formData.append('positionEn', member.positionEn);
    if (member.bio) formData.append('bio', member.bio);
    if (member.image) formData.append('image', member.image);
    if (member.linkedInUrl) formData.append('linkedInUrl', member.linkedInUrl);
    if (member.twitterUrl) formData.append('twitterUrl', member.twitterUrl);
    formData.append('sortOrder', member.sortOrder.toString());
    formData.append('isActive', member.isActive.toString());
  }
}
