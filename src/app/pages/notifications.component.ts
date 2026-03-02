import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import { NotificationItem } from '../core/models';
import { StompService } from '../core/stomp.service';
import { LobbyPresenceService } from '../core/lobby-presence.service';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
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
                {{ messageText(note) }}
              </div>
              <div class="movie">{{ eventTitle(note) }}</div>
              <div class="meta">{{ whenText(note) }}</div>
            </div>
          </div>

          <div class="actions" *ngIf="canRespond(note)">
            <button class="btn accept" (click)="accept(note)" [disabled]="isBusy(note)">
              {{ isBusy(note) ? 'Accepting...' : 'Accept' }}
            </button>
            <button class="btn pass" (click)="decline(note)" [disabled]="isBusy(note)">
              {{ isBusy(note) ? 'Working...' : 'Pass' }}
            </button>
          </div>
          <div class="actions" *ngIf="canOpenTrekChat(note)">
            <button class="btn accept" (click)="openTrekChat(note)">
              Open Chat
            </button>
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
      .btn:disabled {
        opacity: 0.7;
        cursor: default;
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
  private busyNotificationIds = new Set<number>();
  private hiddenNotificationIds = new Set<number>();

  constructor(private api: ApiService, private router: Router, private stomp: StompService, private snackBar: MatSnackBar, private lobbyPresence: LobbyPresenceService) {}

  ngOnInit() {
    this.load();
    this.subscription = this.stomp.subscribe('/user/queue/notifications', (message) => {
      const payload = JSON.parse(message.body) as NotificationItem;
      if (this.hiddenNotificationIds.has(payload.id) || this.isClosedInvite(payload)) {
        return;
      }
      this.notifications = [payload, ...this.notifications];
    });
  }

  load() {
    this.api.getNotifications().subscribe((items) => {
      this.notifications = items.filter((item) => !this.hiddenNotificationIds.has(item.id) && !this.isClosedInvite(item));
    });
  }

  fromName(note: NotificationItem) {
    return note.payload?.['fromDisplayName'] || 'Someone';
  }

  avatarUrl(note: NotificationItem) {
    return note.payload?.['fromAvatarUrl'] || '';
  }

  eventTitle(note: NotificationItem) {
    const payloadType = this.payloadType(note);
    if (payloadType === 'TREK_JOIN_REQUEST') {
      return note.payload?.['eventTitle'] || 'Trek join request';
    }
    if (payloadType === 'TREK_JOIN_APPROVED') {
      return 'Your trek request was approved';
    }
    if (payloadType === 'TREK_JOIN_DECLINED') {
      return 'Your trek request was declined';
    }
    return note.payload?.['eventTitle'] || note.payload?.['title'] || 'Movie invite';
  }

  accept(note: NotificationItem) {
    if (this.isBusy(note)) return;
    if (this.isTrekJoinRequest(note)) {
      const requestId = this.extractTrekJoinRequestId(note);
      if (!requestId) {
        this.snackBar.open('This request cannot be processed (missing trek request id).', 'Dismiss', { duration: 3500 });
        return;
      }
      this.busyNotificationIds.add(note.id);
      this.api
        .approveTrekJoinRequest(requestId)
        .pipe(finalize(() => this.busyNotificationIds.delete(note.id)))
        .subscribe({
          next: (resp) => {
            this.markHandled(note);
            const showtimeId = this.extractShowtimeId(note);
            if (showtimeId) {
              this.lobbyPresence.exitLobby(showtimeId).subscribe({ error: () => {} });
            }
            if (resp.conversationId) {
              this.router.navigate(['/chat', resp.conversationId]);
              return;
            }
            this.load();
          },
          error: (error) => this.handleActionError(error, note)
        });
      return;
    }
    const inviteId = this.extractInviteId(note);
    if (!inviteId) {
      this.snackBar.open('This request cannot be processed (missing invite id).', 'Dismiss', { duration: 3500 });
      return;
    }
    this.busyNotificationIds.add(note.id);
    this.api
      .acceptInvite(inviteId)
      .pipe(finalize(() => this.busyNotificationIds.delete(note.id)))
      .subscribe({
        next: (resp) => {
          this.markHandled(note);
          const showtimeId = this.extractShowtimeId(note);
          if (showtimeId) {
            this.lobbyPresence.exitLobby(showtimeId).subscribe({ error: () => {} });
          }
          if (resp.conversationId) {
            this.router.navigate(['/chat', resp.conversationId]);
            return;
          }
          this.load();
        },
        error: (error) => {
          this.handleActionError(error, note);
        }
      });
  }

  decline(note: NotificationItem) {
    if (this.isBusy(note)) return;
    if (this.isTrekJoinRequest(note)) {
      const requestId = this.extractTrekJoinRequestId(note);
      if (!requestId) {
        this.snackBar.open('This request cannot be processed (missing trek request id).', 'Dismiss', { duration: 3500 });
        return;
      }
      this.busyNotificationIds.add(note.id);
      this.api
        .declineTrekJoinRequest(requestId)
        .pipe(finalize(() => this.busyNotificationIds.delete(note.id)))
        .subscribe({
          next: () => {
            this.markHandled(note);
            this.load();
          },
          error: (error) => this.handleActionError(error, note)
        });
      return;
    }
    const inviteId = this.extractInviteId(note);
    if (!inviteId) {
      this.snackBar.open('This request cannot be processed (missing invite id).', 'Dismiss', { duration: 3500 });
      return;
    }
    this.busyNotificationIds.add(note.id);
    this.api
      .declineInvite(inviteId)
      .pipe(finalize(() => this.busyNotificationIds.delete(note.id)))
      .subscribe({
        next: () => {
          this.markHandled(note);
          this.load();
        },
        error: (error) => {
          this.handleActionError(error, note);
        }
      });
  }

  format(value: string) {
    return new Date(value).toLocaleString();
  }

  whenText(note: NotificationItem) {
    const value = note.payload?.['startsAt'] || note.createdAt;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Time not available';
    }
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

  isBusy(note: NotificationItem) {
    return this.busyNotificationIds.has(note.id);
  }

  canRespond(note: NotificationItem) {
    if (!!note.readAt) {
      return false;
    }
    if (this.isTrekJoinRequest(note)) {
      const status = this.requestStatus(note);
      return !status || status === 'PENDING';
    }
    if (note.type !== 'INVITE') {
      return false;
    }
    const status = this.inviteStatus(note);
    if (!status) {
      return true;
    }
    return status === 'PENDING';
  }

  private extractInviteId(note: NotificationItem): number | null {
    const raw = note.payload?.['inviteId'];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.trunc(raw);
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private markHandled(note: NotificationItem) {
    this.hiddenNotificationIds.add(note.id);
    this.notifications = this.notifications.filter((item) => item.id !== note.id);
    this.api.markNotificationRead(note.id).subscribe({ error: () => {} });
  }

  private isClosedInvite(note: NotificationItem) {
    if (this.isTrekJoinRequest(note)) {
      if (note.readAt) {
        return true;
      }
      const status = this.requestStatus(note);
      return !!status && status !== 'PENDING';
    }
    if (note.type !== 'INVITE') {
      return false;
    }
    if (note.readAt) {
      return true;
    }
    const status = this.inviteStatus(note);
    if (!status) {
      return false;
    }
    return status !== 'PENDING';
  }

  private inviteStatus(note: NotificationItem): string | null {
    const statusValue = note.payload?.['inviteStatus'];
    if (typeof statusValue !== 'string') {
      return null;
    }
    return statusValue.toUpperCase();
  }

  canOpenTrekChat(note: NotificationItem) {
    return this.isTrekJoinApproved(note);
  }

  openTrekChat(note: NotificationItem) {
    const conversationId = this.extractConversationId(note);
    if (!conversationId) {
      this.snackBar.open('Conversation is not ready yet.', 'Dismiss', { duration: 2500 });
      return;
    }
    this.markHandled(note);
    this.router.navigate(['/chat', conversationId]);
  }

  private extractTrekJoinRequestId(note: NotificationItem): number | null {
    const raw = note.payload?.['trekJoinRequestId'];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.trunc(raw);
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  messageText(note: NotificationItem) {
    const payloadType = this.payloadType(note);
    if (payloadType === 'TREK_JOIN_REQUEST') {
      return 'requested to join your trek group';
    }
    if (payloadType === 'TREK_JOIN_APPROVED') {
      return 'approved your trek request';
    }
    if (payloadType === 'TREK_JOIN_DECLINED') {
      return 'declined your trek request';
    }
    return 'wants to go to a movie with you';
  }

  private payloadType(note: NotificationItem): string {
    const raw = note.payload?.['type'];
    return typeof raw === 'string' ? raw.toUpperCase() : '';
  }

  private isTrekJoinRequest(note: NotificationItem): boolean {
    return note.type === 'SYSTEM' && this.payloadType(note) === 'TREK_JOIN_REQUEST';
  }

  private requestStatus(note: NotificationItem): string | null {
    const statusValue = note.payload?.['requestStatus'];
    if (typeof statusValue !== 'string') {
      return null;
    }
    return statusValue.toUpperCase();
  }

  private extractShowtimeId(note: NotificationItem): number | null {
    const raw = note.payload?.['showtimeId'];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.trunc(raw);
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private extractConversationId(note: NotificationItem): number | null {
    const raw = note.payload?.['conversationId'];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.trunc(raw);
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return null;
  }

  private isTrekJoinApproved(note: NotificationItem): boolean {
    if (note.readAt) {
      return false;
    }
    return note.type === 'SYSTEM' && this.payloadType(note) === 'TREK_JOIN_APPROVED' && this.extractConversationId(note) != null;
  }

  private handleActionError(error: any, note: NotificationItem) {
    const serverMessage = error?.error?.error;
    if (typeof serverMessage === 'string') {
      const normalized = serverMessage.toLowerCase();
      if (normalized.includes('already handled') || normalized.includes('not found')) {
        this.markHandled(note);
        this.snackBar.open('This request was already handled.', 'Dismiss', { duration: 2800 });
        return;
      }
      this.snackBar.open(serverMessage, 'Dismiss', { duration: 3500 });
      return;
    }
    this.snackBar.open('Could not process request. Please try again.', 'Dismiss', { duration: 3500 });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }
}
