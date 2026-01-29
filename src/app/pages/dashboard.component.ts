import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../core/api.service';
import { City, EventItem, Showtime, Venue } from '../core/models';
import { ShowtimesDialogComponent } from '../components/showtimes.dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule
  ],
  template: `
    <section class="dashboard">
      <header class="page-header">
        <div class="logo">Z</div>
        <button class="menu-btn" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      <h1>Pick a movie, find people to go together</h1>
      <p class="subtitle">Social-first. No swiping. Shared plans, shared seats.</p>

      <div class="form">
        <label>City</label>
        <mat-form-field appearance="outline" class="select-field">
          <mat-select [(value)]="selectedCityId" (selectionChange)="onCityChange()" placeholder="Select a city">
            <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <label>Theatre</label>
        <mat-form-field appearance="outline" class="select-field">
          <mat-select [(value)]="selectedVenueId" (selectionChange)="onVenueChange()" placeholder="Select a theatre">
            <mat-option *ngFor="let venue of venues" [value]="venue.id">{{ venue.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <h2>{{ sectionTitle }}</h2>
      <div class="movie-list">
        <div class="movie-card" *ngFor="let event of filteredEvents">
          <div class="poster" *ngIf="event.posterUrl; else placeholder" [style.backgroundImage]="'url(' + event.posterUrl + ')'"></div>
          <ng-template #placeholder>
            <div class="poster placeholder"></div>
          </ng-template>
          <div class="info">
            <div class="title">{{ event.title }}</div>
            <div class="meta">Movie · 2h 15m</div>
          </div>
          <button class="view-btn" (click)="openShowtimesFor(event)">View</button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .dashboard {
        max-width: 420px;
        margin: 0 auto;
        padding: 18px 16px 80px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 22px;
      }
      .logo {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        background: #ff4d4f;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 28px;
        font-weight: 700;
      }
      .menu-btn {
        width: 44px;
        height: 44px;
        border: none;
        background: transparent;
        display: grid;
        gap: 6px;
        padding: 8px;
        cursor: pointer;
      }
      .menu-btn span {
        display: block;
        height: 3px;
        width: 100%;
        background: #111;
        border-radius: 999px;
      }
      h1 {
        font-size: 30px;
        margin: 0 0 10px;
        color: #111;
        font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      }
      .subtitle {
        margin: 0 0 24px;
        color: #6a6a6a;
        font-size: 16px;
      }
      .form {
        display: grid;
        gap: 14px;
        margin-bottom: 28px;
      }
      label {
        font-weight: 600;
        color: #111;
      }
      .select-field {
        background: #fff;
        border-radius: 18px;
      }
      h2 {
        margin: 0 0 16px;
        font-size: 24px;
        color: #111;
      }
      .movie-list {
        display: grid;
        gap: 14px;
      }
      .movie-card {
        display: grid;
        grid-template-columns: 72px 1fr auto;
        align-items: center;
        gap: 14px;
        background: #fff;
        border-radius: 20px;
        padding: 14px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }
      .poster {
        width: 72px;
        height: 96px;
        border-radius: 16px;
        background-size: cover;
        background-position: center;
      }
      .poster.placeholder {
        background: #f0f0f0;
      }
      .title {
        font-weight: 700;
        color: #111;
      }
      .meta {
        color: #6a6a6a;
        font-size: 14px;
      }
      .view-btn {
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: #fff;
        padding: 8px 16px;
        border-radius: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      :host ::ng-deep .mdc-text-field--outlined {
        border-radius: 18px;
        height: 54px;
      }
    `
  ]
})
export class DashboardComponent implements OnInit {
  cities: City[] = [];
  venues: Venue[] = [];
  events: EventItem[] = [];
  filteredEvents: EventItem[] = [];
  showtimes: Showtime[] = [];

  selectedCityId?: number;
  selectedVenueId?: number;
  selectedEventId?: number;

  constructor(private api: ApiService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.api.getCities().subscribe((cities) => {
      this.cities = cities;
      if (cities.length) {
        this.selectedCityId = cities[0].id;
        this.onCityChange();
      }
    });
  }

  onCityChange() {
    if (!this.selectedCityId) return;
    this.api.getVenues(this.selectedCityId).subscribe((venues) => {
      this.venues = venues;
      this.selectedVenueId = venues[0]?.id;
      this.onVenueChange();
    });
    this.api.getEvents(this.selectedCityId).subscribe((events) => {
      this.events = events;
      this.selectedEventId = events[0]?.id;
      this.loadShowtimes();
      this.loadVenueShowtimes();
    });
  }

  onVenueChange() {
    this.loadShowtimes();
    this.loadVenueShowtimes();
  }

  selectEvent(event: EventItem) {
    this.selectedEventId = event.id;
    this.loadShowtimes();
  }

  loadShowtimes(openAfterLoad = false) {
    if (!this.selectedEventId || !this.selectedVenueId) {
      this.showtimes = [];
      return;
    }
    this.api.getShowtimes(this.selectedEventId, this.selectedVenueId).subscribe((showtimes) => {
      this.showtimes = showtimes;
      if (openAfterLoad) {
        this.openShowtimes();
      }
    });
  }

  loadVenueShowtimes() {
    if (!this.selectedVenueId) {
      this.filteredEvents = [...this.events];
      return;
    }
    this.api.getShowtimes(undefined, this.selectedVenueId).subscribe((showtimes) => {
      const eventIds = new Set(showtimes.map((s) => s.eventId));
      this.filteredEvents = this.events.filter((event) => eventIds.has(event.id));
    });
  }

  joinLobby(showtime: Showtime) {
    this.router.navigate(['/lobby', showtime.id]);
  }

  openShowtimes() {
    const selectedEvent = this.events.find((event) => event.id === this.selectedEventId);
    const selectedVenue = this.venues.find((venue) => venue.id === this.selectedVenueId);
    this.dialog
      .open(ShowtimesDialogComponent, {
        data: {
          showtimes: this.showtimes,
          eventTitle: selectedEvent?.title,
          venueName: selectedVenue?.name,
          eventPosterUrl: selectedEvent?.posterUrl ?? null
        },
        width: '92vw',
        maxWidth: '420px',
        panelClass: 'showtimes-dialog-panel'
      })
      .afterClosed()
      .subscribe((showtimeId) => {
        if (showtimeId) {
          this.router.navigate(['/lobby', showtimeId]);
        }
      });
  }

  openShowtimesFor(event: EventItem) {
    if (!this.selectedVenueId) {
      return;
    }
    this.selectedEventId = event.id;
    this.loadShowtimes(true);
  }

  get sectionTitle(): string {
    const venueName = this.venues.find((venue) => venue.id === this.selectedVenueId)?.name;
    if (venueName) {
      return `Movies at ${venueName}`;
    }
    return 'Pick a theatre to see movies';
  }

  formatTime(value: string) {
    const date = new Date(value);
    return date.toLocaleString();
  }
}
