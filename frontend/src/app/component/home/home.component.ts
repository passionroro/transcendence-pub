import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, lastValueFrom } from 'rxjs';
import { AuthService } from 'src/app/service/auth.service';
import { environment } from 'src/environments/environment';
import { AwsService } from 'src/app/service/aws.service';
import { HttpClient } from '@angular/common/http';
import { UserI } from 'src/app/interfaces';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private usersSubscription: Subscription = new Subscription();
  private refreshValues: Subscription = new Subscription();

  msg: string | undefined;
  err: string | undefined;
  users: UserI[] = [];
  userID = parseInt(localStorage.getItem('id') || '0');

  constructor(
    private aws: AwsService,
    private http: HttpClient,
    private authService: AuthService,
    private userService: UserService,
  ) { }

  async ngOnInit() {
    const initUsers = await lastValueFrom(this.http.get<UserI[]>
      (environment.BACK_URL + '/user/get-all', { headers: this.authService.getHeader() }));
    this.initUserLIst(initUsers);

    this.userService.connectSocket();

    this.usersSubscription = this.userService.getUsersOnSite().subscribe((users: UserI[]) => {
      this.initUserLIst(users);
    });

    this.refreshValues = this.authService.getRefreshValues().subscribe(() => {
      this.ngOnInit();
    });
  }

  initUserLIst(UserList: UserI[]) {
    this.users = UserList.filter(u => u.id !== this.userID);
    this.users.forEach(async user => {
      if (user?.id) {
        user.avatarUrl = await this.aws.getAvatarUrl(user.id);
      }
    });
  }

  ngOnDestroy() {
    this.usersSubscription.unsubscribe();
    this.refreshValues.unsubscribe();
  }
}