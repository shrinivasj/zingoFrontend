import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/auth.service';
import { StompService } from './core/stomp.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  user$ = this.authService.user$;
  private sub = new Subscription();
  hideTopbar = false;
  showBottomNav = false;
  private currentUrl = '';

  constructor(private authService: AuthService, private stompService: StompService, private router: Router) {
    this.sub.add(
      this.authService.user$.subscribe((user) => {
        const token = this.authService.getToken();
        this.updateBottomNav(token, this.currentUrl);
        if (user && token) {
          this.stompService.connect(token);
        } else {
          this.stompService.disconnect();
        }
      })
    );

    this.sub.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.currentUrl = url;
        this.hideTopbar =
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/dashboard') ||
          url.startsWith('/chats') ||
          url.startsWith('/notifications') ||
          url.startsWith('/settings') ||
          url.startsWith('/profile') ||
          url.startsWith('/lobby') ||
          url.startsWith('/chat');
        this.updateBottomNav(this.authService.getToken(), url);
      })
    );
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private updateBottomNav(token: string | null, url: string) {
    const hideForAuthScreens = url.startsWith('/login') || url.startsWith('/register');
    this.showBottomNav = !!token && !hideForAuthScreens;
  }
}
