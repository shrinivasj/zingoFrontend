import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'zingo_token';
  private tokenCache: string | null = null;
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(private api: ApiService) {
    const token = this.getToken();
    if (token) {
      this.loadMe().subscribe();
    }
  }

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

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.userSubject.next(resp.user);
      })
    );
  }

  register(email: string, password: string, displayName: string) {
    return this.api.register(email, password, displayName).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.userSubject.next(resp.user);
      })
    );
  }

  loadMe() {
    return this.api.me().pipe(tap((user) => this.userSubject.next(user)));
  }

  logout() {
    this.clearToken();
    this.userSubject.next(null);
  }
}
