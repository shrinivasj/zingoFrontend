import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';

const WS_URL = 'http://localhost:8080/ws';

@Injectable({ providedIn: 'root' })
export class StompService {
  private client: Client | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  readonly connected$ = this.connectedSubject.asObservable();
  private pending: Array<{ destination: string; callback: (message: IMessage) => void }> = [];

  connect(token: string) {
    if (this.client?.active) {
      return;
    }
    const client = new Client({
      webSocketFactory: () => new SockJS(`${WS_URL}?token=${token}`),
      reconnectDelay: 5000
    });
    client.onConnect = () => {
      this.connectedSubject.next(true);
      this.pending.forEach((item) => {
        this.client?.subscribe(item.destination, item.callback);
      });
      this.pending = [];
    };
    client.onDisconnect = () => {
      this.connectedSubject.next(false);
    };
    client.onStompError = () => {
      this.connectedSubject.next(false);
    };
    client.activate();
    this.client = client;
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connectedSubject.next(false);
    }
  }

  subscribe(destination: string, callback: (message: IMessage) => void): StompSubscription | null {
    if (!this.client || !this.client.active) {
      this.pending.push({ destination, callback });
      return null;
    }
    return this.client.subscribe(destination, callback);
  }
}
