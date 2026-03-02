import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Conversation, Message } from '../core/models';
import { StompService } from '../core/stomp.service';
import { StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../core/auth.service';
import { E2eeService } from '../core/e2ee.service';
import { LobbyPresenceService } from '../core/lobby-presence.service';
import { Subscription, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="chat-page">
      <header class="chat-header" *ngIf="conversation">
        <button class="back-btn" (click)="goBack()" aria-label="Back">←</button>
        <div
          class="avatar"
          [style.backgroundImage]="avatarUrl ? 'url(' + avatarUrl + ')' : ''"
          [class.has-image]="!!avatarUrl"
        ></div>
        <div class="head-text">
          <div class="name">{{ displayName || 'Chat' }}</div>
          <div class="meta">{{ headerMeta() }}</div>
        </div>
      </header>

      <div class="messages" #messagesList (scroll)="onMessagesScroll()">
        <div class="message" *ngFor="let msg of messages">
          <div class="bubble" [class.self]="msg.senderId === currentUserId">
            <div class="sender" *ngIf="showSender(msg)">{{ senderNameFor(msg) }}</div>
            <span class="text">{{ msg.text }}</span>
            <span class="bubble-meta" [class.self]="msg.senderId === currentUserId">
              {{ timeLabel(msg.createdAt) }}<span class="ticks" *ngIf="msg.senderId === currentUserId"> ✓✓</span>
            </span>
          </div>
        </div>
      </div>

      <p class="secure-note" [class.error]="!secureReady">{{ secureMessage }}</p>

      <div class="icebreakers" *ngIf="icebreakers.length">
        <button class="chip" *ngFor="let suggestion of icebreakers" (click)="useIcebreaker(suggestion)">
          {{ suggestion }}
        </button>
      </div>

      <form class="composer" [formGroup]="form" (ngSubmit)="send()">
        <input class="input" placeholder="Type a message..." formControlName="text" />
        <button class="send" type="submit" [disabled]="form.invalid || !secureReady">➤</button>
      </form>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: var(--zingo-ink);
        background:
          radial-gradient(circle at 12% 18%, rgba(254, 243, 232, 0.9), transparent 35%),
          radial-gradient(circle at 88% 74%, rgba(228, 241, 241, 0.9), transparent 32%),
          #ffffff;
        height: calc(100vh - 80px);
        height: calc(100dvh - 80px);
      }
      .chat-page {
        display: grid;
        grid-template-rows: auto 1fr auto auto;
        height: 100%;
        min-height: 0;
      }
      .chat-header {
        display: grid;
        grid-template-columns: 36px 48px 1fr;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(15, 28, 36, 0.1);
        background: linear-gradient(180deg, var(--zingo-warm) 0%, #ffffff 100%);
      }
      .back-btn {
        border: none;
        background: transparent;
        font-size: 26px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        color: var(--zingo-primary);
      }
      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: var(--zingo-cool);
        background-size: cover;
        background-position: center;
      }
      .avatar.has-image {
        color: transparent;
      }
      .name {
        font-weight: 700;
        font-size: 18px;
        color: var(--zingo-ink);
      }
      .meta {
        color: var(--zingo-muted);
        font-size: 15px;
        margin-top: 2px;
      }
      .messages {
        padding: 12px 12px 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
        min-height: 0;
      }
      .message {
        display: flex;
      }
      .bubble {
        position: relative;
        width: fit-content;
        padding: 7px 58px 7px 10px;
        border-radius: 8px;
        background: var(--zingo-cool);
        max-width: 82%;
        font-size: 16px;
        line-height: 1.2;
        min-height: 0;
        color: var(--zingo-ink);
        margin-right: auto;
        box-shadow: 0 1px 0 rgba(15, 28, 36, 0.16);
      }
      .bubble.self {
        margin-left: auto;
        margin-right: 0;
        background: var(--zingo-accent);
        color: #ffffff;
      }
      .text {
        word-break: break-word;
        white-space: pre-wrap;
      }
      .sender {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 4px;
        color: rgba(15, 28, 36, 0.72);
      }
      .bubble-meta {
        position: absolute;
        right: 10px;
        bottom: 4px;
        font-size: 11px;
        color: rgba(15, 28, 36, 0.58);
      }
      .bubble-meta.self {
        color: rgba(255, 255, 255, 0.86);
      }
      .ticks {
        letter-spacing: -1px;
      }
      .icebreakers {
        display: flex;
        gap: 10px;
        padding: 8px 12px;
        overflow-x: auto;
        background: transparent;
      }
      .secure-note {
        margin: 0;
        padding: 4px 12px;
        color: var(--zingo-primary);
        font-size: 12px;
        font-weight: 600;
        background: transparent;
      }
      .secure-note.error {
        color: #b42318;
      }
      .chip {
        border-radius: 999px;
        padding: 8px 12px;
        border: 1px solid rgba(27, 58, 75, 0.2);
        background: #ffffff;
        color: var(--zingo-primary);
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .composer {
        display: grid;
        grid-template-columns: 1fr 56px;
        gap: 12px;
        padding: 8px 10px 12px;
        background: #ffffff;
        border-top: 1px solid rgba(15, 28, 36, 0.08);
      }
      .input {
        border-radius: 999px;
        border: none;
        background: #f3f7f7;
        color: var(--zingo-ink);
        padding: 10px 14px;
        font-size: 16px;
        outline: none;
      }
      .input::placeholder {
        color: var(--zingo-muted);
      }
      .send {
        border: none;
        border-radius: 999px;
        background: var(--zingo-accent);
        color: #ffffff;
        font-size: 18px;
        cursor: pointer;
      }
    `
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  private static readonly UNDECRYPTABLE_PLACEHOLDER = '[Message unavailable on this device]';
  conversationId!: number;
  conversation?: Conversation;
  messages: Message[] = [];
  icebreakers: string[] = [];
  currentUserId?: number;
  subscription?: StompSubscription | null;
  avatarUrl = '';
  displayName = '';
  participantLabel = '';
  isGroupConversation = false;
  secureReady = false;
  secureMessage = 'Setting up end-to-end encryption...';
  private otherUserPublicKey: string | null = null;
  @ViewChild('messagesList') private messagesList?: ElementRef<HTMLDivElement>;
  private stickToBottom = true;
  private bootstrapComplete = false;
  private pendingIncomingMessages: Message[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;
  private reconnectSub?: Subscription;

  form = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private stomp: StompService,
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private e2ee: E2eeService,
    private cdr: ChangeDetectorRef,
    private lobbyPresence: LobbyPresenceService
  ) {}

  ngOnInit() {
    this.conversationId = Number(this.route.snapshot.paramMap.get('conversationId'));
    this.subscription = this.stomp.subscribe(`/topic/chat.${this.conversationId}`, (message) => {
      const payload = JSON.parse(message.body) as Message;
      if (!this.bootstrapComplete) {
        this.pendingIncomingMessages.push(payload);
        return;
      }
      void this.handleIncoming(payload);
    });

    this.bootstrap();
    this.refreshTimer = setInterval(() => {
      if (!this.bootstrapComplete) return;
      void this.loadMessages();
    }, 7000);
    this.reconnectSub = this.stomp.connected$.subscribe((connected) => {
      if (!connected || !this.bootstrapComplete) return;
      void this.loadMessages();
    });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.reconnectSub?.unsubscribe();
  }

  send() {
    if (this.form.invalid || !this.secureReady || !this.otherUserPublicKey) return;
    const text = this.form.value.text!;
    this.e2ee
      .encryptForConversation(text, this.otherUserPublicKey, this.conversationId)
      .then((cipherText) => {
        this.api.sendMessage(this.conversationId, cipherText).subscribe({
          next: (message) => {
            this.form.reset();
            void this.handleIncoming(message);
          }
        });
      })
      .catch(() => {
        this.secureReady = false;
        this.secureMessage = 'Unable to encrypt message. Refresh chat to re-establish secure channel.';
        this.cdr.detectChanges();
      });
  }

  useIcebreaker(text: string) {
    this.form.patchValue({ text });
  }

  block() {
    if (!this.conversation) return;
    const otherUserId = this.conversation.memberIds.find((id) => id !== this.currentUserId);
    if (!otherUserId) return;
    this.api.blockUser(otherUserId).subscribe();
  }

  report() {
    if (!this.conversation) return;
    const otherUserId = this.conversation.memberIds.find((id) => id !== this.currentUserId);
    if (!otherUserId) return;
    this.api.reportUser(otherUserId, 'Inappropriate behavior').subscribe();
  }

  leave() {
    this.api.leaveConversation(this.conversationId).subscribe(() => {
      this.router.navigate(['/chats']);
    });
  }

  timeLabel(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  goBack() {
    this.router.navigate(['/chats']);
  }

  onMessagesScroll() {
    const el = this.messagesList?.nativeElement;
    if (!el) return;
    const threshold = 120;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.stickToBottom = distanceFromBottom <= threshold;
  }

  private scrollToBottomSoon() {
    requestAnimationFrame(() => this.scrollToBottom());
  }

  private scrollToBottom() {
    const el = this.messagesList?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  private async bootstrap() {
    try {
      const cachedUser = this.auth.getCurrentUser();
      if (cachedUser) {
        this.currentUserId = cachedUser.id;
      } else {
        const me = await firstValueFrom(this.api.me());
        this.currentUserId = me.id;
      }

      const [profile, conversations] = await Promise.all([
        firstValueFrom(this.api.getProfile()),
        firstValueFrom(this.api.getConversations())
      ]);

      this.conversation = conversations.find((c) => c.id === this.conversationId);
      if (!this.conversation) {
        this.secureReady = false;
        this.secureMessage = 'Conversation not found.';
        this.cdr.detectChanges();
        return;
      }

      this.isGroupConversation = (this.conversation.memberIds?.length || 0) > 2 || (this.conversation.participantNames?.length || 0) > 1;
      if (this.isGroupConversation) {
        this.displayName = this.conversation.eventTitle || 'Trek Group';
        const names = (this.conversation.participantNames || []).filter((name) => !!name);
        this.participantLabel = names.length ? names.join(', ') : 'Group members';
        this.avatarUrl = this.conversation.eventPosterUrl || '';
      } else {
        this.displayName = this.conversation.otherUserName || 'Chat';
        this.participantLabel = this.conversation.eventTitle || '';
        this.avatarUrl = this.conversation.otherUserAvatarUrl || '';
        if (this.conversation.showtimeId) {
          this.lobbyPresence.exitLobby(this.conversation.showtimeId).subscribe({ error: () => {} });
        }
      }
      this.otherUserPublicKey = this.conversation.otherUserE2eePublicKey || null;
      const messagesPromise = firstValueFrom(this.api.getMessages(this.conversationId));

      const ownPublicKey = await this.e2ee.ensureLocalPublicKey();
      const hasRemotePublicKey = !!profile.e2eePublicKey;
      const keyMismatch = hasRemotePublicKey && profile.e2eePublicKey !== ownPublicKey;
      if (!hasRemotePublicKey) {
        this.api.updateProfile({ e2eePublicKey: ownPublicKey }).subscribe({ error: () => {} });
      }

      if (keyMismatch) {
        this.secureReady = false;
        this.secureMessage = 'Encryption keys are out of sync on this device. Log out and sign in again.';
      } else if (!this.otherUserPublicKey) {
        this.secureReady = false;
        this.secureMessage = 'Waiting for the other user to enable secure chat.';
      } else {
        this.secureReady = true;
        this.secureMessage = 'End-to-end encryption is active.';
      }
      this.cdr.detectChanges();

      if (this.conversation.showtimeId) {
        this.api.getIcebreakers(this.conversation.showtimeId).subscribe((resp) => (this.icebreakers = resp.suggestions));
      }

      await this.loadMessages(messagesPromise);
      this.bootstrapComplete = true;
      if (this.pendingIncomingMessages.length) {
        const queued = [...this.pendingIncomingMessages];
        this.pendingIncomingMessages = [];
        for (const queuedMessage of queued) {
          await this.handleIncoming(queuedMessage);
        }
      }
    } catch {
      this.secureReady = false;
      this.secureMessage = 'Failed to initialize secure chat.';
      this.bootstrapComplete = true;
      this.pendingIncomingMessages = [];
      this.cdr.detectChanges();
    }
  }

  private async loadMessages(messagesPromise?: Promise<Message[]>) {
    const messages = messagesPromise ? await messagesPromise : await firstValueFrom(this.api.getMessages(this.conversationId));
    const decoded = await Promise.all(messages.map((message) => this.decodeMessage(message)));
    this.messages = this.sortMessagesAscending(decoded);
    this.updateEncryptionStatusForHistory();
    this.cdr.detectChanges();
    this.stickToBottom = true;
    this.scrollToBottomSoon();
  }

  private async handleIncoming(message: Message) {
    if (this.messages.some((item) => item.id === message.id)) {
      return;
    }
    const decoded = await this.decodeMessage(message);
    this.messages = this.sortMessagesAscending([...this.messages, decoded]);
    this.updateEncryptionStatusForHistory();
    this.cdr.detectChanges();
    if (this.stickToBottom) {
      this.scrollToBottomSoon();
    }
  }

  private async decodeMessage(message: Message): Promise<Message> {
    if (!this.otherUserPublicKey) {
      return {
        ...message,
        text: message.text.startsWith('enc:v1:') ? ChatComponent.UNDECRYPTABLE_PLACEHOLDER : message.text
      };
    }
    try {
      const text = await this.e2ee.decryptFromConversation(message.text, this.otherUserPublicKey, this.conversationId);
      return { ...message, text };
    } catch {
      return { ...message, text: ChatComponent.UNDECRYPTABLE_PLACEHOLDER };
    }
  }

  private updateEncryptionStatusForHistory() {
    const unavailableCount = this.messages.filter((message) => message.text === ChatComponent.UNDECRYPTABLE_PLACEHOLDER).length;
    if (!this.secureReady || unavailableCount === 0) {
      return;
    }
    this.secureMessage = `End-to-end encryption is active. ${unavailableCount} older message(s) are unavailable on this device.`;
  }

  private sortMessagesAscending(messages: Message[]) {
    return [...messages].sort((a, b) => {
      const timeDiff = this.parseMessageTime(a.createdAt) - this.parseMessageTime(b.createdAt);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }

  private parseMessageTime(value?: string | null) {
    if (!value) {
      return 0;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  headerMeta() {
    if (!this.conversation) {
      return '';
    }
    const time = this.timeLabel(this.conversation.startsAt);
    if (this.participantLabel && time) {
      return `${this.participantLabel} • ${time}`;
    }
    return this.participantLabel || time || '';
  }

  showSender(message: Message) {
    return this.isGroupConversation && message.senderId !== this.currentUserId;
  }

  senderNameFor(message: Message) {
    const map = this.conversation?.participantNameByUserId || {};
    const fromMap = map[String(message.senderId)];
    if (fromMap && fromMap.trim()) {
      return fromMap;
    }
    if (message.senderName && message.senderName.trim()) {
      return message.senderName;
    }
    return 'Member';
  }
}
