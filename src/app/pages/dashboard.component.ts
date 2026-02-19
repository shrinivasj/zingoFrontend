import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, Observable, Subject, of } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  timeout,
  tap
} from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import { City, EventItem, MovieSyncResponse, Showtime, Venue } from '../core/models';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dashboard">
      <header class="page-header">
        <div class="logo">
          <img src="assets/aurofly-logo.png" alt="aurofly" />
        </div>
        <button class="menu-btn" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      <h1>Pick a movie, find people to go together</h1>
      <p class="subtitle">Social-first. No swiping. Shared plans, shared seats.</p>

      <div class="scrape-panel">
        <label for="scrape-pincode">Refresh movie data</label>
        <div class="scrape-row">
          <input
            id="scrape-pincode"
            class="scrape-input"
            type="text"
            inputmode="numeric"
            maxlength="6"
            [value]="syncPostalCode"
            (input)="onSyncPostalCodeInput($event)"
            placeholder="Pincode (optional when city selected)"
          />
          <button class="scrape-btn" (click)="runMovieSync()" [disabled]="syncInProgress">
            {{ syncInProgress ? 'Syncing...' : 'Sync Movies' }}
          </button>
        </div>
        <p class="scrape-note">Source: MovieGlu API</p>
        <p class="scrape-error" *ngIf="syncError">{{ syncError }}</p>
        <p class="scrape-success" *ngIf="syncResult">
          Synced {{ syncResult.cityName || 'city' }}:
          venues {{ syncResult.venuesUpserted }},
          events {{ syncResult.eventsUpserted }},
          showtimes {{ syncResult.showtimesUpserted }}
        </p>
      </div>

      <div class="form">
        <label>City</label>
        <ng-container *ngIf="cities$ | async as cities; else cityLoading">
          <mat-form-field appearance="outline" class="select-field">
            <mat-select
              [value]="selectedCityId"
              (selectionChange)="onCityChange($event.value)"
              [disabled]="!cities.length"
              [placeholder]="cities.length ? 'Select your favourite city' : 'No cities available'"
            >
              <mat-option *ngFor="let city of cities; trackBy: trackByCityId" [value]="city.id">{{ city.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </ng-container>
        <ng-template #cityLoading>
          <mat-form-field appearance="outline" class="select-field">
            <mat-select disabled placeholder="Loading cities"></mat-select>
          </mat-form-field>
        </ng-template>

        <label>Theatre</label>
        <ng-container *ngIf="venues$ | async as venues; else venueLoading">
          <mat-form-field appearance="outline" class="select-field">
            <mat-select
              [value]="selectedVenueId"
              (selectionChange)="onVenueChange($event.value)"
              [disabled]="!venues.length"
              [placeholder]="venues.length ? 'Select your favorite theatre' : 'No theatres available'"
            >
              <mat-option *ngFor="let venue of venues; trackBy: trackByVenueId" [value]="venue.id">{{ venue.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </ng-container>
        <ng-template #venueLoading>
          <mat-form-field appearance="outline" class="select-field">
            <mat-select disabled placeholder="Loading theatres"></mat-select>
          </mat-form-field>
        </ng-template>
      </div>

      <h2>{{ (sectionTitle$ | async) || 'Pick a theatre to see movies' }}</h2>
      <div class="movie-list">
        <div class="movie-card" *ngFor="let event of (filteredEvents$ | async) ?? []; trackBy: trackByEventId">
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
        height: 120px;
        display: flex;
        align-items: center;
      }
      .logo img {
        height: 100%;
        width: auto;
        max-width: 280px;
        display: block;
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
      .scrape-panel {
        display: grid;
        gap: 8px;
        margin-bottom: 20px;
        padding: 12px;
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }
      .scrape-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }
      .scrape-input {
        height: 42px;
        border: 1px solid rgba(0, 0, 0, 0.16);
        border-radius: 12px;
        padding: 0 12px;
        font-size: 14px;
      }
      .scrape-btn {
        height: 42px;
        border: none;
        background: #111;
        color: #fff;
        padding: 0 14px;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .scrape-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .scrape-note {
        margin: 0;
        color: #6a6a6a;
        font-size: 12px;
      }
      .scrape-error {
        margin: 0;
        color: #b42318;
        font-size: 13px;
        font-weight: 600;
      }
      .scrape-success {
        margin: 0;
        color: #0f7b36;
        font-size: 13px;
        font-weight: 600;
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
export class DashboardComponent implements OnInit, OnDestroy {
  selectedCityId?: number;
  selectedVenueId?: number;
  selectedEventId?: number;
  syncPostalCode = '';
  syncInProgress = false;
  syncError = '';
  syncResult: MovieSyncResponse | null = null;

  private destroy$ = new Subject<void>();
  private cityId$ = new BehaviorSubject<number | null>(null);
  private venueId$ = new BehaviorSubject<number | null>(null);
  private eventId$ = new BehaviorSubject<number | null>(null);
  private reloadTick$ = new BehaviorSubject<number>(0);
  private venueShowtimesCache = new Map<number, Observable<Showtime[]>>();
  private citiesSnapshot: City[] = [];
  private venuesSnapshot: Venue[] = [];

  cities$: Observable<City[]> = of([]);

  readonly venues$ = combineLatest([this.cityId$, this.reloadTick$]).pipe(
    switchMap(([cityId]) => (cityId ? this.api.getVenues(cityId).pipe(catchError(() => of([]))) : of([]))),
    tap((venues) => {
      this.venuesSnapshot = venues;
      this.ensureVenueSelection(venues);
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly events$ = combineLatest([this.cityId$, this.reloadTick$]).pipe(
    switchMap(([cityId]) => (cityId ? this.api.getEvents(cityId).pipe(catchError(() => of([]))) : of([]))),
    tap((events) => this.ensureEventSelection(events)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly venueShowtimes$ = combineLatest([this.venueId$, this.reloadTick$]).pipe(
    switchMap(([venueId]) => (venueId ? this.getVenueShowtimes$(venueId) : of([]))),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly filteredEvents$ = combineLatest([
    this.events$.pipe(startWith([] as EventItem[])),
    this.venueId$,
    this.venueShowtimes$.pipe(startWith([] as Showtime[]))
  ]).pipe(
    map(([events, venueId, showtimes]) => {
      if (!venueId) {
        return events;
      }
      const eventIds = new Set(showtimes.map((showtime) => showtime.eventId));
      return events.filter((event) => eventIds.has(event.id));
    }),
    tap((events) => this.ensureEventSelection(events)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly selectedEventShowtimes$ = combineLatest([
    this.venueShowtimes$.pipe(startWith([] as Showtime[])),
    this.eventId$
  ]).pipe(
    map(([showtimes, eventId]) =>
      eventId ? this.sortShowtimes(showtimes.filter((showtime) => showtime.eventId === eventId)) : []
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly sectionTitle$ = combineLatest([
    this.venues$.pipe(startWith([] as Venue[])),
    this.venueId$
  ]).pipe(
    map(([venues, venueId]) => {
      const venueName = venues.find((venue) => venue.id === venueId)?.name;
      return venueName ? `Movies at ${venueName}` : 'Pick a theatre to see movies';
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  constructor(private api: ApiService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadCities();
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd && event.urlAfterRedirects.startsWith('/dashboard')) {
          this.loadCities();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCityChange(cityId: number) {
    if (!cityId || cityId === this.selectedCityId) {
      return;
    }
    this.setCity(cityId);
  }

  onVenueChange(venueId: number) {
    if (!venueId || venueId === this.selectedVenueId) {
      return;
    }
    this.setVenue(venueId);
  }

  onSyncPostalCodeInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value ?? '';
    this.syncPostalCode = value.replace(/\D+/g, '').slice(0, 6);
  }

  runMovieSync() {
    if (this.syncInProgress) {
      return;
    }
    const postalCode = this.syncPostalCode.trim();
    const selectedCity = this.citiesSnapshot.find((city) => city.id === this.selectedCityId);
    const cityName = selectedCity?.name;

    if (!postalCode && !cityName) {
      this.syncResult = null;
      this.syncError = 'Select a city or enter a pincode before syncing.';
      return;
    }

    this.syncInProgress = true;
    this.syncResult = null;
    this.syncError = '';

    this.api
      .syncMovies(postalCode || undefined, cityName, 1)
      .pipe(
        timeout(45000),
        take(1),
        finalize(() => {
          this.syncInProgress = false;
        })
      )
      .subscribe({
        next: (result) => {
          this.syncResult = result;
          this.refreshSyncedData();
        },
        error: (error: unknown) => {
          this.syncError = this.parseSyncError(error);
        }
      });
  }

  openShowtimesFor(event: EventItem) {
    if (!this.selectedVenueId) {
      return;
    }
    this.setEvent(event.id);
    this.selectedEventShowtimes$.pipe(take(1)).subscribe((showtimes) => {
      this.openShowtimesDialog(event, showtimes);
    });
  }

  joinLobby(showtime: Showtime) {
    this.router.navigate(['/lobby', showtime.id]);
  }

  trackByEventId(_: number, event: EventItem) {
    return event.id;
  }

  trackByCityId(_: number, city: City) {
    return city.id;
  }

  trackByVenueId(_: number, venue: Venue) {
    return venue.id;
  }

  private setCity(cityId: number) {
    this.selectedCityId = cityId;
    this.cityId$.next(cityId);
    this.selectedVenueId = undefined;
    this.selectedEventId = undefined;
    this.venueId$.next(null);
    this.eventId$.next(null);
    this.venueShowtimesCache.clear();
    this.venuesSnapshot = [];
  }

  private loadCities() {
    this.cities$ = this.api.getCities().pipe(
      tap((cities) => {
        this.citiesSnapshot = cities;
        this.ensureCitySelection(cities);
      }),
      catchError(() => of(this.citiesSnapshot)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.cities$.pipe(take(1)).subscribe();
  }

  private ensureCitySelection(cities: City[]) {
    if (!cities.length) {
      this.selectedCityId = undefined;
      this.cityId$.next(null);
      return;
    }
    const exists = this.selectedCityId && cities.some((city) => city.id === this.selectedCityId);
    if (!exists) {
      this.setCity(cities[0].id);
    }
  }

  private setVenue(venueId: number) {
    this.selectedVenueId = venueId;
    this.venueId$.next(venueId);
  }

  private setEvent(eventId: number) {
    this.selectedEventId = eventId;
    this.eventId$.next(eventId);
  }

  private ensureVenueSelection(venues: Venue[]) {
    if (!venues.length) {
      this.selectedVenueId = undefined;
      this.venueId$.next(null);
      return;
    }
    const exists = this.selectedVenueId && venues.some((venue) => venue.id === this.selectedVenueId);
    if (!exists) {
      this.selectedVenueId = undefined;
      this.venueId$.next(null);
    }
  }

  private ensureEventSelection(events: EventItem[]) {
    if (!events.length) {
      this.selectedEventId = undefined;
      this.eventId$.next(null);
      return;
    }
    const exists = this.selectedEventId && events.some((event) => event.id === this.selectedEventId);
    if (!exists) {
      this.selectedEventId = undefined;
      this.eventId$.next(null);
    }
  }

  private getVenueShowtimes$(venueId: number): Observable<Showtime[]> {
    const cached = this.venueShowtimesCache.get(venueId);
    if (cached) {
      return cached;
    }
    const request$ = this.api.getShowtimes(undefined, venueId).pipe(
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.venueShowtimesCache.set(venueId, request$);
    return request$;
  }

  private sortShowtimes(showtimes: Showtime[]) {
    return [...showtimes].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  private refreshSyncedData() {
    this.venueShowtimesCache.clear();
    this.reloadTick$.next(this.reloadTick$.value + 1);
  }

  private parseSyncError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const namedError = error as { name?: string };
      if (namedError.name === 'TimeoutError') {
        return 'Movie sync is taking too long. Try again with a city selected, or retry after a minute.';
      }
    }
    if (typeof error === 'object' && error !== null) {
      const response = error as { error?: { message?: string }; message?: string };
      if (response.error?.message) {
        return response.error.message;
      }
      if (response.message) {
        return response.message;
      }
    }
    return 'Movie sync failed. Please try again.';
  }

  private openShowtimesDialog(event: EventItem, showtimes: Showtime[]) {
    const selectedVenue = this.venuesSnapshot.find((venue) => venue.id === this.selectedVenueId);
    this.dialog
      .open(ShowtimesDialogComponent, {
        data: {
          showtimes,
          eventTitle: event.title,
          venueName: selectedVenue?.name,
          eventPosterUrl: event.posterUrl ?? null
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
}
