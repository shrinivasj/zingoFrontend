import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  City,
  Conversation,
  EventItem,
  IcebreakerResponse,
  Invite,
  InviteAcceptResponse,
  LobbyUsersResponse,
  Message,
  MovieSyncResponse,
  NotificationItem,
  Profile,
  Showtime,
  User,
  Venue
} from './models';

const API_BASE = 'https://zingo-bv09.onrender.com/api';
//const API_BASE = 'http://192.168.1.8:8080/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  register(email: string, password: string, displayName: string): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${API_BASE}/auth/register`, {
      email,
      password,
      displayName
    });
  }

  login(email: string, password: string): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${API_BASE}/auth/login`, { email, password });
  }

  me(): Observable<User> {
    return this.http.get<User>(`${API_BASE}/auth/me`);
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${API_BASE}/profile/me`);
  }

  updateProfile(body: Partial<Profile>): Observable<Profile> {
    return this.http.put<Profile>(`${API_BASE}/profile/me`, body);
  }

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${API_BASE}/cities`);
  }

  getVenues(cityId?: number, cityName?: string, postalCode?: string): Observable<Venue[]> {
    let params = new HttpParams();
    if (cityId) {
      params = params.set('cityId', String(cityId));
    }
    if (cityName) {
      params = params.set('city', cityName);
    }
    if (postalCode) {
      params = params.set('postalCode', postalCode);
    }
    return this.http.get<Venue[]>(`${API_BASE}/venues`, { params });
  }

  getEvents(cityId?: number, cityName?: string, postalCode?: string, type?: EventItem['type']): Observable<EventItem[]> {
    let params = new HttpParams();
    if (cityId) {
      params = params.set('cityId', String(cityId));
    }
    if (cityName) {
      params = params.set('city', cityName);
    }
    if (postalCode) {
      params = params.set('postalCode', postalCode);
    }
    if (type) {
      params = params.set('type', type);
    }
    return this.http.get<EventItem[]>(`${API_BASE}/events`, { params });
  }

  getShowtimes(eventId?: number, venueId?: number, cityName?: string, postalCode?: string): Observable<Showtime[]> {
    let params = new HttpParams();
    if (eventId) {
      params = params.set('eventId', String(eventId));
    }
    if (venueId) {
      params = params.set('venueId', String(venueId));
    }
    if (cityName) {
      params = params.set('city', cityName);
    }
    if (postalCode) {
      params = params.set('postalCode', postalCode);
    }
    return this.http.get<Showtime[]>(`${API_BASE}/showtimes`, { params });
  }

  syncMovies(postalCode?: string, cityName?: string, days?: number): Observable<MovieSyncResponse> {
    return this.http.post<MovieSyncResponse>(`${API_BASE}/movies/sync`, { postalCode, cityName, days });
  }

  // Backward-compatible alias for older callers.
  syncScrape(postalCode?: string, cityName?: string, days?: number): Observable<MovieSyncResponse> {
    return this.syncMovies(postalCode, cityName, days);
  }

  joinLobby(showtimeId: number) {
    return this.http.post(`${API_BASE}/lobbies/join`, { showtimeId });
  }

  heartbeat(showtimeId: number) {
    return this.http.post(`${API_BASE}/lobbies/heartbeat`, { showtimeId });
  }

  leaveLobby(showtimeId: number) {
    return this.http.post(`${API_BASE}/lobbies/leave`, { showtimeId });
  }

  lobbyUsers(showtimeId: number, page = 0, size = 24): Observable<LobbyUsersResponse> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<LobbyUsersResponse>(`${API_BASE}/lobbies/${showtimeId}/users`, { params });
  }

  createInvite(toUserId: number, showtimeId: number): Observable<Invite> {
    return this.http.post<Invite>(`${API_BASE}/invites`, { toUserId, showtimeId });
  }

  acceptInvite(inviteId: number): Observable<InviteAcceptResponse> {
    return this.http.post<InviteAcceptResponse>(`${API_BASE}/invites/${inviteId}/accept`, {});
  }

  declineInvite(inviteId: number): Observable<Invite> {
    return this.http.post<Invite>(`${API_BASE}/invites/${inviteId}/decline`, {});
  }

  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${API_BASE}/notifications`);
  }

  markNotificationRead(id: number): Observable<NotificationItem> {
    return this.http.post<NotificationItem>(`${API_BASE}/notifications/${id}/read`, {});
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${API_BASE}/conversations`);
  }

  getMessages(conversationId: number, page = 0, size = 50): Observable<Message[]> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<Message[]>(`${API_BASE}/conversations/${conversationId}/messages`, { params });
  }

  sendMessage(conversationId: number, text: string): Observable<Message> {
    return this.http.post<Message>(`${API_BASE}/conversations/${conversationId}/messages`, { text });
  }

  leaveConversation(conversationId: number) {
    return this.http.post(`${API_BASE}/conversations/${conversationId}/leave`, {});
  }

  getIcebreakers(showtimeId: number): Observable<IcebreakerResponse> {
    let params = new HttpParams().set('showtimeId', String(showtimeId));
    return this.http.get<IcebreakerResponse>(`${API_BASE}/icebreakers`, { params });
  }

  blockUser(blockedId: number) {
    return this.http.post(`${API_BASE}/block`, { blockedId });
  }

  reportUser(reportedId: number, reason: string, details?: string) {
    return this.http.post(`${API_BASE}/report`, { reportedId, reason, details });
  }

  blockedUsers(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${API_BASE}/blocks`);
  }
}
