import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../core/api.service';
import { LobbyUser } from '../core/models';
import { StompService } from '../core/stomp.service';
import { ProfileCardDialogComponent } from '../components/profile-card.dialog';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <section class="lobby">
      <button class="back-btn" (click)="goBack()" aria-label="Back">←</button>

      <div class="header">
        <h1>People going for this show</h1>
        <p class="subtitle">Tap on someone to see their profile</p>
        <p class="joined">{{ liveCount }} people joined this lobby</p>
      </div>

      <div class="orbit">
        <div class="orbit-ring"></div>
        <div
          class="you-node"
          [class.has-image]="!!currentAvatarUrl"
          [style.backgroundImage]="currentAvatarUrl ? 'url(' + currentAvatarUrl + ')' : ''"
        >
          <span class="you-label">You</span>
        </div>

        <button
          class="orbit-item"
          *ngFor="let user of orbitUsers; let i = index"
          [style.--i]="i"
          [style.--count]="orbitUsers.length"
          (click)="openProfile(user)"
          aria-label="View profile"
        >
          <div
            class="avatar"
            [style.backgroundImage]="user.avatarUrl ? 'url(' + user.avatarUrl + ')' : ''"
            [class.has-image]="!!user.avatarUrl"
          >
            {{ user.avatarUrl ? '' : initials(user.displayName) }}
          </div>
          <div class="name">{{ firstName(user.displayName) }}</div>
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #ffffff;
        color: #000000;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      .lobby {
        padding: 20px 20px 32px;
      }
      .back-btn {
        border: none;
        background: transparent;
        font-size: 28px;
        width: 44px;
        height: 44px;
        cursor: pointer;
      }
      .header h1 {
        margin: 8px 0 6px;
        font-size: 26px;
        line-height: 1.2;
      }
      .subtitle {
        margin: 0;
        color: rgba(0, 0, 0, 0.55);
        font-size: 16px;
      }
      .joined {
        margin-top: 10px;
        color: #fc5054;
        font-weight: 600;
        font-size: 16px;
      }
      .orbit {
        position: relative;
        width: min(340px, 85vw);
        height: min(340px, 85vw);
        margin: 20px auto 0;
      }
      .orbit-ring {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        border: 1px solid rgba(0, 0, 0, 0.12);
      }
      .you-node {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 76px;
        height: 76px;
        transform: translate(-50%, -50%);
        background: #fc5054;
        background-size: cover;
        background-position: center;
        color: #ffffff;
        border-radius: 9999px;
        display: grid;
        place-items: center;
        font-weight: 700;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
        z-index: 2;
      }
      .you-node.has-image {
        color: transparent;
      }
      .you-label {
        font-size: 14px;
        font-weight: 700;
        z-index: 2;
        background: rgba(0, 0, 0, 0.35);
        padding: 2px 8px;
        border-radius: 999px;
      }
      .you-node.has-image .you-label {
        color: #ffffff;
      }
      .you-node::before,
      .you-node::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 9999px;
        border: 2px solid rgba(252, 80, 84, 0.3);
        animation: pulseRing 1.8s ease-out infinite;
      }
      .you-node::after {
        animation-delay: 0.9s;
      }
      @keyframes pulseRing {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        100% {
          transform: scale(2.5);
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .you-node::before,
        .you-node::after {
          animation: none;
        }
      }
      .orbit-item {
        --orbit-radius: 150px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: rotate(calc(360deg / var(--count) * var(--i)))
          translate(var(--orbit-radius))
          rotate(calc(-360deg / var(--count) * var(--i)));
        transform-origin: center;
        display: grid;
        justify-items: center;
        gap: 6px;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        z-index: 1;
      }
      .avatar {
        width: 58px;
        height: 58px;
        border-radius: 9999px;
        background: #e6e6e6;
        background-size: cover;
        background-position: center;
        display: grid;
        place-items: center;
        font-weight: 700;
        color: #000000;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        border: 3px solid #ffffff;
        position: relative;
      }
      .avatar.has-image {
        color: transparent;
      }
      .avatar::before,
      .avatar::after {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 9999px;
        border: 1.5px solid rgba(252, 80, 84, 0.22);
        animation: pulseRingSmall 2s ease-out infinite;
      }
      .avatar::after {
        animation-delay: 1s;
      }
      .name {
        font-size: 14px;
      }
      @keyframes pulseRingSmall {
        0% {
          transform: scale(1);
          opacity: 0.7;
        }
        100% {
          transform: scale(1.7);
          opacity: 0;
        }
      }
      @media (max-width: 360px) {
        .orbit {
          width: min(300px, 82vw);
          height: min(300px, 82vw);
        }
        .orbit-item {
          --orbit-radius: 132px;
        }
        .avatar {
          width: 52px;
          height: 52px;
        }
        .you-node {
          width: 70px;
          height: 70px;
        }
      }
    `
  ]
})
export class LobbyComponent implements OnInit, OnDestroy {
  showtimeId!: number;
  users: LobbyUser[] = [];
  orbitUsers: LobbyUser[] = [];
  liveCount = 0;
  currentAvatarUrl = '';
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private subscription?: StompSubscription | null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private stomp: StompService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit() {
    this.showtimeId = Number(this.route.snapshot.paramMap.get('showtimeId'));
    this.api.joinLobby(this.showtimeId).subscribe((update: any) => {
      this.liveCount = update.count ?? 0;
    });
    this.api.getProfile().subscribe((profile) => {
      this.currentAvatarUrl = profile.avatarUrl || '';
    });
    this.refreshUsers();
    this.heartbeatTimer = setInterval(() => this.api.heartbeat(this.showtimeId).subscribe(), 30000);

    this.subscription = this.stomp.subscribe(`/topic/lobby.${this.showtimeId}`, (message) => {
      const payload = JSON.parse(message.body);
      this.liveCount = payload.count ?? this.liveCount;
    });
  }

  ngOnDestroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.subscription) this.subscription.unsubscribe();
  }

  refreshUsers() {
    this.api.lobbyUsers(this.showtimeId).subscribe((resp) => {
      this.users = resp.users;
      this.orbitUsers = this.users.slice(0, 12);
      this.liveCount = resp.total;
    });
  }

  openProfile(user: LobbyUser) {
    this.dialog
      .open(ProfileCardDialogComponent, {
        data: { user, showtimeId: this.showtimeId },
        width: '92vw',
        maxWidth: '420px',
        panelClass: 'profile-dialog-panel'
      })
      .afterClosed()
      .subscribe(() => this.refreshUsers());
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  firstName(name: string) {
    return name.split(' ')[0] || name;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
