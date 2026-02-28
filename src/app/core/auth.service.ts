import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private meRequest$: Observable<User> | null = null;
  readonly user$ = this.userSubject.asObservable();

  constructor(private api: ApiService, private tokenService: TokenService) {
    const cachedUser = this.tokenService.getUser();
    if (cachedUser) {
      this.userSubject.next(cachedUser);
    }
    const token = this.tokenService.getToken();
    if (token) {
      this.loadMe(true).subscribe({
        error: () => this.logout()
      });
    }
  }

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  setToken(token: string) {
    this.tokenService.setToken(token);
  }

  clearToken() {
    this.tokenService.clearToken();
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.setUser(resp.user);
      })
    );
  }

  register(email: string, password: string, displayName: string) {
    return this.api.register(email, password, displayName).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.setUser(resp.user);
      })
    );
  }


  requestEmailOtp(email: string) {
    return this.api.requestEmailOtp(email);
  }

  verifyEmailOtp(email: string, code: string, displayName?: string) {
    return this.api.verifyEmailOtp(email, code, displayName).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.setUser(resp.user);
      })
    );
  }

  loadMe(force = false) {
    const current = this.userSubject.value;
    if (!force && current) {
      return of(current);
    }
    if (this.meRequest$) {
      return this.meRequest$;
    }
    this.meRequest$ = this.api.me().pipe(
      tap((user) => this.setUser(user)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.meRequest$.subscribe({ complete: () => (this.meRequest$ = null), error: () => (this.meRequest$ = null) });
    return this.meRequest$;
  }

  logout() {
    this.clearToken();
    this.userSubject.next(null);
  }

  private setUser(user: User) {
    this.userSubject.next(user);
    this.tokenService.setUser(user);
  }
}
