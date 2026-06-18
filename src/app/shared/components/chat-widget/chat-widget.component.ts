import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatConversation, ChatMessage } from '../../services/chat.service';

/**
 * Floating in-app chat. Two modes from one component:
 *  - regular user: a "talk to support" thread with the tenant's admins.
 *  - admin: an inbox of conversations (assigned to me or unassigned) + thread.
 * Hidden when logged out or in the public demo session.
 */
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('scrollBody') private scrollBody?: ElementRef<HTMLElement>;

  isOpen = false;
  isAdmin = false;
  view: 'list' | 'thread' = 'thread';

  messages: ChatMessage[] = [];
  conversations: ChatConversation[] = [];
  activeConv?: ChatConversation;

  draft = '';
  sending = false;
  unread = 0;            // user-side unread (admin uses per-conversation counters)
  supportOnline = false; // user-side: any admin currently online

  private authSub?: Subscription;
  private msgSub?: Subscription;
  private heartbeatTimer?: any;
  private presenceTimer?: any;
  private initialized = false;

  constructor(public auth: AuthService, private chat: ChatService, private cdr: ChangeDetectorRef) {}

  /** Show only to authenticated, non-demo users. */
  get visible(): boolean {
    return this.auth.isLoggedIn && !this.auth.isDemoMode;
  }

  get unreadTotal(): number {
    return this.isAdmin
      ? this.conversations.reduce((s, c) => s + (c.UnreadByAdmin || 0), 0)
      : this.unread;
  }

  ngOnInit(): void {
    // The widget is mounted in the root component, which is not re-created on
    // SPA login navigation — so react to auth state instead of init-once.
    this.authSub = this.auth.currentUser$.subscribe(() => this.evaluate());
    this.evaluate();
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.teardown();
  }

  private evaluate(): void {
    if (this.visible && !this.initialized) this.startup();
    else if (!this.visible && this.initialized) this.teardown();
  }

  private startup(): void {
    this.initialized = true;
    // Chat admin = the 'Admin' role ONLY. Deliberately NOT permission-based:
    // "grant all permissions" must not turn a regular user into a support agent.
    this.isAdmin = this.auth.hasRole('Admin');
    this.view = this.isAdmin ? 'list' : 'thread';

    this.chat.start();
    this.msgSub = this.chat.message$.subscribe(m => {
      this.onIncoming(m);
      // Force a repaint now — pushes originate from a WebSocket callback and
      // can otherwise miss a change-detection cycle while the panel is open.
      try { this.cdr.detectChanges(); } catch { /* view may be detached */ }
    });

    if (this.isAdmin) {
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 20000);
      this.loadConversations();
    } else {
      this.loadUserThread();
      this.refreshPresence();
      this.presenceTimer = setInterval(() => this.refreshPresence(), 30000);
    }
  }

  private teardown(): void {
    this.initialized = false;
    this.isOpen = false;
    this.msgSub?.unsubscribe();
    this.msgSub = undefined;
    clearInterval(this.heartbeatTimer);
    clearInterval(this.presenceTimer);
    this.heartbeatTimer = undefined;
    this.presenceTimer = undefined;
    this.messages = [];
    this.conversations = [];
    this.activeConv = undefined;
    this.unread = 0;
    this.chat.stop();
  }

  // ---- UI actions ----------------------------------------------------------
  toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) return;
    if (this.isAdmin) {
      this.loadConversations();
    } else {
      this.unread = 0;
      this.loadUserThread();
    }
  }

  openConversation(conv: ChatConversation): void {
    this.activeConv = conv;
    this.view = 'thread';
    conv.UnreadByAdmin = 0;
    this.chat.adminGetMessages(conv.ConversationId, 0).subscribe(msgs => {
      this.messages = msgs;
      this.scrollSoon();
    });
  }

  backToList(): void {
    this.view = 'list';
    this.activeConv = undefined;
    this.messages = [];
    this.loadConversations();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending) return;
    this.sending = true;

    const done = (m: ChatMessage) => {
      this.appendMessage(m);
      this.draft = '';
      this.sending = false;
    };
    const fail = () => { this.sending = false; };

    if (this.isAdmin && this.activeConv) {
      this.chat.adminReply(this.activeConv.ConversationId, text).subscribe({ next: done, error: fail });
    } else if (!this.isAdmin) {
      this.chat.sendMessage(text).subscribe({ next: done, error: fail });
    } else {
      this.sending = false;
    }
  }

  // ---- data loaders --------------------------------------------------------
  private loadUserThread(): void {
    this.chat.getUserMessages(0).subscribe(msgs => {
      this.messages = msgs;
      this.scrollSoon();
    });
  }

  private loadConversations(): void {
    this.chat.adminListConversations().subscribe(list => { this.conversations = list; });
  }

  private refreshPresence(): void {
    this.chat.getActiveAdmins().subscribe(admins => { this.supportOnline = (admins?.length || 0) > 0; });
  }

  private sendHeartbeat(): void {
    this.chat.adminHeartbeat().subscribe({ error: () => {} });
  }

  // ---- realtime ------------------------------------------------------------
  private onIncoming(m: ChatMessage): void {
    if (this.isAdmin) {
      // Update the active thread if it belongs to it.
      if (this.activeConv && m.ConversationId === this.activeConv.ConversationId) {
        this.appendMessage(m);
      }
      // Reflect in the inbox (new conv from a user not yet listed → reload).
      const conv = this.conversations.find(c => c.ConversationId === m.ConversationId);
      if (conv) {
        conv.LastMessageText = m.Body;
        conv.LastMessageAt = m.SentAt;
        if (!m.SenderIsAdmin && !(this.activeConv && this.activeConv.ConversationId === conv.ConversationId)) {
          conv.UnreadByAdmin = (conv.UnreadByAdmin || 0) + 1;
        }
        this.conversations = [conv, ...this.conversations.filter(c => c.ConversationId !== conv.ConversationId)];
      } else if (!m.SenderIsAdmin) {
        this.loadConversations();
      }
    } else {
      // User side: only admin replies arrive over the hub.
      this.appendMessage(m);
      if (!this.isOpen && m.SenderIsAdmin) this.unread++;
    }
  }

  private appendMessage(m: ChatMessage): void {
    if (this.messages.some(x => x.MessageId === m.MessageId)) return;
    this.messages = [...this.messages, m].sort((a, b) => a.MessageId - b.MessageId);
    this.scrollSoon();
  }

  private scrollSoon(): void {
    setTimeout(() => {
      const el = this.scrollBody?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  /** A message is "mine" (right-aligned) when it's from the current side. */
  isMine(m: ChatMessage): boolean {
    return this.isAdmin ? m.SenderIsAdmin : !m.SenderIsAdmin;
  }

  trackMsg = (_: number, m: ChatMessage) => m.MessageId;
  trackConv = (_: number, c: ChatConversation) => c.ConversationId;
}
