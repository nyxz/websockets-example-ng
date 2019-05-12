import { Component, OnInit } from "@angular/core";
import { SocketClientService } from "./core/socket-client.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
  title = "websockets-example-ng";
  messages: string[] = [];

  constructor(private socketClientService: SocketClientService) {}

  ngOnInit(): void {
    this.socketClientService
      .onMessage("/topic/messages")
      .subscribe(message => this.messages.push(message));
  }

  sendMessage(): void {
    this.socketClientService.send('/app/message', {from: 'Test', text: 'This is a test'});
  }
}
