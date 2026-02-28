import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { EventItem, Showtime } from '../core/models';

interface ShowtimesDialogData {
  showtimes: Showtime[];
  eventTitle?: string;
  venueName?: string;
  eventPosterUrl?: string | null;
  eventType?: EventItem['type'] | null;
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
        <h2 class="title">{{ data.eventTitle || fallbackTitle() }}</h2>
        <p class="subtitle">{{ data.venueName || fallbackSubtitle() }}</p>

        <div class="showtime-list" *ngIf="data.showtimes.length; else emptyState">
          <div class="showtime-card" *ngFor="let showtime of data.showtimes">
            <div class="details" *ngIf="showsSchedule(); else nonMovieDetails">
              <div class="time">{{ formatTime(showtime.startsAt) }}</div>
            </div>
            <ng-template #nonMovieDetails>
              <div class="details non-movie-details">
                <div class="label">{{ planLabel() }}</div>
                <div class="joined" *ngIf="data.venueName">{{ data.venueName }}</div>
              </div>
            </ng-template>
            <button mat-flat-button class="join-btn" (click)="join(showtime.id)">{{ joinCta() }}</button>
          </div>
        </div>
        <ng-template #emptyState>
          <p class="empty muted">{{ emptyLabel() }}</p>
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
      .details {
        min-width: 0;
      }
      .time,
      .label {
        font-size: 20px;
        font-weight: 700;
      }
      .joined {
        color: var(--zingo-muted);
        font-size: 15px;
        margin-top: 4px;
      }
      .non-movie-details .label {
        font-size: 18px;
      }
      .join-btn {
        background: #ff4d4f !important;
        color: #ffffff !important;
        border-radius: 20px;
        padding: 10px 18px;
        font-weight: 600;
        box-shadow: none;
        white-space: nowrap;
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

  showsSchedule() {
    return this.data.eventType === 'MOVIE';
  }

  fallbackTitle() {
    return this.showsSchedule() ? 'Showtimes' : 'Plan options';
  }

  fallbackSubtitle() {
    return this.showsSchedule() ? 'Select a showtime to join' : 'Pick a plan to join the lobby';
  }

  planLabel() {
    if (this.data.eventType === 'TREK') return 'Trek lobby';
    if (this.data.eventType === 'CAFE') return 'Cafe plan';
    return 'Join plan';
  }

  joinCta() {
    if (this.data.eventType === 'TREK') return 'Join Trek';
    if (this.data.eventType === 'CAFE') return 'Join Cafe';
    return 'Join Lobby';
  }

  emptyLabel() {
    if (this.data.eventType === 'TREK') return 'No trek plans available.';
    if (this.data.eventType === 'CAFE') return 'No cafe plans available.';
    return 'No showtimes available.';
  }

  formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

}
