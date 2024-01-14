import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/service/auth.service';
import { AwsService } from 'src/app/service/aws.service';
import { UserI } from 'src/app/interfaces';
import { Subscription, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-friend-list',
  templateUrl: './friend-list.component.html',
  styleUrls: ['./friend-list.component.css']
})
export class FriendListComponent implements OnInit, OnDestroy {
  private friendsSubscription: Subscription = new Subscription();
  friends: UserI[] = [];

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private aws: AwsService,
    ) { }

  async ngOnInit(): Promise<void> {
    await this.getFriendList();
    this.friendsSubscription = this.auth.getRefreshValues().subscribe(async () => {
      await this.getFriendList();
    });
  }

  async getFriendList() {
    this.friends = await lastValueFrom(this.http.get<UserI[]>
      (environment.BACK_URL + '/friends/list', { headers: this.auth.getHeader() }));
    
    // assign avatar to every user
    for (const friend of this.friends) {
      if (friend?.id) {
        friend.avatarUrl = await this.aws.getAvatarUrl(friend.id);
      }
    }
  }

  ngOnDestroy() {
    this.friendsSubscription.unsubscribe();
  }
}
