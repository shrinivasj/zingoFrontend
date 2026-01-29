import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../core/api.service';
import { LobbyUser } from '../core/models';

interface ProfileDialogData {
  user: LobbyUser;
  showtimeId: number;
}

@Component({
  selector: 'app-profile-card-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="card">
      <div
        class="hero"
        [style.backgroundImage]="data.user.avatarUrl ? 'url(' + data.user.avatarUrl + ')' : ''"
        [class.has-image]="!!data.user.avatarUrl"
      >
        <button class="close" (click)="close()" aria-label="Close">×</button>
      </div>

      <div class="body">
        <h2>{{ data.user.displayName }}</h2>
        <p class="bio">{{ data.user.bioShort || 'Love thriller movies and good conversation' }}</p>

        <div class="section">
          <div class="section-title">Personality</div>
          <div class="chip-row">
            <span class="chip filled" *ngFor="let tag of personalityTags">{{ tag }}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Favorite Genres</div>
          <div class="chip-row">
            <span class="chip outlined" *ngFor="let genre of favoriteGenres">{{ genre }}</span>
          </div>
        </div>

        <button class="cta" (click)="invite()">Go to this movie together</button>

        <div class="footer-actions">
          <button class="ghost" (click)="block()">
            <span class="material-icons">block</span>
            Block
          </button>
          <button class="ghost" (click)="report()">
            <span class="material-icons">flag</span>
            Report
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #000000;
      }
      .card {
        background: #ffffff;
        border-radius: 22px;
        overflow: hidden;
      }
      .hero {
        height: 170px;
        background: #e7e7e7;
        background-size: cover;
        background-position: center;
        position: relative;
      }
      .close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: none;
        background: rgba(255, 255, 255, 0.9);
        font-size: 22px;
        cursor: pointer;
      }
      .body {
        padding: 18px 20px 22px;
        display: grid;
        gap: 14px;
      }
      h2 {
        margin: 0;
        font-size: 26px;
      }
      .bio {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        font-size: 16px;
      }
      .section {
        display: grid;
        gap: 10px;
      }
      .section-title {
        font-weight: 600;
        color: rgba(0, 0, 0, 0.6);
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .chip {
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 14px;
      }
      .chip.filled {
        background: #f1f1f1;
      }
      .chip.outlined {
        border: 1px solid #e0e0e0;
        background: #ffffff;
      }
      .cta {
        background: #fc5054;
        color: #ffffff;
        border: none;
        border-radius: 16px;
        padding: 14px 16px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(252, 80, 84, 0.25);
      }
      .footer-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
      }
      .ghost {
        background: transparent;
        border: none;
        color: rgba(0, 0, 0, 0.6);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 15px;
        cursor: pointer;
      }
      .ghost .material-icons {
        font-size: 18px;
      }
    `
  ]
})
export class ProfileCardDialogComponent {
  initials: string;
  personalityTags: string[];
  favoriteGenres = ['Thriller', 'Drama', 'Indie'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProfileDialogData,
    private dialogRef: MatDialogRef<ProfileCardDialogComponent>,
    private api: ApiService
  ) {
    this.initials = data.user.displayName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    this.personalityTags = data.user.personalityTags?.length ? data.user.personalityTags : ['Funny', 'Movie Buff'];
  }

  invite() {
    this.api.createInvite(this.data.user.userId, this.data.showtimeId).subscribe(() => {
      this.dialogRef.close(true);
    });
  }

  close() {
    this.dialogRef.close();
  }

  block() {
    this.api.blockUser(this.data.user.userId).subscribe(() => this.dialogRef.close(true));
  }

  report() {
    this.api.reportUser(this.data.user.userId, 'Inappropriate behavior').subscribe(() => this.dialogRef.close(true));
  }
}
