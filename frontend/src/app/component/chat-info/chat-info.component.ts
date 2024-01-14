import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ChatI, UserI } from 'src/app/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/service/auth.service';
import { environment } from 'src/environments/environment';
import { Subscription, lastValueFrom } from 'rxjs';
import { AwsService } from 'src/app/service/aws.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-chat-info',
  templateUrl: './chat-info.component.html',
  styleUrls: ['./chat-info.component.css']
})
export class ChatInfoComponent implements OnInit, OnDestroy {

  refreshValues:    Subscription = new Subscription();
  userId:           number = localStorage.getItem('id') ? +localStorage.getItem('id')! : 0;
  chatId:           number = 0;
  chatData:         ChatI = {};
  isRoot:           boolean = false;
  isAdmin:          boolean = false;
  creator:          string | undefined;
  msg:              string | undefined;
  err:              string | undefined;
  newChatPassword:  string = '';
  newChatName:      string = '';
  friendsToInvite:  UserI[] = [];
  memberSettings:   UserI | undefined;
  selectedTime:     string = '';
  

  constructor(
    private route:    ActivatedRoute,
    private http:     HttpClient,
    private auth:     AuthService,
    private aws:      AwsService,
    protected dialog: MatDialog,
    private router:   Router,
  ) { }

  async ngOnInit() {
    this.route.params.subscribe((params) => {
      if (params['id'] && !isNaN(+params['id'])) {
        this.chatId = +params['id'];
        this.loadData();
      } else {
        this.router.navigate(['/page-not-found']);
      }
    });

    this.subscribeToSocket();
  }

  subscribeToSocket() {
    this.refreshValues = this.auth.getRefreshValues().subscribe(() => {
      this.loadData();
    });
  }

  async loadData() {
    // fetch chat data
    this.chatData = await lastValueFrom(this.http.get<ChatI>(`${environment.BACK_URL}/chat/data/${this.chatId}`, { headers: this.auth.getHeader() }));
    if (this.chatData !== null) {
      this.chatData.avatarUrl = '../../../assets/group.jpg';

      // forward to chats if user is not in the chat
      if (!this.chatData.users?.some((user) => user.id == this.userId)) {
        this.router.navigate(['/chat']);
      }

      // fetch creator name
      const creator = await lastValueFrom(this.http.get<UserI>(`${environment.BACK_URL}/user/user/${this.chatData.creatorId}`, { headers: this.auth.getHeader() }));
      this.creator = creator.login;

      // check if the user is the rootUser
      this.isRoot = this.chatData.rootUser?.id == this.userId ? true : false;

      // check if the user is an admin
      this.isAdmin = this.chatData.admins?.some((admin) => admin.id == this.userId) ? true : false;

      // assign avatar and status to every user
      if (this.chatData.users) {
        for (const user of this.chatData.users) {
          if (user?.id) {
            user.avatarUrl = await this.aws.getAvatarUrl(user.id);
            this.chatData.admins?.some((admin) => admin.id == user.id) ? user.chatRank = 'ADM' : user.chatRank = 'MEM';
            this.chatData.rootUser?.id == user.id ? user.chatRank = 'OWN' : user.chatRank = user.chatRank;
          }
        }
      }

      // fetch friends to invite
      this.fetchFrriendsToInvite();
    } else {
      this.router.navigate(['/page-not-found']);
    }
  }

  async fetchFrriendsToInvite() {
    // fetch friends to invite
    const friends: UserI[] = await lastValueFrom(this.http.get<UserI[]>(`${environment.BACK_URL}/friends/list`,
    { headers: this.auth.getHeader() }));
    this.friendsToInvite = friends.filter((friend) => !this.chatData.users?.some((user) => user.id == friend.id));

    // filter out those who are already invited
    if (this.chatData.invited) {
      this.friendsToInvite = this.friendsToInvite.filter((friend) => !this.chatData.invited?.some((invitedUser) => invitedUser.id == friend.id));
    }

    // filter out banned users
    if (this.chatData.banned) {
      this.friendsToInvite = this.friendsToInvite.filter((friend) => !this.chatData.banned?.some((bannedUser) => bannedUser.id == friend.id));
    }

    // fetch friendsToInvite avatar
    for (const friend of this.friendsToInvite) {
      friend.avatarUrl = await this.aws.getAvatarUrl(friend.id? friend.id : 0);
    }

    // fetch invited users avatar
    if (this.chatData.invited) {
      for (const invitedUser of this.chatData.invited) {
        invitedUser.avatarUrl = await this.aws.getAvatarUrl(invitedUser.id? invitedUser.id : 0);
      }
    }

    // fetch banned users avatar
    if (this.chatData.banned) {
      for (const bannedUser of this.chatData.banned) {
        bannedUser.avatarUrl = await this.aws.getAvatarUrl(bannedUser.id? bannedUser.id : 0);
      }
    }
  }

