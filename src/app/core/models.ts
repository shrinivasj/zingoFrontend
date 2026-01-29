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
  type: 'MOVIE' | 'PLAY' | 'CONCERT';
  title: string;
  posterUrl?: string | null;
}

export interface Showtime {
  id: number;
  eventId: number;
  venueId: number;
  startsAt: string;
  format: 'TWO_D' | 'THREE_D' | 'IMAX';
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

export interface Conversation {
  id: number;
  showtimeId: number;
  eventTitle?: string | null;
  venueName?: string | null;
  startsAt?: string | null;
  memberIds: number[];
  otherUserName?: string | null;
  otherUserAvatarUrl?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
}

export interface IcebreakerResponse {
  suggestions: string[];
}
