import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, Observable, Subject, of, timer, merge } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import { ActiveLobby, City, EventItem, Showtime, Venue } from '../core/models';
import { ShowtimesDialogComponent } from '../components/showtimes.dialog';
import { LobbyPresenceService } from '../core/lobby-presence.service';

type PlanKind = 'MOVIE' | 'CAFE';

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

      <h1>Pick a {{ planTypeLabelLower() }}, find people to go together</h1>
      <p class="subtitle">Social-first. No swiping. Shared plans, shared time.</p>

      <div class="mode-toggle" role="tablist" aria-label="Plan type">
        <button type="button" [class.active]="selectedPlanType === 'MOVIE'" (click)="setPlanType('MOVIE')">Movie</button>
        <button type="button" [class.active]="selectedPlanType === 'CAFE'" (click)="setPlanType('CAFE')">Cafe</button>
      </div>

      <ng-container *ngIf="activeLobbies$ | async as activeLobbies">
        <div class="active-lobby-card" *ngIf="activeLobbies.length">
          <div class="active-lobby-title">Current Lobbies ({{ activeLobbies.length }})</div>
          <div class="active-lobby-list">
            <div class="active-lobby-row" *ngFor="let lobby of activeLobbies">
              <div class="active-lobby-info">
                <div class="active-lobby-meta">{{ lobby.eventTitle || 'Plan' }} at {{ lobby.venueName || 'Place' }}</div>
                <div class="active-lobby-submeta">
                  Lobby #{{ lobby.showtimeId }} · {{ lobbyTimeLabel(lobby.startsAt) }} · {{ lobby.liveCount }} live
                </div>
              </div>
              <div class="active-lobby-actions">
                <button class="active-open-btn" (click)="openActiveLobby(lobby.showtimeId)">Open</button>
                <button class="active-leave-btn" (click)="leaveActiveLobby(lobby.showtimeId)">Leave</button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

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

        <label>{{ placeLabel() }}</label>
        <ng-container *ngIf="filteredVenues$ | async as venues; else venueLoading">
          <mat-form-field appearance="outline" class="select-field">
            <mat-select
              [value]="selectedVenueId"
              (selectionChange)="onVenueChange($event.value)"
              [disabled]="!venues.length"
              [placeholder]="venues.length ? 'Select your place' : 'No places available'"
            >
              <mat-option *ngFor="let venue of venues; trackBy: trackByVenueId" [value]="venue.id">{{ venue.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </ng-container>
        <ng-template #venueLoading>
          <mat-form-field appearance="outline" class="select-field">
            <mat-select disabled placeholder="Loading places"></mat-select>
          </mat-form-field>
        </ng-template>
      </div>

      <h2>{{ (sectionTitle$ | async) || defaultSectionTitle() }}</h2>
      <div class="movie-list">
        <div class="movie-card" *ngFor="let event of (filteredEvents$ | async) ?? []; trackBy: trackByEventId">
          <div class="poster" *ngIf="event.posterUrl; else placeholder" [style.backgroundImage]="'url(' + event.posterUrl + ')'"></div>
          <ng-template #placeholder>
            <div class="poster placeholder"></div>
          </ng-template>
          <div class="info">
            <div class="title">{{ event.title }}</div>
            <div class="meta">{{ eventTypeLabel(event.type) }}</div>
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
      .mode-toggle {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 18px;
        background: #f2f4f7;
        border-radius: 14px;
        padding: 6px;
      }
      .mode-toggle button {
        border: none;
        background: transparent;
        border-radius: 10px;
        height: 38px;
        font-weight: 700;
        color: #475467;
        cursor: pointer;
      }
      .mode-toggle button.active {
        background: #ffffff;
        color: #111111;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
      }
      .active-lobby-card {
        display: grid;
        gap: 10px;
        margin-bottom: 18px;
        padding: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 16px;
        background: #f6fbff;
      }
      .active-lobby-title {
        font-weight: 700;
        color: #111;
      }
      .active-lobby-meta {
        color: #334155;
        font-size: 14px;
      }
      .active-lobby-list {
        display: grid;
        gap: 8px;
      }
      .active-lobby-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .active-lobby-info {
        display: grid;
        gap: 2px;
      }
      .active-lobby-submeta {
        color: #64748b;
        font-size: 12px;
      }
      .active-lobby-actions {
        display: flex;
        gap: 8px;
      }
      .active-open-btn,
      .active-leave-btn {
        height: 36px;
        border-radius: 10px;
        padding: 0 12px;
        cursor: pointer;
        font-weight: 600;
      }
      .active-open-btn {
        border: none;
        background: #111;
        color: #fff;
      }
      .active-leave-btn {
        border: 1px solid rgba(17, 17, 17, 0.2);
        background: #fff;
        color: #111;
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
  selectedPlanType: PlanKind = 'MOVIE';
  private activeLobbiesRefresh$ = new Subject<void>();
  readonly activeLobbies$ = merge(timer(0, 10000), this.activeLobbiesRefresh$).pipe(
    switchMap(() => this.api.getActiveLobbies(true).pipe(catchError(() => of([] as ActiveLobby[])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private destroy$ = new Subject<void>();
  private cityId$ = new BehaviorSubject<number | null>(null);
  private venueId$ = new BehaviorSubject<number | null>(null);
  private eventId$ = new BehaviorSubject<number | null>(null);
  private planType$ = new BehaviorSubject<PlanKind>('MOVIE');
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

  readonly events$ = combineLatest([this.cityId$, this.planType$, this.reloadTick$]).pipe(
    switchMap(([cityId, planType]) =>
      cityId ? this.api.getEvents(cityId, undefined, undefined, planType).pipe(catchError(() => of([]))) : of([])
    ),
    tap((events) => this.ensureEventSelection(events)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly venueShowtimes$ = combineLatest([this.venueId$, this.reloadTick$]).pipe(
    switchMap(([venueId]) => (venueId ? this.getVenueShowtimes$(venueId) : of([]))),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly cityShowtimes$ = combineLatest([this.cityId$, this.reloadTick$]).pipe(
    switchMap(([cityId]) =>
      cityId ? this.api.getShowtimes(undefined, undefined, undefined, undefined, cityId).pipe(catchError(() => of([]))) : of([])
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly filteredVenues$ = combineLatest([
    this.venues$.pipe(startWith([] as Venue[])),
    this.events$.pipe(startWith([] as EventItem[])),
    this.cityShowtimes$.pipe(startWith([] as Showtime[]))
  ]).pipe(
    map(([venues, events, cityShowtimes]) => {
      if (!venues.length) {
        return [] as Venue[];
      }
      if (!events.length) {
        return [] as Venue[];
      }
      const eventIds = new Set(events.map((event) => event.id));
      const eligibleVenueIds = new Set(
        cityShowtimes.filter((showtime) => eventIds.has(showtime.eventId)).map((showtime) => showtime.venueId)
      );
      return venues.filter((venue) => eligibleVenueIds.has(venue.id));
    }),
    tap((venues) => this.ensureVenueSelection(venues)),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly filteredEvents$ = combineLatest([
    this.events$.pipe(startWith([] as EventItem[])),
    this.cityId$,
    this.venueId$,
    this.venueShowtimes$.pipe(startWith([] as Showtime[]))
  ]).pipe(
    map(([events, cityId, venueId, showtimes]) => {
      if (!cityId || !venueId) {
        return [] as EventItem[];
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
    this.venueId$,
    this.planType$
  ]).pipe(
    map(([venues, venueId, planType]) => {
      const venueName = venues.find((venue) => venue.id === venueId)?.name;
      if (venueName) {
        return planType === 'CAFE' ? `Cafe plans at ${venueName}` : `Movies at ${venueName}`;
      }
      return planType === 'CAFE' ? 'Pick a cafe to see cafe plans' : 'Pick a theatre to see movies';
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  constructor(
    private api: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private lobbyPresence: LobbyPresenceService
  ) {}

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

  setPlanType(type: PlanKind) {
    if (this.selectedPlanType === type) {
      return;
    }
    this.selectedPlanType = type;
    this.planType$.next(type);
    this.selectedVenueId = undefined;
    this.venueId$.next(null);
    this.selectedEventId = undefined;
    this.eventId$.next(null);
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

  openActiveLobby(showtimeId?: number | null) {
    if (!showtimeId) {
      return;
    }
    this.router.navigate(['/lobby', showtimeId]);
  }

  leaveActiveLobby(showtimeId?: number | null) {
    if (!showtimeId) {
      return;
    }
    this.lobbyPresence.exitLobby(showtimeId).subscribe({
      complete: () => this.activeLobbiesRefresh$.next()
    });
  }

  lobbyTimeLabel(value?: string | null) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

  planTypeLabelLower() {
    return this.selectedPlanType === 'CAFE' ? 'cafe' : 'movie';
  }

  placeLabel() {
    return this.selectedPlanType === 'CAFE' ? 'Cafe' : 'Theatre';
  }

  defaultSectionTitle() {
    return this.selectedPlanType === 'CAFE' ? 'Pick a cafe to see cafe plans' : 'Pick a theatre to see movies';
  }

  eventTypeLabel(type: EventItem['type']) {
    return type === 'CAFE' ? 'Cafe meetup' : 'Movie';
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
