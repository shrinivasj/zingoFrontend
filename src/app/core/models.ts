export interface User {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bioShort?: string | null;
  personalityTags?: string[] | null;
}

export interface Profile {
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  e2eePublicKey?: string | null;
  e2eeEncryptedPrivateKey?: string | null;
  e2eeKeySalt?: string | null;
  trekHostEnabled?: boolean;
  bioShort?: string | null;
  personalityTags?: string[] | null;
}

export interface City {
  id: number;
  name: string;
}

export interface Venue {
  id: number;
  cityId: number;
  name: string;
}

export interface EventItem {
  id: number;
  type: 'MOVIE' | 'CAFE' | 'TREK' | 'PLAY' | 'CONCERT' | 'COMEDY' | 'SPORTS' | 'WORKSHOP' | 'EXHIBITION' | 'FESTIVAL' | 'KIDS' | 'OTHER';
  title: string;
  posterUrl?: string | null;
}

export interface Showtime {
  id: number;
  eventId: number;
  venueId: number;
  startsAt: string;
  format: 'TWO_D' | 'THREE_D' | 'IMAX' | 'GENERAL';
}

export interface LobbyUser {
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  bioShort?: string | null;
  personalityTags?: string[] | null;
}

export interface LobbyUsersResponse {
  showtimeId: number;
  total: number;
  users: LobbyUser[];
  eventType?: EventItem['type'] | null;
}

export interface ActiveLobby {
  showtimeId: number;
  eventTitle?: string | null;
  venueName?: string | null;
  startsAt?: string | null;
  liveCount: number;
}

export interface Invite {
  id: number;
  fromUserId: number;
  toUserId: number;
  showtimeId: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface InviteAcceptResponse {
  invite: Invite;
  conversationId: number;
}

export interface NotificationItem {
  id: number;
  type: 'INVITE' | 'SYSTEM';
  payload: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

export interface TrekGroup {
  id: number;
  showtimeId: number;
  hostUserId: number;
  hostDisplayName: string;
  hostAvatarUrl?: string | null;
  description?: string | null;
  maxMembers?: number | null;
  pendingRequests: number;
  createdAt: string;
}

export interface TrekJoinRequest {
  id: number;
  groupId: number;
  showtimeId: number;
  requesterUserId: number;
  requesterDisplayName: string;
  requesterAvatarUrl?: string | null;
  note?: string | null;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
}

export interface TrekDecisionResponse {
  request: TrekJoinRequest;
  conversationId?: number | null;
}

export interface TrekHostStatus {
  trekHostEnabled: boolean;
}

export interface Conversation {
  id: number;
  showtimeId: number;
  eventTitle?: string | null;
  eventPosterUrl?: string | null;
  venueName?: string | null;
  startsAt?: string | null;
  memberIds: number[];
  participantNames?: string[] | null;
  participantNameByUserId?: Record<string, string> | null;
  otherUserId?: number | null;
  otherUserName?: string | null;
  otherUserAvatarUrl?: string | null;
  otherUserE2eePublicKey?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string | null;
  text: string;
  createdAt: string;
}

export interface IcebreakerResponse {
  suggestions: string[];
}

export interface MovieSyncResponse {
  postalCode?: string | null;
  cityName?: string | null;
  venuesUpserted: number;
  eventsUpserted: number;
  showtimesUpserted: number;
}

export interface AdminStatus {
  owner: boolean;
}

export interface AdminConfigEntry {
  key: string;
  value: string;
}

export interface AdminConfigResponse {
  entries: AdminConfigEntry[];
}

export interface AdminCafeCreateResponse {
  cityId: number;
  cityName: string;
  venueId: number;
  venueName: string;
  eventId: number;
  title: string;
  showtimeId: number;
  startsAt: string;
  address?: string | null;
  postalCode?: string | null;
  type?: EventItem['type'] | null;
  venueCreated: boolean;
  eventCreated: boolean;
  showtimeCreated: boolean;
}

export interface AdminPlanListResponse {
  plans: AdminCafeCreateResponse[];
}

export interface AdminSyncRunItem {
  cityName?: string | null;
  postalCode?: string | null;
  daysRequested?: number | null;
  venuesUpserted: number;
  eventsUpserted: number;
  showtimesUpserted: number;
  status: 'SUCCESS' | 'NO_DATA' | string;
  createdAt: string;
}

export interface AdminActivityItem {
  actionType: string;
  title: string;
  detail?: string | null;
  createdAt: string;
}

export interface AdminDashboardResponse {
  cityCount: number;
  cafePlanCount: number;
  trekPlanCount: number;
  movieShowtimeCount: number;
  recentSyncs: AdminSyncRunItem[];
  recentActivities: AdminActivityItem[];
}

export type ScrapeSyncResponse = MovieSyncResponse;
