import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Conversation, Message } from '../core/models';
import { StompService } from '../core/stomp.service';
import { StompSubscription } from '@stomp/stompjs';

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

      <div class="messages">
        <div class="message" *ngFor="let msg of messages">
          <div class="bubble" [class.self]="msg.senderId === currentUserId">{{ msg.text }}</div>
          <div class="time" [class.self]="msg.senderId === currentUserId">{{ timeLabel(msg.createdAt) }}</div>
        </div>
      </div>

      <div class="icebreakers" *ngIf="icebreakers.length">
        <button class="chip" *ngFor="let suggestion of icebreakers" (click)="useIcebreaker(suggestion)">
          {{ suggestion }}
        </button>
      </div>

      <form class="composer" [formGroup]="form" (ngSubmit)="send()">
        <input class="input" placeholder="Type a message..." formControlName="text" />
        <button class="send" type="submit" [disabled]="form.invalid">➤</button>
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

  form = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(1000)]]
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private stomp: StompService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit() {
    this.conversationId = Number(this.route.snapshot.paramMap.get('conversationId'));
    this.api.me().subscribe((user) => {
      this.currentUserId = user.id;
    });
    this.api.getConversations().subscribe((convos) => {
      this.conversation = convos.find((c) => c.id === this.conversationId);
      if (this.conversation) {
        this.displayName = this.conversation.otherUserName || 'Chat';
        this.avatarUrl = this.conversation.otherUserAvatarUrl || '';
      }
      if (this.conversation?.showtimeId) {
        this.api.getIcebreakers(this.conversation.showtimeId).subscribe((resp) => (this.icebreakers = resp.suggestions));
      }
    });
    this.loadMessages();

    this.subscription = this.stomp.subscribe(`/topic/chat.${this.conversationId}`, (message) => {
      const payload = JSON.parse(message.body) as Message;
      this.messages = [...this.messages, payload];
    });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  loadMessages() {
    this.api.getMessages(this.conversationId).subscribe((messages) => (this.messages = messages));
  }

  send() {
    if (this.form.invalid) return;
    const text = this.form.value.text!;
    this.api.sendMessage(this.conversationId, text).subscribe(() => {
      this.form.reset();
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
}
