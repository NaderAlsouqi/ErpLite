import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatMessage {
  MessageId: number;
  ConversationId: number;
  SenderId: number;
  SenderIsAdmin: boolean;
  SenderName: string;
  Body: string;
  SentAt: string;
  // present on push/send/reply payloads (ChatMessageWithConvDto)
  AssignedAdminId?: number | null;
  AssignedAdminName?: string | null;
  UserId?: number;
  UserName?: string;
  UserLogin?: string;
  TenantDb?: string;
}

export interface ChatConversation {
  ConversationId: number;
  UserId: number;
  UserName: string;
  UserLogin: string;
  TenantDb: string;
  AssignedAdminId: number | null;
  AssignedAdminName: string | null;
  Status: string;
  CreatedAt: string;
  LastMessageAt: string;
  LastMessageText: string;
  UnreadByAdmin: number;
}

export interface ActiveAdmin {
  AdminId: number;
  AdminName: string;
  LastSeenAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = `${environment.apiUrl}/Chat`;
  /** Hub lives at the API origin root (not under /api). */
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/chatHub`;

  private hub?: signalR.HubConnection;
  private starting?: Promise<void>;

  /** Emits every message pushed by the server (incoming or own echo). */
  private readonly messageSubject = new Subject<ChatMessage>();
  public readonly message$ = this.messageSubject.asObservable();

  /** Emits the live connection state (true = connected). */
  private readonly connectedSubject = new Subject<boolean>();
  public readonly connected$ = this.connectedSubject.asObservable();

  constructor(private http: HttpClient, private auth: AuthService, private zone: NgZone) {}

  // ---- SignalR connection --------------------------------------------------
  start(): Promise<void> {
    if (this.hub && this.hub.state === signalR.HubConnectionState.Connected) return Promise.resolve();
    if (this.starting) return this.starting;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
        withCredentials: false // API CORS is AllowAnyOrigin (no credentials)
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // SignalR callbacks fire outside Angular's zone — marshal them back in so
    // change detection runs and the view updates without a manual refresh.
    this.hub.on('ReceiveMessage', (msg: ChatMessage) => this.zone.run(() => this.messageSubject.next(msg)));
    this.hub.onreconnected(() => this.zone.run(() => this.connectedSubject.next(true)));
    this.hub.onclose(() => this.zone.run(() => this.connectedSubject.next(false)));

    this.starting = this.hub.start()
      .then(() => { this.connectedSubject.next(true); })
      .catch(err => { console.warn('Chat hub connection failed:', err); })
      .finally(() => { this.starting = undefined; });

    return this.starting;
  }

  stop(): void {
    this.hub?.stop().catch(() => {});
    this.hub = undefined;
  }

  // ---- user (customer) endpoints ------------------------------------------
  sendMessage(body: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.api}/Send`, { Body: body });
  }

  getUserMessages(afterId = 0): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.api}/User/Messages?afterId=${afterId}`);
  }

  getActiveAdmins(): Observable<ActiveAdmin[]> {
    return this.http.get<ActiveAdmin[]>(`${this.api}/ActiveAdmins`);
  }

  // ---- admin endpoints -----------------------------------------------------
  adminHeartbeat(): Observable<void> {
    return this.http.post<void>(`${this.api}/Admin/Heartbeat`, {});
  }

  adminListConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.api}/Admin/Conversations`);
  }

  adminGetMessages(conversationId: number, afterId = 0): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.api}/Admin/Messages?conversationId=${conversationId}&afterId=${afterId}`);
  }

  adminReply(conversationId: number, body: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.api}/Admin/Reply`, { ConversationId: conversationId, Body: body });
  }
}
