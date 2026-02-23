import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LobbyPresenceService {
  private readonly storageKey = 'zingo_active_lobby_showtime_ids';
  private readonly legacyStorageKey = 'zingo_active_lobby_showtime_id';
  private readonly heartbeatMs = 30000;
  private activeShowtimeIds = new Set<number>(this.readStoredShowtimeIds());
  private activeShowtimeIdSubject = new BehaviorSubject<number | null>(this.firstActiveShowtimeId());
  private activeShowtimeIdsSubject = new BehaviorSubject<number[]>(this.sortedActiveShowtimeIds());
  readonly activeShowtimeId$ = this.activeShowtimeIdSubject.asObservable();
  readonly activeShowtimeIds$ = this.activeShowtimeIdsSubject.asObservable();
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(private api: ApiService) {}

  getActiveShowtimeId(): number | null {
    return this.firstActiveShowtimeId();
  }

  getActiveShowtimeIds(): number[] {
    return this.sortedActiveShowtimeIds();
  }

  enterLobby(showtimeId: number): Observable<any> {
    if (!Number.isInteger(showtimeId) || showtimeId <= 0) {
      return throwError(() => new Error('Invalid showtime id'));
    }

    this.addActiveShowtime(showtimeId);
    this.startHeartbeat();

    return this.api.joinLobby(showtimeId).pipe(
      catchError((error) => {
        this.removeActiveShowtime(showtimeId);
        return throwError(() => error);
      })
    );
  }

  resumeActiveLobby() {
    const ids = this.sortedActiveShowtimeIds();
    if (!ids.length) {
      return;
    }
    this.startHeartbeat();
    ids.forEach((id) => this.api.heartbeat(id, true).subscribe({ error: () => {} }));
  }

  exitLobby(showtimeId?: number): Observable<any> {
    if (showtimeId !== undefined) {
      if (this.activeShowtimeIds.has(showtimeId)) {
        this.removeActiveShowtime(showtimeId);
      }
      return this.api.leaveLobby(showtimeId).pipe(catchError(() => of(null)));
    }

    const ids = this.sortedActiveShowtimeIds();
    if (!ids.length) {
      return of(null);
    }
    this.clearAllActiveShowtimes();
    return forkJoin(ids.map((id) => this.api.leaveLobby(id).pipe(catchError(() => of(null)))));
  }

  clearStoredPresence() {
    this.clearAllActiveShowtimes();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      const ids = this.sortedActiveShowtimeIds();
      if (!ids.length) {
        this.stopHeartbeat();
        return;
      }
      ids.forEach((id) => this.api.heartbeat(id, true).subscribe({ error: () => {} }));
    }, this.heartbeatMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private addActiveShowtime(showtimeId: number) {
    this.activeShowtimeIds.add(showtimeId);
    this.syncSubjectsAndStorage();
  }

  private removeActiveShowtime(showtimeId: number) {
    this.activeShowtimeIds.delete(showtimeId);
    this.syncSubjectsAndStorage();
    if (!this.activeShowtimeIds.size) {
      this.stopHeartbeat();
    }
  }

  private clearAllActiveShowtimes() {
    this.activeShowtimeIds.clear();
    this.syncSubjectsAndStorage();
    this.stopHeartbeat();
  }

  private syncSubjectsAndStorage() {
    const ids = this.sortedActiveShowtimeIds();
    this.activeShowtimeIdsSubject.next(ids);
    this.activeShowtimeIdSubject.next(ids.length ? ids[ids.length - 1] : null);
    try {
      if (ids.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(ids));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      // ignore storage errors
    }
  }

  private readStoredShowtimeIds(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        const legacyRaw = localStorage.getItem(this.legacyStorageKey);
        if (!legacyRaw) {
          return [];
        }
        const legacyId = Number(legacyRaw);
        if (!Number.isInteger(legacyId) || legacyId <= 0) {
          return [];
        }
        return [legacyId];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      const ids = parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      return Array.from(new Set(ids));
    } catch {
      return [];
    }
  }

  private sortedActiveShowtimeIds(): number[] {
    return Array.from(this.activeShowtimeIds).sort((a, b) => a - b);
  }

  private firstActiveShowtimeId(): number | null {
    const ids = this.sortedActiveShowtimeIds();
    return ids.length ? ids[ids.length - 1] : null;
  }
}
