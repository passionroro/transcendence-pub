import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { UserI } from 'src/app/interfaces';
import { AuthService } from 'src/app/service/auth.service';
import { AwsService } from 'src/app/service/aws.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-menu',
  templateUrl: './chat-menu.component.html',
  styleUrls: ['./chat-menu.component.css']
})
export class ChatMenuComponent implements OnInit {
  @ViewChild('createChannelDialog') createChannelDialog!: TemplateRef<any>;
  @Output() close = new EventEmitter<void>();

  friendsWithoutChat: UserI[] = [];
  friends: UserI[] = [];

  mainMenuOpen = true;
  friendMenuOpen = false;

  newChatName: string = '';
  newChatType: string = '';
  newChatPassword: string = '';
  selectedFriends: number[] = [];

  err: string | undefined;
  msg: string | undefined;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private aws: AwsService,
    private dialog: MatDialog,
    private router: Router,
  ) { }

  async ngOnInit() {
    // get a list of all friends that don't yet have a chat with the user
    this.friendsWithoutChat = await lastValueFrom(this.http.get<UserI[]>
      (`${environment.BACK_URL}/chat/friendswithoutchat`, { headers: this.auth.getHeader() }));
  
    // set avatar url for each friend
    for (const friend of this.friendsWithoutChat) {
      if (friend?.id) {
        friend.avatarUrl = await this.aws.getAvatarUrl(friend.id);
      }
    }

    // get a list of all friends
    this.friends = await lastValueFrom(this.http.get<UserI[]>
      (`${environment.BACK_URL}/friends/list`, { headers: this.auth.getHeader() }));
  }

  async chatFriendMenu() {
    // open the friend menu
    this.mainMenuOpen = false;
    this.friendMenuOpen = true;
  }

  async chatFriend(friend: UserI) {
    const chatId = await firstValueFrom(this.http.post(`${environment.BACK_URL}/friends/chat`, { id: friend.id }, { headers: this.auth.getHeader() }));
    this.router.navigate([`/chat/${chatId}`]);
  }

  onBackClick() {
    this.dialog.closeAll();
    this.friendMenuOpen = false;
    this.mainMenuOpen = true;
  }

  onCloseClick() {
    this.dialog.closeAll();
    this.close.emit();
    this.router.navigate(['/chat']);
  }

  async onCreateChannelContinueClick() {
    if (!/^[a-zA-Z0-9]{3,12}$/.test(this.newChatName)) {
      this.newChatName = '';
      this.newChatType = '';
      this.newChatPassword = '';
      this.selectedFriends = [];
      this.dialog.closeAll();
      this.err = 'Chat name must be 3 - 12 characters contained only letters and numbers';
      return;
    }

    this.dialog.closeAll();
    if (this.newChatType === 'PROTECTED' && !/^.{4,12}$/.test(this.newChatPassword)) {
      this.newChatName = '';
      this.newChatType = '';
      this.newChatPassword = '';
      this.selectedFriends = [];
      this.dialog.closeAll();
      this.err = 'Password must be 4 - 12 characters';
      return;
    }

    const response: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/create`,
      { name: this.newChatName, type: this.newChatType, password: this.newChatPassword, invited: this.selectedFriends },
      { headers: this.auth.getHeader() }));

    this.newChatName = '';
    this.newChatType = '';
    this.newChatPassword = '';
    this.selectedFriends = [];
    if (response && response.err) {
      this.err = response.err;
      return;
    } else {
      this.close.emit();
      this.router.navigate([`/chat/${response.channel.id}`]);
    }
  }

  openCreateChannelDialog() {
    this.newChatName = '';
    this.newChatType = '';
    this.dialog.open(this.createChannelDialog);
  }

  joinChannel() {
    this.router.navigate(['/join-channel']);
  }
}
