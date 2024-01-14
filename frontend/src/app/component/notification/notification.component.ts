import { Component, OnDestroy, OnInit } from '@angular/core';
import { NotificationService } from "../../service/notification.service";
import { Subscription } from 'rxjs';
import { NotificationII } from '../../interfaces';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private notificationSubscription: Subscription = new Subscription();

  notifications: NotificationII[] = [];

  constructor(
    private notificationService: NotificationService
    ) { }

  ngOnInit(): void {
    this.notificationSubscription = this.notificationService.getNotification().subscribe((NotificationII) => {
      // if the user is in the chat, don't show the notification when notification type is 'chat'
      if (NotificationII.type == 'chat' && window.location.pathname.includes('/chat')) {
        return;
      }

      this.notifications.push(NotificationII);
      setTimeout(() => {
        this.notifications.shift();
      }, 5000);
    });
  }

  ngOnDestroy() {
    this.notificationSubscription.unsubscribe();
  }
}