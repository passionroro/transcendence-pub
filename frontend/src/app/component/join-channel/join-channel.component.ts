import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription, lastValueFrom } from 'rxjs';
import { ChatI, UserI } from 'src/app/interfaces';
import { AuthService } from 'src/app/service/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-join-channel',
  templateUrl: './join-channel.component.html',
  styleUrls: ['./join-channel.component.css']
})
export class JoinChannelComponent implements OnInit, OnDestroy {
  @ViewChild('joinChannelDialog') joinChannelDialog!: TemplateRef<any>;
  private refreshSubsription: Subscription = new Subscription();

  err: string | undefined;
  msg: string | undefined;

  chosenChannel:        ChatI | undefined;
  chosenChannelCreator: string | undefined;
  channelPassword = '';
  channelImage    = 'assets/group.jpg'

  publicChannels:    ChatI[] = [];
  protectedChannels: ChatI[] = [];
  invitedChannels:   ChatI[] = [];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private dialog: MatDialog,
    private router: Router,
  ) { }

  async ngOnInit() {
    await this.getPublicChannels();
    await this.getProtectedChannels();
    await this.getInvitedChannels();

    this.refreshSubsription = this.auth.getRefreshValues().subscribe(async () => {
      await this.getPublicChannels();
      await this.getProtectedChannels();
      await this.getInvitedChannels();
    });
  }

  async getPublicChannels() {
    try {
      this.publicChannels = await lastValueFrom(this.http.get<ChatI[]>
        (`${environment.BACK_URL}/channel/get-public`, { headers: this.auth.getHeader() }));
    } catch (err: any) {
      this.err = err.error.err as string;
    }
  }

  async getProtectedChannels() {
    try {
      this.protectedChannels = await lastValueFrom(this.http.get<ChatI[]>
        (`${environment.BACK_URL}/channel/get-protected`, { headers: this.auth.getHeader() }));
    } catch (err: any) {
      this.err = err.error.err as string;
    }
  }

  async getInvitedChannels() {
    try {
      this.invitedChannels = await lastValueFrom(this.http.get<ChatI[]>
        (`${environment.BACK_URL}/channel/get-invited`, { headers: this.auth.getHeader() }));
    } catch (err: any) {
      this.err = err.error.err as string;
    }
  }

  async openJoinChannelDialog(channel: ChatI) {
    this.channelPassword = '';
    this.chosenChannelCreator = undefined;
    this.chosenChannel = channel;
    const creator: UserI = await lastValueFrom(
      this.http.get(`${environment.BACK_URL}/user/user/${channel.creatorId}`, { headers: this.auth.getHeader() })
    );
    this.chosenChannelCreator = creator.login;

    this.dialog.open(this.joinChannelDialog);
  }

  onCloseClick() {
    this.chosenChannel = undefined;
    this.channelPassword = '';
    this.chosenChannelCreator = undefined;
    this.dialog.closeAll();
  }

  async joinChannel() {
    if (this.chosenChannel?.type === "PROTECTED" && !/^.{4,12}$/.test(this.channelPassword)) {
      this.dialog.closeAll();
      this.err = 'Password must be 4 - 12 characters';
      return;
    }

    const res: any = await lastValueFrom(this.http.post(`${environment.BACK_URL}/channel/join`, 
      { id: this.chosenChannel?.id, password: this.channelPassword, type: this.chosenChannel?.type }, 
      { headers: this.auth.getHeader() }));

    this.onCloseClick();
    if (res['err']) {
      this.err = res['err'];
    } else {
      this.router.navigate([`/chat/${this.chosenChannel?.id}`]);
    }
  }

  ngOnDestroy() {
    this.refreshSubsription.unsubscribe();
  }
}
