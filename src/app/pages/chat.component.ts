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
import { firstValueFrom } from 'rxjs';

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
          <div class="meta">{{ conversation.eventTitle }} • {{ timeLabel(conversation.startsAt) }}</div>
        </div>
      </header>

      <div class="messages" #messagesList (scroll)="onMessagesScroll()">
        <div class="message" *ngFor="let msg of messages">
          <div class="bubble" [class.self]="msg.senderId === currentUserId">{{ msg.text }}</div>
          <div class="time" [class.self]="msg.senderId === currentUserId">{{ timeLabel(msg.createdAt) }}</div>
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
        color: #000000;
        background: #ffffff;
        height: 100%;
      }
      .chat-page {
        display: grid;
        grid-template-rows: auto 1fr auto auto;
        height: 100%;
      }
      .chat-header {
        display: grid;
        grid-template-columns: 36px 48px 1fr;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
      }
      .back-btn {
        border: none;
        background: transparent;
        font-size: 26px;
        width: 36px;
        height: 36px;
        cursor: pointer;
      }
      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: #e6e6e6;
        background-size: cover;
        background-position: center;
      }
      .avatar.has-image {
        color: transparent;
      }
      .name {
        font-weight: 700;
        font-size: 18px;
      }
      .meta {
        color: rgba(0, 0, 0, 0.55);
        font-size: 15px;
        margin-top: 2px;
      }
      .messages {
        padding: 18px 16px 8px;
        display: grid;
        gap: 12px;
        overflow-y: auto;
      }
      .message {
        display: grid;
        gap: 6px;
      }
      .bubble {
        padding: 14px 16px;
        border-radius: 18px;
        background: #f2f2f2;
        max-width: 80%;
        font-size: 18px;
        line-height: 1.3;
      }
      .bubble.self {
        margin-left: auto;
        background: #fc5054;
        color: #ffffff;
      }
      .time {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.5);
      }
      .time.self {
        text-align: right;
      }
      .icebreakers {
        display: flex;
        gap: 10px;
        padding: 10px 16px;
        overflow-x: auto;
      }
      .secure-note {
        margin: 0;
        padding: 4px 16px;
        color: #0f7b36;
        font-size: 12px;
        font-weight: 600;
      }
      .secure-note.error {
        color: #b42318;
      }
      .chip {
        border-radius: 999px;
        padding: 10px 16px;
        border: none;
        background: #f1f1f1;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .composer {
        display: grid;
        grid-template-columns: 1fr 56px;
        gap: 12px;
        padding: 12px 16px 18px;
      }
      .input {
        border-radius: 999px;
        border: none;
        background: #f3f3f3;
        padding: 14px 18px;
        font-size: 16px;
        outline: none;
      }
      .send {
        border: none;
        border-radius: 999px;
        background: #fc5054;
        color: #ffffff;
        font-size: 18px;
        cursor: pointer;
      }
    `
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  conversationId!: number;
  conversation?: Conversation;
  messages: Message[] = [];
  icebreakers: string[] = [];
  currentUserId?: number;
  subscription?: StompSubscription | null;
  avatarUrl = '';
  displayName = '';
  secureReady = false;
  secureMessage = 'Setting up end-to-end encryption...';
  private otherUserPublicKey: string | null = null;
  @ViewChild('messagesList') private messagesList?: ElementRef<HTMLDivElement>;
  private stickToBottom = true;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.conversationId = Number(this.route.snapshot.paramMap.get('conversationId'));
    this.subscription = this.stomp.subscribe(`/topic/chat.${this.conversationId}`, (message) => {
      const payload = JSON.parse(message.body) as Message;
      void this.handleIncoming(payload);
    });

    this.bootstrap();
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
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

      this.displayName = this.conversation.otherUserName || 'Chat';
      this.avatarUrl = this.conversation.otherUserAvatarUrl || '';
      this.otherUserPublicKey = this.conversation.otherUserE2eePublicKey || null;

      const ownPublicKey = await this.e2ee.ensureLocalPublicKey();
      if (profile.e2eePublicKey !== ownPublicKey) {
        await firstValueFrom(this.api.updateProfile({ e2eePublicKey: ownPublicKey }));
      }

      if (!this.otherUserPublicKey) {
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

      await this.loadMessages();
    } catch {
      this.secureReady = false;
      this.secureMessage = 'Failed to initialize secure chat.';
      this.cdr.detectChanges();
    }
  }

  private async loadMessages() {
    const messages = await firstValueFrom(this.api.getMessages(this.conversationId));
    const decoded = await Promise.all(messages.map((message) => this.decodeMessage(message)));
    this.messages = decoded;
    this.cdr.detectChanges();
    this.stickToBottom = true;
    this.scrollToBottomSoon();
  }

  private async handleIncoming(message: Message) {
    if (this.messages.some((item) => item.id === message.id)) {
      return;
    }
    const decoded = await this.decodeMessage(message);
    this.messages = [...this.messages, decoded];
    this.cdr.detectChanges();
    if (this.stickToBottom) {
      this.scrollToBottomSoon();
    }
  }

  private async decodeMessage(message: Message): Promise<Message> {
    if (!this.otherUserPublicKey) {
      return {
        ...message,
        text: message.text.startsWith('enc:v1:') ? '[Encrypted message]' : message.text
      };
    }
    try {
      const text = await this.e2ee.decryptFromConversation(message.text, this.otherUserPublicKey, this.conversationId);
      return { ...message, text };
    } catch {
      return { ...message, text: '[Unable to decrypt message]' };
    }
  }
}
