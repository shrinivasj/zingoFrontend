import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly tokenKey = 'zingo_token';
  private tokenCache: string | null = null;

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
  }
}
