import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment'
import { AuthService } from 'src/app/service/auth.service';
import { AwsService } from 'src/app/service/aws.service';
import { BehaviorSubject, Observable, Subscription, lastValueFrom } from 'rxjs';
import { SocketService } from 'src/app/service/socket.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-friend-profile',
  templateUrl: './friend-profile.component.html',
  styleUrls: ['./friend-profile.component.css'],
})
export class FriendProfileComponent implements OnInit, OnDestroy {
  friendId:          number = 0;
  friendDetails:     any;
  avatarUrl:         string | null = null;
  msg:               string | undefined;
  err:               string | undefined;
  isFriend:          Observable<boolean> | undefined;
  isRequestSent:     Observable<boolean> | undefined;
  isRequestReceived: Observable<boolean> | undefined;
  isBlocking:        Observable<boolean> | undefined;
  isBlocked:         Observable<boolean> | undefined;
  friendStatus$: BehaviorSubject<string> = new BehaviorSubject<string>('offline');
  statusSubscription: Subscription = new Subscription();
  refreshValues:      Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private http:  HttpClient,
    private auth:  AuthService,
    private aws:   AwsService,
    private socket: SocketService,
    private cd: ChangeDetectorRef,
    private router: Router,
    ) {}

  ngOnInit(): void {
    // Get the friend's ID from the route parameters
    this.route.params.subscribe((params) => {
      this.friendId = +params['id']; // Convert the ID to a number

      // If the ID is not a number, redirect to the error page
      if (isNaN(this.friendId)) {
        this.router.navigate(['/error']);
      }

      // check if friendID is the same as the logged in user, if so redirect to profile
      if (this.friendId == (localStorage.getItem('id') || -1)) {
        this.router.navigate(['/profile']);
      }

      // Fetch the friend's details based on the ID
      this.http.get(`${environment.BACK_URL}/friends/${this.friendId}`, { headers: this.auth.getHeader() }).subscribe((data) => {
        this.friendDetails = data;
      });
    });

    this.fetchAvatar(this.friendId);
    this.getValues();

    this.statusSubscription = this.getFriendStatus().subscribe((status: string) => {
      this.friendStatus$.next(status);
      this.cd.detectChanges();
    });
    this.socket.emit('getStatus', this.friendId);

    this.refreshValues = this.auth.getRefreshValues().subscribe(() => {
      this.http.get(`${environment.BACK_URL}/friends/${this.friendId}`, { headers: this.auth.getHeader() }).subscribe((data) => {
        this.friendDetails = data;
      });
      this.getValues();
    });
  }

  getValues() {
    this.isFriend           = this.http.get<boolean>(`${environment.BACK_URL}/friends/isfriend/${this.friendId}`, { headers: this.auth.getHeader() });
    this.isRequestSent      = this.http.get<boolean>(`${environment.BACK_URL}/friends/isRequestSent/${this.friendId}`, { headers: this.auth.getHeader() });
    this.isRequestReceived  = this.http.get<boolean>(`${environment.BACK_URL}/friends/isRequestReceived/${this.friendId}`, { headers: this.auth.getHeader() });
    this.isBlocked          = this.http.get<boolean>(`${environment.BACK_URL}/friends/isBlocked/${this.friendId}`, { headers: this.auth.getHeader() });
    this.isBlocking         = this.http.get<boolean>(`${environment.BACK_URL}/friends/isBlocking/${this.friendId}`, { headers: this.auth.getHeader() });
  }

  ngOnDestroy() {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    if (this.refreshValues) {
      this.refreshValues.unsubscribe();
    }
  }

  getFriendStatus(): Observable<string> {
    return this.socket.fromEvent<string>(`status:${this.friendId}`);
  }

  async fetchAvatar(id: number): Promise<void>  {
    this.avatarUrl = '../../../assets/default.jpg';
    this.aws.fetchAvatarById(id).subscribe((res: Blob) => {
      if (!res) return;
      const url = window.URL.createObjectURL(res);
      this.avatarUrl = url;
    });
  }

  async chat() {
    const chatId = await lastValueFrom(this.http.post(`${environment.BACK_URL}/friends/chat`,
    { id: this.friendId }, { headers: this.auth.getHeader() }));
    this.router.navigate([`/chat/${chatId}`]);
  }

  async removeFriend() {
    const response: any = await lastValueFrom(this.http.delete
    (`${environment.BACK_URL}/friends/${this.friendId}`, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }

  async sendRequest() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/sendRequest`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }

  async cancelRequest() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/cancelRequest`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }

  async acceptRequest() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/acceptRequest`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }
  
  async declineRequest() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/declineRequest`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }

  async block() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/block`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }

  async unblock() {
    const response: any = await lastValueFrom(this.http.post
    (`${environment.BACK_URL}/friends/unblock`, { id: this.friendId }, { headers: this.auth.getHeader() }));
    if (response.status === 'error') {
      this.err = response.message;
    } else {
      this.getValues();
      this.msg = response.message;
    }
  }
}
