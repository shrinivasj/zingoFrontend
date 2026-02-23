import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ApiService } from './api.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class MobilePushService {
  private listenersAttached = false;
  private currentToken: string | null = null;

  constructor(private api: ApiService, private router: Router, private ngZone: NgZone) {}

  initForAuthenticatedUser() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    this.attachListeners();
    PushNotifications.requestPermissions().then((permission) => {
      if (permission.receive !== 'granted') {
        return;
      }
      PushNotifications.register();
    });
  }

  clearForLoggedOutUser() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const token = this.currentToken;
    if (token) {
      this.api.unregisterPushToken(token).subscribe({ error: () => {} });
    }
    this.currentToken = null;
  }

  private attachListeners() {
    if (this.listenersAttached) {
      return;
    }
    this.listenersAttached = true;

    PushNotifications.addListener('registration', (token: Token) => {
      this.currentToken = token.value;
      const platform = Capacitor.getPlatform();
      this.api.registerPushToken(token.value, platform).subscribe({ error: () => {} });
    });

    PushNotifications.addListener('registrationError', () => {});

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      this.showLocalForegroundNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      this.routeFromPushData(action.notification?.data ?? {});
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const data = (event.notification?.extra as Record<string, unknown> | undefined) ?? {};
      this.routeFromPushData(data);
    });
  }

  private async showLocalForegroundNotification(notification: PushNotificationSchema) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        return;
      }
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 2147483000,
          title: notification.title || 'Aurofly',
          body: notification.body || '',
          extra: notification.data ?? {}
        }
      ]
    });
  }

  private routeFromPushData(data: Record<string, unknown>) {
    this.ngZone.run(() => {
      const conversationId = this.toNumber(data['conversationId']);
      if (conversationId) {
        this.router.navigate(['/chat', conversationId]);
        return;
      }
      this.router.navigate(['/notifications']);
    });
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }
}
