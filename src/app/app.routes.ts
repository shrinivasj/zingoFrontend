import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { DashboardComponent } from './pages/dashboard.component';
import { ChatsComponent } from './pages/chats.component';
import { LobbyComponent } from './pages/lobby.component';
import { NotificationsComponent } from './pages/notifications.component';
import { ChatComponent } from './pages/chat.component';
import { SettingsComponent } from './pages/settings.component';
import { AdminComponent } from './pages/admin.component';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
import { guestGuard } from './core/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'chats', component: ChatsComponent, canActivate: [authGuard] },
  { path: 'lobby/:showtimeId', component: LobbyComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'chat/:conversationId', component: ChatComponent, canActivate: [authGuard] },
  { path: 'profile', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
