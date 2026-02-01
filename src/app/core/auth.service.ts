import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(private api: ApiService, private tokenService: TokenService) {
    const token = this.tokenService.getToken();
    if (token) {
      this.loadMe().subscribe();
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
