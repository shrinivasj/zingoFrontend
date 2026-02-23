import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './core/auth.service';
import { ApiService } from './core/api.service';
import { StompService } from './core/stomp.service';
import { Conversation, Message, NotificationItem } from './core/models';
import { LobbyPresenceService } from './core/lobby-presence.service';
import { LoadingService } from './core/loading.service';
import { MobilePushService } from './core/mobile-push.service';
import { Subscription, take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  user$ = this.authService.user$;
  loading$ = this.loadingService.loading$;
  private sub = new Subscription();
  private readonly authTraceEnabled = true;
  isOwner = false;
  unreadChatCount = 0;
  hideTopbar = false;
  showBottomNav = false;
  private currentUrl = '';
  private readonly chatSeenStorageKey = 'zingo_chat_seen_by_conversation';
  private chatSeenByConversation = new Map<number, number>();
  private latestMessageByConversation = new Map<number, number>();
  private notificationSub?: StompSubscription | null;
  private chatSubs = new Map<number, StompSubscription>();
  private conversationNameById = new Map<number, string>();
  private conversationSyncTimer?: ReturnType<typeof setInterval>;
  private chatNotificationsStarted = false;
  private syncingConversations = false;

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private stompService: StompService,
    private lobbyPresenceService: LobbyPresenceService,
    private loadingService: LoadingService,
    private mobilePushService: MobilePushService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    this.loadSeenMapFromStorage();

    this.sub.add(
      this.authService.user$.subscribe(() => {
        const token = this.authService.getToken();
        this.traceAuth('user$ emission', { hasToken: !!token, currentUrl: this.currentUrl });
        if (token && this.isAuthScreen(this.currentUrl)) {
          this.traceAuth('redirecting authenticated user from auth screen', { to: '/dashboard' });
          this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        }
        this.refreshOwnerAccess(token);
        this.updateBottomNav(token, this.currentUrl);
        if (token) {
          this.stompService.connect(token);
          this.mobilePushService.initForAuthenticatedUser();
          this.lobbyPresenceService.resumeActiveLobby();
          this.ensureNotificationSubscription();
          this.startChatNotifications();
        } else {
          this.isOwner = false;
          this.notificationSub?.unsubscribe();
          this.notificationSub = null;
          this.stopChatNotifications();
          this.latestMessageByConversation.clear();
          this.unreadChatCount = 0;
          this.mobilePushService.clearForLoggedOutUser();
          this.lobbyPresenceService.clearStoredPresence();
          this.stompService.disconnect();
        }
      })
    );

    this.sub.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.traceAuth('navigation end', { from: this.currentUrl, to: url, hasToken: !!this.authService.getToken() });
        this.currentUrl = url;
        this.hideTopbar =
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/dashboard') ||
          url.startsWith('/chats') ||
          url.startsWith('/notifications') ||
          url.startsWith('/settings') ||
          url.startsWith('/profile') ||
          url.startsWith('/lobby') ||
          url.startsWith('/chat');
        this.updateBottomNav(this.authService.getToken(), url);
        this.markRouteConversationAsSeen(url);
      })
    );
  }

  logout() {
    this.lobbyPresenceService.exitLobby().subscribe({
      complete: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    this.notificationSub?.unsubscribe();
    this.stopChatNotifications();
    this.sub.unsubscribe();
  }

  private updateBottomNav(token: string | null, url: string) {
    const hideForAuthScreens = this.isAuthScreen(url);
    this.showBottomNav = !!token && !hideForAuthScreens;
    this.traceAuth('bottom nav updated', { showBottomNav: this.showBottomNav, url, hasToken: !!token });
  }

  private isAuthScreen(url: string) {
    return url.startsWith('/login') || url.startsWith('/register');
  }

  private ensureNotificationSubscription() {
    if (this.notificationSub) {
      return;
    }
    this.notificationSub = this.stompService.subscribe('/user/queue/notifications', (message) => {
      let payload: NotificationItem | null = null;
      try {
        payload = JSON.parse(message.body) as NotificationItem;
      } catch {
        payload = null;
      }
      if (!payload) {
        return;
      }
      this.handleRealtimeNotification(payload);
    });
  }

  private handleRealtimeNotification(notification: NotificationItem) {
    this.showPopupForInvite(notification);
    // New invites and system updates can create/activate conversations.
    this.syncConversationSubscriptions();
  }

  private showPopupForInvite(notification: NotificationItem) {
    if (notification.type !== 'INVITE' || this.currentUrl.startsWith('/notifications')) {
      return;
    }
    const fromName = notification.payload?.['fromDisplayName'] || 'Someone';
    const eventTitle = notification.payload?.['eventTitle'] || 'a show';
    const snack = this.snackBar.open(`${fromName} sent you a request for ${eventTitle}`, 'View', {
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    snack
      .onAction()
      .pipe(take(1))
      .subscribe(() => this.router.navigate(['/notifications']));
  }

  private startChatNotifications() {
    if (this.chatNotificationsStarted) {
      return;
    }
    this.chatNotificationsStarted = true;
    this.syncConversationSubscriptions();
    this.conversationSyncTimer = setInterval(() => this.syncConversationSubscriptions(), 10000);
  }

  private stopChatNotifications() {
    if (this.conversationSyncTimer) {
      clearInterval(this.conversationSyncTimer);
      this.conversationSyncTimer = undefined;
    }
    this.chatSubs.forEach((sub) => sub.unsubscribe());
    this.chatSubs.clear();
    this.conversationNameById.clear();
    this.latestMessageByConversation.clear();
    this.chatNotificationsStarted = false;
    this.syncingConversations = false;
  }

  private syncConversationSubscriptions() {
    if (this.syncingConversations || !this.authService.getToken()) {
      return;
    }
    this.syncingConversations = true;
    this.api.getConversations(true).subscribe({
      next: (conversations) => {
        this.applyConversationSubscriptions(conversations);
        this.syncingConversations = false;
      },
      error: () => {
        this.syncingConversations = false;
      }
    });
  }

  private applyConversationSubscriptions(conversations: Conversation[]) {
    const activeIds = new Set<number>();
    for (const conversation of conversations) {
      if (!conversation?.id) {
        continue;
      }
      const id = conversation.id;
      activeIds.add(id);
      this.conversationNameById.set(id, conversation.otherUserName || 'Someone');
      const lastMessageAt = this.parseTimestamp(conversation.lastMessageAt);
      if (lastMessageAt !== null) {
        this.latestMessageByConversation.set(id, lastMessageAt);
      }
      if (this.chatSubs.has(id)) {
        continue;
      }
      const sub = this.stompService.subscribe(`/topic/chat.${id}`, (message) => {
        let payload: Message | null = null;
        try {
          payload = JSON.parse(message.body) as Message;
        } catch {
          payload = null;
        }
        if (!payload) {
          return;
        }
        this.showPopupForChat(payload, id);
      });
      this.chatSubs.set(id, sub);
    }

    for (const [id, sub] of this.chatSubs.entries()) {
      if (activeIds.has(id)) {
        continue;
      }
      sub.unsubscribe();
      this.chatSubs.delete(id);
      this.conversationNameById.delete(id);
      this.latestMessageByConversation.delete(id);
      this.chatSeenByConversation.delete(id);
    }

    this.markRouteConversationAsSeen(this.currentUrl);
    this.recomputeUnreadChatCount();
  }

  private showPopupForChat(message: Message, fallbackConversationId: number) {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (currentUserId && message.senderId === currentUserId) {
      return;
    }

    const conversationId = message.conversationId || fallbackConversationId;
    const lastMessageAt = this.parseTimestamp(message.createdAt) ?? Date.now();
    this.latestMessageByConversation.set(conversationId, lastMessageAt);
    if (this.currentUrl.startsWith(`/chat/${conversationId}`)) {
      this.markConversationAsSeen(conversationId, lastMessageAt);
      this.recomputeUnreadChatCount();
      return;
    }

    const otherName = this.conversationNameById.get(conversationId) || 'Someone';
    const snack = this.snackBar.open(`New message from ${otherName}`, 'Open', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    snack
      .onAction()
      .pipe(take(1))
      .subscribe(() => this.router.navigate(['/chat', conversationId]));
    this.recomputeUnreadChatCount();
  }

  private markRouteConversationAsSeen(url: string) {
    const conversationId = this.extractConversationIdFromUrl(url);
    if (!conversationId) {
      return;
    }
    const latestForConversation = this.latestMessageByConversation.get(conversationId) ?? Date.now();
    this.markConversationAsSeen(conversationId, latestForConversation);
    this.recomputeUnreadChatCount();
  }

  private extractConversationIdFromUrl(url: string): number | null {
    const match = url.match(/^\/chat\/(\d+)(?:$|[/?#])/);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  private parseTimestamp(value?: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private markConversationAsSeen(conversationId: number, timestamp: number) {
    this.chatSeenByConversation.set(conversationId, timestamp);
    this.saveSeenMapToStorage();
  }

  private recomputeUnreadChatCount() {
    let unreadCount = 0;
    for (const [conversationId, latestMessageAt] of this.latestMessageByConversation.entries()) {
      const seenAt = this.chatSeenByConversation.get(conversationId) ?? 0;
      if (latestMessageAt > seenAt) {
        unreadCount += 1;
      }
    }
    this.unreadChatCount = unreadCount;
  }

  private loadSeenMapFromStorage() {
    this.chatSeenByConversation.clear();
    try {
      const raw = localStorage.getItem(this.chatSeenStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      for (const [conversationIdText, seenAt] of Object.entries(parsed)) {
        const conversationId = Number(conversationIdText);
        if (!Number.isFinite(conversationId) || typeof seenAt !== 'number') {
          continue;
        }
        this.chatSeenByConversation.set(conversationId, seenAt);
      }
    } catch {
      // ignore invalid local storage state
    }
  }

  private saveSeenMapToStorage() {
    try {
      const payload: Record<string, number> = {};
      for (const [conversationId, seenAt] of this.chatSeenByConversation.entries()) {
        payload[String(conversationId)] = seenAt;
      }
      localStorage.setItem(this.chatSeenStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  private traceAuth(message: string, data?: Record<string, unknown>) {
    if (!this.authTraceEnabled) {
      return;
    }
    console.debug(`[auth-trace][AppComponent] ${message}`, data ?? {});
  }

  private refreshOwnerAccess(token: string | null) {
    if (!token) {
      this.isOwner = false;
      return;
    }
    this.api.getAdminStatus(true).subscribe({
      next: (status) => {
        this.isOwner = !!status.owner;
      },
      error: () => {
        this.isOwner = false;
      }
    });
  }
}
