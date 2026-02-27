import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  City,
  Conversation,
  AdminStatus,
  AdminConfigResponse,
  AdminConfigEntry,
  AdminCafeCreateResponse,
  ActiveLobby,
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
  TrekDecisionResponse,
  TrekGroup,
  TrekHostStatus,
  TrekJoinRequest,
  User,
  Venue
} from './models';
import { environment } from '../../environments/environment';
import { SKIP_GLOBAL_LOADING } from './loading.interceptor';

const API_BASE = environment.apiBase;

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

  getShowtimes(
    eventId?: number,
    venueId?: number,
    cityName?: string,
    postalCode?: string,
    cityId?: number
  ): Observable<Showtime[]> {
    let params = new HttpParams();
    if (eventId) {
      params = params.set('eventId', String(eventId));
    }
    if (venueId) {
      params = params.set('venueId', String(venueId));
    }
    if (cityId) {
      params = params.set('cityId', String(cityId));
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

  getAdminStatus(silent = true): Observable<AdminStatus> {
    return this.http.get<AdminStatus>(`${API_BASE}/admin/me`, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
  }

  getAdminConfig(silent = true): Observable<AdminConfigResponse> {
    return this.http.get<AdminConfigResponse>(`${API_BASE}/admin/config`, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
  }

  updateAdminConfig(key: string, value: string): Observable<AdminConfigEntry> {
    return this.http.post<AdminConfigEntry>(`${API_BASE}/admin/config`, { key, value });
  }

  createAdminCafePlan(body: {
    cityId: number;
    venueName: string;
    title?: string;
    startsAt?: string;
    address?: string;
    postalCode?: string;
  }): Observable<AdminCafeCreateResponse> {
    return this.http.post<AdminCafeCreateResponse>(`${API_BASE}/admin/cafes`, body);
  }

  createAdminTrekPlan(body: {
    cityId: number;
    venueName: string;
    title?: string;
    startsAt?: string;
    address?: string;
    postalCode?: string;
  }): Observable<AdminCafeCreateResponse> {
    return this.http.post<AdminCafeCreateResponse>(`${API_BASE}/admin/treks`, body);
  }

  joinLobby(showtimeId: number, silent = false) {
    return this.http.post(`${API_BASE}/lobbies/join`, { showtimeId }, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
  }

  heartbeat(showtimeId: number, silent = false) {
    return this.http.post(`${API_BASE}/lobbies/heartbeat`, { showtimeId }, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
  }

  leaveLobby(showtimeId: number) {
    return this.http.post(`${API_BASE}/lobbies/leave`, { showtimeId });
  }

  lobbyUsers(showtimeId: number, page = 0, size = 24, silent = true): Observable<LobbyUsersResponse> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<LobbyUsersResponse>(`${API_BASE}/lobbies/${showtimeId}/users`, {
      params,
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
  }

  getActiveLobbies(silent = false): Observable<ActiveLobby[]> {
    return this.http.get<ActiveLobby[]>(`${API_BASE}/lobbies/active`, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
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

  registerPushToken(token: string, platform: string) {
    return this.http.post(`${API_BASE}/push/register`, { token, platform });
  }

  unregisterPushToken(token: string) {
    return this.http.post(`${API_BASE}/push/unregister`, { token });
  }

  getConversations(silent = false): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${API_BASE}/conversations`, {
      context: silent ? new HttpContext().set(SKIP_GLOBAL_LOADING, true) : undefined
    });
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

  createTrekGroup(showtimeId: number, description?: string, maxMembers?: number): Observable<TrekGroup> {
    return this.http.post<TrekGroup>(`${API_BASE}/treks/groups`, { showtimeId, description, maxMembers });
  }

  getTrekGroups(showtimeId: number): Observable<TrekGroup[]> {
    const params = new HttpParams().set('showtimeId', String(showtimeId));
    return this.http.get<TrekGroup[]>(`${API_BASE}/treks/groups`, { params });
  }

  getTrekHostStatus(): Observable<TrekHostStatus> {
    return this.http.get<TrekHostStatus>(`${API_BASE}/treks/host/me`);
  }

  onboardTrekHost(): Observable<TrekHostStatus> {
    return this.http.post<TrekHostStatus>(`${API_BASE}/treks/host/onboard`, {});
  }

  requestJoinTrekGroup(groupId: number, note?: string): Observable<TrekJoinRequest> {
    return this.http.post<TrekJoinRequest>(`${API_BASE}/treks/groups/${groupId}/requests`, { note });
  }

  getPendingTrekJoinRequests(): Observable<TrekJoinRequest[]> {
    return this.http.get<TrekJoinRequest[]>(`${API_BASE}/treks/requests/pending`);
  }

  approveTrekJoinRequest(requestId: number): Observable<TrekDecisionResponse> {
    return this.http.post<TrekDecisionResponse>(`${API_BASE}/treks/requests/${requestId}/approve`, {});
  }

  declineTrekJoinRequest(requestId: number): Observable<TrekJoinRequest> {
    return this.http.post<TrekJoinRequest>(`${API_BASE}/treks/requests/${requestId}/decline`, {});
  }
}
