import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { NotificationItem } from '../core/models';
import { StompService } from '../core/stomp.service';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="notifications-page">
      <h1>Notifications</h1>

      <div class="notification-list" *ngIf="notifications.length; else emptyState">
        <div class="note-card" *ngFor="let note of notifications">
          <div class="note-main">
            <div
              class="avatar"
              [style.backgroundImage]="avatarUrl(note) ? 'url(' + avatarUrl(note) + ')' : ''"
              [class.has-image]="!!avatarUrl(note)"
            >
              {{ avatarUrl(note) ? '' : initials(fromName(note)) }}
            </div>
            <div class="note-content">
              <div class="line-1">
                <strong>{{ fromName(note) }}</strong>
                wants to go to a movie with you
              </div>
              <div class="movie">{{ eventTitle(note) }}</div>
              <div class="meta">{{ whenText(note) }}</div>
            </div>
          </div>

          <div class="actions" *ngIf="note.type === 'INVITE'">
            <button class="btn accept" (click)="accept(note)">Accept</button>
            <button class="btn pass" (click)="decline(note)">Pass</button>
          </div>
        </div>
      </div>

      <ng-template #emptyState>
        <p class="muted">No notifications yet.</p>
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
      .notifications-page {
        padding: 22px 20px 36px;
      }
      h1 {
        margin: 0 0 18px;
        font-size: 32px;
      }
      .notification-list {
        display: grid;
        gap: 18px;
      }
      .note-card {
        border: 1px solid #e1e1e1;
        border-radius: 22px;
        padding: 18px;
        background: #ffffff;
        display: grid;
        gap: 16px;
      }
      .note-main {
        display: grid;
        grid-template-columns: 56px 1fr;
        gap: 14px;
        align-items: center;
      }
      .avatar {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        background: #e6e6e6;
        background-size: cover;
        background-position: center;
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .avatar.has-image {
        color: transparent;
      }
      .line-1 {
        font-size: 16px;
        line-height: 1.3;
      }
      .movie {
        margin-top: 6px;
        font-weight: 700;
        font-size: 17px;
      }
      .meta {
        margin-top: 4px;
        color: rgba(0, 0, 0, 0.55);
        font-size: 15px;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .btn {
        border-radius: 16px;
        padding: 12px 14px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn.accept {
        background: #fc5054;
        color: #ffffff;
        border: none;
      }
      .btn.pass {
        background: #ffffff;
        color: #000000;
        border: 2px solid #e1e1e1;
      }
      .muted {
        color: rgba(0, 0, 0, 0.6);
      }
    `
  ]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: NotificationItem[] = [];
  private subscription?: StompSubscription | null;

  constructor(private api: ApiService, private router: Router, private stomp: StompService) {}

  ngOnInit() {
    this.load();
    this.subscription = this.stomp.subscribe('/user/queue/notifications', (message) => {
      const payload = JSON.parse(message.body) as NotificationItem;
      this.notifications = [payload, ...this.notifications];
    });
  }

  load() {
    this.api.getNotifications().subscribe((items) => (this.notifications = items));
  }

  fromName(note: NotificationItem) {
    return note.payload?.['fromDisplayName'] || 'Someone';
  }

  avatarUrl(note: NotificationItem) {
    return note.payload?.['fromAvatarUrl'] || '';
  }

  eventTitle(note: NotificationItem) {
    return note.payload?.['eventTitle'] || 'The Silent Observer';
  }

  accept(note: NotificationItem) {
    const inviteId = note.payload?.['inviteId'];
    if (!inviteId) return;
    this.api.acceptInvite(inviteId).subscribe((resp) => {
      this.api.markNotificationRead(note.id).subscribe();
      if (resp.conversationId) {
        this.router.navigate(['/chat', resp.conversationId]);
      }
      this.load();
    });
  }

  decline(note: NotificationItem) {
    const inviteId = note.payload?.['inviteId'];
    if (!inviteId) return;
    this.api.declineInvite(inviteId).subscribe(() => {
      this.api.markNotificationRead(note.id).subscribe();
      this.load();
    });
  }

  format(value: string) {
    return new Date(value).toLocaleString();
  }

  whenText(note: NotificationItem) {
    const value = note.payload?.['startsAt'] || note.createdAt;
    const date = new Date(value);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86400000);
    let label = date.toLocaleDateString(undefined, { weekday: 'long' });
    if (diffDays === 0) label = 'Today';
    if (diffDays === 1) label = 'Tomorrow';
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${label} • ${time}`;
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }
}
