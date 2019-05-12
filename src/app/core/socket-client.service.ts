import { Injectable, OnDestroy } from "@angular/core";
import { Observable } from "rxjs/internal/Observable";
import { Client, Message, StompSubscription, IFrame } from "@stomp/stompjs";
import * as SockJS from "sockjs-client";
import { environment } from "../../environments/environment";
import { filter, first, switchMap } from "rxjs/operators";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { SocketClientState } from "./socket-client-state";

@Injectable({
  providedIn: "root"
})
export class SocketClientService implements OnDestroy {
  private client: Client;
  private state: BehaviorSubject<SocketClientState>;

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.api}/ws`),
      connectHeaders: {
        login: "user",
        passcode: "password"
      },
      debug: function(str) {
        console.log(str);
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 1000,
      heartbeatOutgoing: 1000
    });
    this.state = new BehaviorSubject<SocketClientState>(
      SocketClientState.ATTEMPTING
    );
    this.client.onConnect = (frame: IFrame) =>
      this.state.next(SocketClientState.CONNECTED);
    this.client.activate();
  }

  connect(): Observable<Client> {
    return new Observable<Client>(observer => {
      this.state
        .pipe(filter(state => state === SocketClientState.CONNECTED))
        .subscribe(() => observer.next(this.client));
    });
  }

  ngOnDestroy() {
    this.connect()
      .pipe(first())
      .subscribe(inst => inst.deactivate());
  }

  onMessage(
    topic: string,
    handler = SocketClientService.jsonHandler
  ): Observable<any> {
    return this.connect().pipe(
      first(),
      switchMap(inst => {
        return new Observable<any>(observer => {
          const subscription: StompSubscription = inst.subscribe(
            topic,
            message => observer.next(handler(message))
          );
          return () => inst.unsubscribe(subscription.id);
        });
      })
    );
  }

  onPlainMessage(topic: string): Observable<string> {
    return this.onMessage(topic, SocketClientService.textHandler);
  }

  send(topic: string, payload: any): void {
    this.connect()
      .pipe(first())
      .subscribe(inst =>
        inst.publish({ destination: topic, body: JSON.stringify(payload) })
      );
  }

  static jsonHandler(message: Message): any {
    return JSON.parse(message.body);
  }

  static textHandler(message: Message): string {
    return message.body;
  }
}
