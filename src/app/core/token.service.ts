import { Injectable } from '@angular/core';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly tokenKey = 'zingo_token';
  private readonly userKey = 'zingo_user';
  private tokenCache: string | null = null;
  private userCache: User | null | undefined = undefined;

  getToken(): string | null {
    if (this.tokenCache) return this.tokenCache;
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  setToken(token: string) {
    this.tokenCache = token;
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch {
      // ignore storage errors (private mode, blocked storage)
    }
  }

  clearToken() {
    this.tokenCache = null;
    try {
      localStorage.removeItem(this.tokenKey);
    } catch {
      // ignore
    }
    this.clearUser();
  }

  getUser(): User | null {
    if (this.userCache !== undefined) return this.userCache;
    try {
      const raw = localStorage.getItem(this.userKey);
      if (!raw) {
        this.userCache = null;
        return null;
      }
      const parsed = JSON.parse(raw) as User;
      this.userCache = parsed;
      return parsed;
    } catch {
      this.userCache = null;
      return null;
    }
  }

  setUser(user: User) {
    this.userCache = user;
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } catch {
      // ignore storage errors (private mode, blocked storage)
    }
  }

  clearUser() {
    this.userCache = null;
    try {
      localStorage.removeItem(this.userKey);
    } catch {
      // ignore
    }
  }
}
