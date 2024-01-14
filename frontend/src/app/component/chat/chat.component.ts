import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { BehaviorSubject, Subscription, lastValueFrom, firstValueFrom } from 'rxjs';
import { ChatI, MessageI } from 'src/app/interfaces';
import { ChatService } from 'src/app/service/chat.service';
import { PlayService } from 'src/app/service/play.service';
import { AwsService } from 'src/app/service/aws.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from 'src/app/service/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('form') form: NgForm | undefined;
  @ViewChild('menuButton') menuButton!: ElementRef;
  @ViewChild('menuContainer') menuContainer!: ElementRef;
  @ViewChild('inviteDialog') inviteDialog!: TemplateRef<any>;
  @ViewChild('joinDialog') joinDialog!: TemplateRef<any>;

  userID: number = parseInt(localStorage.getItem('id') || '');
  isBlocked: boolean = false;
  isBlocking: boolean = false;

  messages: MessageI[] = [];
  message: string = '';
  unsentMessages: { [chatId: number]: string } = {};

  chat: ChatI | undefined;
  chats: ChatI[] = [];
  chat$: BehaviorSubject<ChatI> = new BehaviorSubject<ChatI>({});

  selectedConvIndex: number = 0;
  isMenuOpen: boolean = false;

  chatParameter: number = 0;

  private messagesSubscription: Subscription = new Subscription();
  private newMessageSubscription: Subscription = new Subscription();
  private chatsSubscription: Subscription = new Subscription();
  private chatSubscription: Subscription = new Subscription();
  private rerfreshSubscription: Subscription = new Subscription();

  private inviteSubscription: Subscription = new Subscription();
  invite: string | undefined;

  constructor(
    private chatService: ChatService,
    private playService: PlayService,
    private aws: AwsService,
    private elementRef: ElementRef,
    private http: HttpClient,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog) { }

  async ngOnInit() {
    this.getChatsByHttp();

    // subscribe to push messages to the messages array
    this.messagesSubscription = this.chatService.getChatMessages().subscribe((messages: MessageI[]) => {
      this.initMessages(messages);
    });

    // subscribe to set active chat
    this.chatSubscription = this.chat$.subscribe(async (chat: ChatI) => {
      if (chat && chat.id) {
        await this.getBlockStatus(chat);
        this.chatService.joinChat(chat.id);
      }
    });

    // subscribe to fetch chats list
    this.chatsSubscription = this.chatService.getChatsByWs().subscribe((chats: ChatI[]) => {
      // check if the chat list is in the same order as the one in the component, if so return
      if (this.chats.length === chats.length && this.chats.every((chat, index) => chat.id === chats[index].id)) {
        return;
      }
      this.initChats(chats);
    });

    // subscribe to fetch new messages
    this.newMessageSubscription = this.chatService.getNewMessage().subscribe(async (message: MessageI) => {
      // check if the message is already in the array and push if not
      if (!this.messages.find(msg => msg.id === message.id)) {
        if (message.user?.id) {
          message.avatarUrl = await this.aws.getAvatarUrl(message.user.id);
        }
        this.messages.unshift(message);
      }
    });

    // subscribe to refresh values
    this.rerfreshSubscription = this.auth.getRefreshValues().subscribe(() => {
      this.updateChatList();
      this.getBlockStatus(this.chat || {});
    });

    this.inviteSubscription = this.playService.getInviteStatus().subscribe((invite: string) => {
      if (invite === 'accepted' || invite === 'canceled')  {
        this.invite = 'Invite';
        if (invite === 'accepted') {
          this.router.navigate([`/play`]);
        }
      } else {
        this.invite = this.setInviteStatus(invite);
      }
    });
    
  }

  private async setInvite(id: number) {
    if (id === 0) {
      return;
    }
    const response: any = await firstValueFrom(
      this.http.get(`${environment.BACK_URL}/game/invite/${id}`, { 
        headers: this.auth.getHeader(),
      })
    );
    this.invite = this.setInviteStatus(response?.name);
  }

  private setInviteStatus(login: string | undefined): string {
    if (login) {
      if (login === localStorage.getItem('user')) {
        return 'Join';
      } else {
        return 'Cancel';
      } 
    } else {
      return 'Invite';
    }
  }

  ngAfterViewInit() {
    const chatsList = this.elementRef.nativeElement.querySelector('.select-chat');

    // Check if content overflows and apply a class to enable the scrollbar
    if (chatsList.scrollHeight > chatsList.clientHeight) {
      chatsList.classList.add('show-scrollbar');
    }

    this.positionMenu();

  }

  async getBlockStatus(chat: ChatI) {
    if (chat?.type === 'DIRECT' && chat.users) {
      const otherUser = chat.users.find(user => user.id !== this.userID);
      this.isBlocked = await lastValueFrom(this.http.get<boolean>(`${environment.BACK_URL}/friends/isBlocked/${otherUser?.id}`, { headers: this.auth.getHeader() }));
      this.isBlocking = await lastValueFrom(this.http.get<boolean>(`${environment.BACK_URL}/friends/isBlocking/${otherUser?.id}`, { headers: this.auth.getHeader() }));
    } else {
      this.isBlocked = false;
      this.isBlocking = false;
    }
  }

  updateChatList() {
    this.chatService.getChatsByHttp().subscribe((chats: ChatI[]) => {
      this.initChats(chats);
      if (this.chat === undefined && chats.length > 0) {
        this.openConversation(chats[0], 0);
      }
    });
  }

  getChatsByHttp() {
    // get the chats list through http request on initialization
    this.chatService.getChatsByHttp().subscribe((chats: ChatI[]) => {
      if (chats.length > 0) {
        this.initChats(chats);
        // navigate to the chat with the given id
        this.route.params.subscribe(async params => {
          // wait 1 second for the chat list to be fetched
          this.chatParameter = +params['id'];
          if (this.chatParameter) {
            // get the chat by id from the chats list
            const chat = this.chats.find(chat => chat.id === this.chatParameter);
            if (chat !== undefined) {
              this.openConversation(chat, this.chats.findIndex(chat => chat.id === this.chatParameter));
            } else {
              this.openConversation(chats[0], 0);
            }
          } else {
            this.openConversation(chats[0], 0);
          }
        });
      }
    });
  }

  initMessages(messages: MessageI[]) {
    this.messages = [];
    messages.forEach(message => {
      // check if the message is already in the local array and push if not
      if (!this.messages.find(msg => msg.id === message.id)) {
        this.messages.unshift(message);
      }
    });

    // assign avatar to every message
    this.messages.forEach(async message => {
      if (message.user?.id) {
        message.avatarUrl = await this.aws.getAvatarUrl(message.user.id);
      }
    });
  }

  initChats(chats: ChatI[]) {
    // set name and pic to every chat
    const currentChatId = this.chat?.id;
    this.chats = chats;
    if (this.chats.length > 0) {
      this.chats.forEach(async chat => {
        // fetching avatar and name for each chat
        if (chat.type === 'DIRECT') {
          const currentUserId = parseInt(localStorage.getItem('id') || '', 10);
          const otherUser = chat.users?.find(user => user.id !== currentUserId);
          if (otherUser && otherUser.id && otherUser.login) {
            chat.name = otherUser.login;
            chat.avatarUrl = await this.aws.getAvatarUrl(otherUser.id);
          } else {
            chat.avatarUrl = '../../../assets/default.jpg';
          }
          this.setInvite(this.chat?.id || 0);
        } else {
          chat.name = chat.name || 'Group';
          chat.avatarUrl = '../../../assets/group.jpg';
        }
      });

      if (this.chat && this.chats[this.selectedConvIndex]) {
        const chat = this.chats.find(chat => chat.id === currentChatId) || this.chats[this.selectedConvIndex];
        this.openConversation(chat, this.chats.findIndex(chat => chat.id === currentChatId));
      }
    }
  }

  async onSubmit() {
    if (this.message && this.message.trim()) {

      // return if blocked or blocking
      if (this.chat?.type === 'DIRECT') {
        if (this.isBlocked || this.isBlocking) {
          this.message = '';
          this.form?.reset();
          return;
        }
      }

      // make this chat the first one in the list
      if (this.chat && this.chats.length > 0) {
        const index = this.chats.findIndex(chat => chat.id === this.chat?.id);
        if (index > 0) {
          const chat = this.chats.splice(index, 1)[0];
          this.chats.unshift(chat);
        }
        this.selectedConvIndex = 0;
      }

      // send the message
      this.chatService.sendMessage(this.message, this.chat || {});
      this.message = '';
      this.form?.reset();

      if (this.chatParameter !== 0) {
        this.router.navigate([`/chat`]);
      }
    }
  }

  async openConversation(chat: ChatI, index: number) {
    if (this.chat && this.chat.id === chat.id) {
      this.selectedConvIndex = index;
      return;
    }

    this.messages = [];
    // set the selected chat as active
    if (this.chat && this.chat.id) {
      this.unsentMessages[this.chat.id] = this.message;
    }

    this.selectedConvIndex = index;

    this.chatService.leaveActiveChat();

    this.chat = chat;
    this.chat$.next(this.chat);

    if (this.chat?.type !== 'DIRECT') {
      this.isBlocked = false;
      this.isBlocking = false;
    }

    if (chat.id && this.unsentMessages[chat.id]) {
      this.message = this.unsentMessages[chat.id];
    } else {
      this.message = '';
    }
  }

  onKeyDown(event: KeyboardEvent) {
    // submit the form on enter key press
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  isNotToday(date: Date): boolean {
    // check if the message is not from today
    const today = new Date();
    const dateToCompare = new Date(date);

    return dateToCompare.getDate() !== today.getDate() ||
    dateToCompare.getMonth() !== today.getMonth() ||
    dateToCompare.getFullYear() !== today.getFullYear();
  }

  shouldHaveUsername(msg: MessageI): boolean {
    return (this.chat?.type !== 'DIRECT' && msg.user?.id !== this.userID);
  }

  isMessageMine(msg: MessageI): boolean {
    return msg.user?.id === this.userID;
  }

  openChatInfo() {
    // if the chat is direct open the friend profile on the same tab
    if (this.chat?.type === 'DIRECT') {
      this.router.navigate([`/profile/${this.chat.users?.find(user => user.id !== this.userID)?.id}`]);
    } else {
      // if the chat is group open the chat info on a same tab
      this.router.navigate([`/chat-info/${this.chat?.id}`]);
    }
  }

  openProfile(msg: MessageI) {
    if (!msg.user?.id) {
      return;
    }
    window.open(`/profile/${msg.user.id}`, '_self');
  }

  shouldShowProfilePicture(msg: MessageI): boolean {
    return (this.chat?.type !== 'DIRECT' && msg.user?.id !== this.userID);
  }

  positionMenu() {
    if (this.isMenuOpen) {
      const buttonRect = this.menuButton.nativeElement.getBoundingClientRect();
      const menuContainer = this.menuContainer.nativeElement;
      menuContainer.style.top = `${buttonRect.top}px`;
      menuContainer.style.right = `${document.body.clientWidth - buttonRect.right}px`;
    }
  }

  /**
   * PLAY
  */

  async openInviteDialog() {
    if (!this.invite || this.invite === 'Invite') {
      this.dialog.open(this.inviteDialog);
    } else if (this.invite === 'Join') {
      this.dialog.open(this.joinDialog);
    } else if (this.invite === 'Cancel') {
      await this.cancelInvite(this.chat);
    }
  }

  onCancelClick() {
    this.dialog.closeAll();
  }

  async cancelInvite(chat: ChatI | undefined) {
    if (!chat) {
      return ;
    }
    this.playService.deleteInvite(chat as ChatI, 'canceled');
  }

  onInviteClick(mode?: string) {
    if (!this.chat) {
      return ;
    }
    this.playService.inviteToGame(this.chat as ChatI, mode || '');
    this.dialog.closeAll();
  }

  ngOnDestroy() {
    // leave the active chat on component destroy and unsubscribe from all subscriptions
    this.chatService.leaveActiveChat();

    this.chats = [];
    this.messages = [];
    this.chat = undefined;

    this.messagesSubscription.unsubscribe();
    this.chatsSubscription.unsubscribe();
    this.chatSubscription.unsubscribe();
    this.newMessageSubscription.unsubscribe();
    this.rerfreshSubscription.unsubscribe();
    this.inviteSubscription.unsubscribe();
  }
}