  onCancelClick() {
    this.selectedTime = '';
    this.newChatName = '';
    this.newChatPassword = '';
    this.memberSettings = undefined;
    this.dialog.closeAll();
  }

  async onSaveNameClick() {
    if (!/^[a-zA-Z0-9]{3,12}$/.test(this.newChatName)) {
      this.newChatName = '';
      this.dialog.closeAll();
      this.err = 'Chat name must be 3 - 12 characters contained only letters and numbers';
      return;
    }

    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/changename/${this.chatId}`,
    { name: this.newChatName }, { headers: this.auth.getHeader() }));
    this.newChatName = '';

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }
  
  async onSavePasswordClick() {
    if (!/^.{4,12}$/.test(this.newChatPassword)) {
      this.newChatPassword = '';
      this.dialog.closeAll();
      this.err = 'Chat password must be 4 - 12 characters';
      return;
    }

    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/changepassword/${this.chatId}`,
    { password: this.newChatPassword }, { headers: this.auth.getHeader() }));
    this.newChatPassword = '';

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async onMakeChatPublicClick() {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/make-public/${this.chatId}`,
    {}, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async onMakeChatPrivateClick() {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/make-private/${this.chatId}`,
    {}, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async onLeaveChannelClick() {
    this.refreshValues.unsubscribe();
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/leave/${this.chatId}`,
    {}, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.subscribeToSocket();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      this.router.navigate(['/chat']);
      return;
    }
  }

  async onDeleteChannelClick() {
    this.refreshValues.unsubscribe();
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/delete/${this.chatId}`,
    {}, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      this.router.navigate(['/chat']);
      return;
    }
  }

  async onInviteFriendClick(userId?: number) {
    if (userId !== undefined) {
      const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/invite/${this.chatId}`,
      { userId: userId }, { headers: this.auth.getHeader() }));

      if (response['error']) {
        this.dialog.closeAll();
        this.err = response['error'];
        return;
      } else {
        this.dialog.closeAll();
        this.msg = response['success'];
        return;
      }
    }
  }

  async onUninviteFriendClick(userId?: number) {
    if (userId !== undefined) {
      const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/uninvite/${this.chatId}`,
      { userId: userId }, { headers: this.auth.getHeader() }));

      if (response['error']) {
        this.dialog.closeAll();
        this.err = response['error'];
        return;
      } else {
        this.dialog.closeAll();
        this.msg = response['success'];
        return;
      }
    }
  }

  async addAdmin(user: UserI) {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/add-admin/${this.chatId}`,
    { userId: user.id }, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async removeAdmin(user: UserI) {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/remove-admin/${this.chatId}`,
    { userId: user.id }, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async kickUser(user: UserI) {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/kick/${this.chatId}`,
    { userId: user.id }, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async banUser(user: UserI) {
    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/ban/${this.chatId}`,
    { userId: user.id }, { headers: this.auth.getHeader() }));

    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  showMuteButton(user?: UserI) {
    if (user && this.isAdmin && this.memberSettings && this.memberSettings.chatRank !== 'OWN'
      && !this.chatData.muted?.some((mutedUser) => mutedUser.userId == user.id)) {
      return true;
    }

    return false;
  }

  showUnmuteButton(user?: UserI) {
    if (user && this.isAdmin && this.memberSettings && this.memberSettings.chatRank !== 'OWN'
      && this.chatData.muted?.some((mutedUser) => mutedUser.userId == user.id)) {
      return true;
    }

    return false;
  }

  async muteUser() {
    if (this.memberSettings === undefined) { return; }

    const [hours, minutes] = this.selectedTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/mute/${this.chatId}`,
    { userId: this.memberSettings.id , minutes: totalMinutes }, { headers: this.auth.getHeader() }));
    
    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    }
  }

  async unmuteUser(user?: UserI) {
    if (!user) { return; }

    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/unmute/${this.chatId}`,
    { userId: user.id }, { headers: this.auth.getHeader() }));
    
    if (response['error']) {
      this.dialog.closeAll();
      this.err = response['error'];
      return;
    } else {
      this.dialog.closeAll();
      this.msg = response['success'];
      return;
    } 
  }

  async onUnbanUserClick(userId?: number) {
    if (userId !== undefined) {
      const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/unban/${this.chatId}`,
      { userId: userId }, { headers: this.auth.getHeader() }));

      if (response['error']) {
        this.dialog.closeAll();
        this.err = response['error'];
        return;
      } else {
        this.dialog.closeAll();
        this.msg = response['success'];
        return;
      }
    }
  }

  ngOnDestroy() {
    this.refreshValues.unsubscribe();
  }
}
