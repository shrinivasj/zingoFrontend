import { Injectable, NgZone } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

const WS_URL = `${environment.apiBase.replace(/\/api$/, '')}/ws`;

@Injectable({ providedIn: 'root' })
export class StompService {
  private client: Client | null = null;
  private token: string | null = null;
  private connected = false;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  readonly connected$ = this.connectedSubject.asObservable();
  private sequence = 0;
  private desired = new Map<string, { destination: string; callback: (message: IMessage) => void }>();
  private active = new Map<string, StompSubscription>();
  
  constructor(private ngZone: NgZone) {}

  connect(token: string) {
    if (this.client?.active && this.token === token) {
      return;
    }
    if (this.client?.active && this.token !== token) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      this.connectedSubject.next(false);
      this.active.clear();
    }
    this.token = token;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}?token=${token}`),
      reconnectDelay: 1000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000
    });
    client.onConnect = () => {
      this.connected = true;
      this.connectedSubject.next(true);
      this.active.forEach((sub) => sub.unsubscribe());
      this.active.clear();
      this.desired.forEach((_, key) => this.activateSubscription(key));
    };
    client.onDisconnect = () => {
      this.connected = false;
      this.connectedSubject.next(false);
      this.active.clear();
    };
    client.onStompError = () => {
      this.connected = false;
      this.connectedSubject.next(false);
    };
    client.activate();
    this.client = client;
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.token = null;
      this.connected = false;
      this.connectedSubject.next(false);
      this.active.clear();
      this.desired.clear();
    }
  }

  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription {
    const id = `sub-${++this.sequence}`;
    this.desired.set(id, { destination, callback });
    if (this.connected) {
      this.activateSubscription(id);
    }

    return {
      id,
      unsubscribe: () => {
        this.active.get(id)?.unsubscribe();
        this.active.delete(id);
        this.desired.delete(id);
      }
    };
  }

  private activateSubscription(id: string) {
    const entry = this.desired.get(id);
    if (!entry || !this.client || !this.connected) {
      return;
    }
    this.active.get(id)?.unsubscribe();
    const sub = this.client.subscribe(entry.destination, (message) => {
      this.ngZone.run(() => entry.callback(message));
    });
    this.active.set(id, sub);
  }
}
