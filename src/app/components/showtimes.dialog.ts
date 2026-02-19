import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Showtime } from '../core/models';

interface ShowtimesDialogData {
  showtimes: Showtime[];
  eventTitle?: string;
  venueName?: string;
  eventPosterUrl?: string | null;
}

@Component({
  selector: 'app-showtimes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="sheet">
      <div class="hero">
        <button class="close" (click)="close()" aria-label="Close">
          <span class="close-icon">×</span>
        </button>
        <div
          class="poster"
          [style.backgroundImage]="data.eventPosterUrl ? 'url(' + data.eventPosterUrl + ')' : ''"
          [class.has-image]="!!data.eventPosterUrl"
        ></div>
      </div>
      <div class="body">
        <h2 class="title">{{ data.eventTitle || 'Showtimes' }}</h2>
        <p class="subtitle">{{ data.venueName || 'Select a showtime to join' }}</p>

        <div class="showtime-list" *ngIf="data.showtimes.length; else emptyState">
          <div class="showtime-card" *ngFor="let showtime of data.showtimes">
            <div>
              <div class="time">{{ formatTime(showtime.startsAt) }}</div>
              <div class="joined">{{ joinedCount(showtime) }} people joined</div>
            </div>
            <button mat-flat-button class="join-btn" (click)="join(showtime.id)">Join Lobby</button>
          </div>
        </div>
        <ng-template #emptyState>
          <p class="empty muted">No showtimes available.</p>
        </ng-template>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        color: var(--zingo-ink);
      }
      .sheet {
        display: grid;
        background: #ffffff;
        max-height: 90vh;
        overflow: hidden;
      }
      .hero {
        position: relative;
        padding: 24px 24px 20px;
        background: linear-gradient(180deg, rgba(244, 162, 97, 0.35), rgba(244, 162, 97, 0.15));
        display: grid;
        place-items: center;
      }
      .poster {
        width: 160px;
        height: 200px;
        border-radius: 18px;
        background: rgba(244, 162, 97, 0.45);
        background-size: cover;
        background-position: center;
      }
      .close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: none;
        background: #e0e0e0;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .close-icon {
        font-size: 28px;
        line-height: 1;
        color: #111111;
      }
      .body {
        padding: 20px 24px 28px;
        display: grid;
        gap: 12px;
        min-height: 0;
      }
      .title {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      .subtitle {
        margin: 0;
        color: var(--zingo-muted);
        font-size: 16px;
      }
      .showtime-list {
        display: grid;
        gap: 16px;
        margin-top: 4px;
        max-height: 45vh;
        overflow: auto;
        padding-right: 4px;
      }
      .showtime-card {
        border: 1px solid #e3e3e3;
        border-radius: 20px;
        padding: 18px 18px 18px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: #ffffff;
      }
      .time {
        font-size: 20px;
        font-weight: 700;
      }
      .joined {
        color: var(--zingo-muted);
        font-size: 15px;
        margin-top: 4px;
      }
      .join-btn {
        background: #ff4d4f !important;
        color: #ffffff !important;
        border-radius: 20px;
        padding: 10px 18px;
        font-weight: 600;
        box-shadow: none;
      }
      :host ::ng-deep .join-btn.mat-mdc-unelevated-button .mdc-button__label {
        color: #ffffff;
      }
      .empty {
        margin: 8px 0 0;
      }
      .muted {
        color: var(--zingo-muted);
      }
    `
  ]
})
export class ShowtimesDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ShowtimesDialogData,
    private dialogRef: MatDialogRef<ShowtimesDialogComponent>
  ) {}

  join(showtimeId: number) {
    this.dialogRef.close(showtimeId);
  }

  close() {
    this.dialogRef.close();
  }

  formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  joinedCount(showtime: Showtime) {
    const start = new Date(showtime.startsAt);
    const seed = showtime.id * 37 + start.getHours() * 5 + start.getMinutes();
    return (seed % 22) + 6;
  }
}
