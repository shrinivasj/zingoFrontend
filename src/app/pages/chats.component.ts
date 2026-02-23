import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Conversation, Message, NotificationItem } from '../core/models';
import { StompService } from '../core/stomp.service';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="chats-page">
      <h1>Chats</h1>

      <div class="chat-list" *ngIf="conversations.length; else emptyState">
        <a class="chat-row" *ngFor="let convo of conversations; let i = index" [routerLink]="['/chat', convo.id]">
          <div class="avatar-wrap">
            <div
              class="avatar"
              [style.backgroundImage]="avatarFor(convo) ? 'url(' + avatarFor(convo) + ')' : ''"
            ></div>
            <span class="unread-dot" *ngIf="isUnread(convo)"></span>
          </div>
          <div class="chat-main">
            <div class="top-line">
              <div class="name">{{ nameFor(convo) }}</div>
              <div class="time">{{ timeLabel(convo.lastMessageAt || convo.startsAt) }}</div>
            </div>
            <div class="movie">{{ convo.eventTitle || 'Movie' }}</div>
            <div class="snippet">{{ snippetFor(convo) }}</div>
          </div>
        </a>
      </div>

      <ng-template #emptyState>
        <p class="muted">No chats yet. Accept an invite to start one.</p>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #000000;
        background: #ffffff;
      }
      .chats-page {
        padding: 28px 22px 36px;
      }
      h1 {
        margin: 0 0 22px;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: -0.2px;
      }
      .chat-list {
        display: grid;
        gap: 26px;
      }
      .chat-row {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 16px;
        align-items: center;
        text-decoration: none;
        color: inherit;
      }
      .avatar-wrap {
        position: relative;
        width: 64px;
        height: 64px;
      }
      .avatar {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        background: #e6e6e6;
        background-size: cover;
        background-position: center;
      }
      .unread-dot {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: #ff4d4f;
        border: 3px solid #ffffff;
        top: -4px;
        right: -2px;
      }
      .top-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .name {
        font-weight: 700;
        font-size: 22px;
        color: #111111;
      }
      .time {
        color: #9a9a9a;
        font-weight: 600;
        font-size: 16px;
      }
      .movie {
        margin-top: 4px;
        color: #7a7a7a;
        font-size: 18px;
        font-weight: 600;
      }
      .snippet {
        margin-top: 6px;
        color: #6b6b6b;
        font-size: 18px;
        font-weight: 600;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      .muted {
        color: rgba(0, 0, 0, 0.55);
      }
    `
  ]
})
export class ChatsComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  private chatSubs = new Map<number, StompSubscription>();
  private notifSub?: StompSubscription;
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(private api: ApiService, private stomp: StompService) {}

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(), 15000);
    const notifSub = this.stomp.subscribe('/user/queue/notifications', (message) => {
      const payload = JSON.parse(message.body) as NotificationItem;
      if (payload.type === 'INVITE' || payload.type === 'SYSTEM') {
        this.load();
      }
    });
    if (notifSub) this.notifSub = notifSub;
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.notifSub?.unsubscribe();
    this.chatSubs.forEach((sub) => sub.unsubscribe());
    this.chatSubs.clear();
  }

  load() {
    this.api.getConversations().subscribe((data) => {
      this.conversations = this.sortConversations(data);
      this.syncSubscriptions();
    });
  }

  private syncSubscriptions() {
    const ids = new Set(this.conversations.map((c) => c.id));
    this.conversations.forEach((convo) => {
      if (this.chatSubs.has(convo.id)) return;
      const sub = this.stomp.subscribe(`/topic/chat.${convo.id}`, (message) => {
        const payload = JSON.parse(message.body) as Message;
        this.bumpConversation(payload);
      });
      if (sub) {
        this.chatSubs.set(convo.id, sub);
      }
    });
    Array.from(this.chatSubs.keys()).forEach((id) => {
      if (!ids.has(id)) {
        this.chatSubs.get(id)?.unsubscribe();
        this.chatSubs.delete(id);
      }
    });
  }

  private bumpConversation(message: Message) {
    const index = this.conversations.findIndex((c) => c.id === message.conversationId);
    if (index < 0) return;
    const updated = {
      ...this.conversations[index],
      lastMessageText: message.text,
      lastMessageAt: message.createdAt
    };
    this.conversations = this.sortConversations([updated, ...this.conversations.filter((c) => c.id !== message.conversationId)]);
  }

  nameFor(convo: Conversation) {
    return convo.otherUserName || 'Someone';
  }

  avatarFor(convo: Conversation) {
    return convo.otherUserAvatarUrl || '';
  }

  isUnread(convo: Conversation) {
    return (convo.id ?? 0) % 2 === 0;
  }

  snippetFor(convo: Conversation) {
    if (convo.lastMessageText) {
      return convo.lastMessageText;
    }
    return 'Tap to start chatting';
  }

  timeLabel(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private sortConversations(items: Conversation[]) {
    return [...items].sort((a, b) => {
      const aHasLast = !!a.lastMessageAt;
      const bHasLast = !!b.lastMessageAt;
      if (aHasLast !== bHasLast) {
        return bHasLast ? 1 : -1;
      }

      if (aHasLast && bHasLast) {
        const timeDiff = this.parseTime(b.lastMessageAt) - this.parseTime(a.lastMessageAt);
        if (timeDiff !== 0) {
          return timeDiff;
        }
      } else {
        const startDiff = this.parseTime(b.startsAt) - this.parseTime(a.startsAt);
        if (startDiff !== 0) {
          return startDiff;
        }
      }
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }

  private parseTime(value?: string | null) {
    if (!value) {
      return 0;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
