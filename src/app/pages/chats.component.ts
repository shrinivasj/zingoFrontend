import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Conversation } from '../core/models';

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
        padding: 22px 18px 36px;
      }
      h1 {
        margin: 0 0 18px;
        font-size: 34px;
      }
      .chat-list {
        display: grid;
        gap: 22px;
      }
      .chat-row {
        display: grid;
        grid-template-columns: 74px 1fr;
        gap: 14px;
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
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #fc5054;
        border: 3px solid #ffffff;
        top: -2px;
        right: -2px;
      }
      .top-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .name {
        font-weight: 700;
        font-size: 22px;
      }
      .time {
        color: rgba(0, 0, 0, 0.45);
        font-weight: 600;
      }
      .movie {
        margin-top: 4px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 18px;
        font-weight: 600;
      }
      .snippet {
        margin-top: 6px;
        color: rgba(0, 0, 0, 0.55);
        font-size: 18px;
      }
      .muted {
        color: rgba(0, 0, 0, 0.55);
      }
    `
  ]
})
export class ChatsComponent implements OnInit {
  conversations: Conversation[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getConversations().subscribe((data) => (this.conversations = data));
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
}
