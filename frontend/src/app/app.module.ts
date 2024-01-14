import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './component/home/home.component';
import { PlayComponent } from './component/play/play.component';
import { ChatComponent } from './component/chat/chat.component';
import { PageNotFoundComponent } from './component/page-not-found/page-not-found.component';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './component/login/login.component';
import { AlertComponent } from './component/alert/alert.component';
import { CallbackComponent } from './component/callback/callback.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProfileComponent } from './component/profile/profile.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MsgComponent } from './component/msg/msg.component';
import { NumericInputDirective } from './numeric-input.directive';
import { RouterModule } from '@angular/router';
import { FriendListComponent } from './component/friend-list/friend-list.component';
import { FriendProfileComponent } from './component/friend-profile/friend-profile.component';
import { TopbarComponent } from './component/topbar/topbar.component';
import { ChatInfoComponent } from './component/chat-info/chat-info.component';
import { ChatMenuComponent } from './component/chat-menu/chat-menu.component';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { JoinChannelComponent } from './component/join-channel/join-channel.component';
import { NotificationComponent } from './component/notification/notification.component';
import { PlayHistoryComponent } from './component/play-history/play-history.component';
import { PlayDashboardComponent } from './component/play-dashboard/play-dashboard.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    PlayComponent,
    ChatComponent,
    PageNotFoundComponent,
    LoginComponent,
    AlertComponent,
    CallbackComponent,
    ProfileComponent,
    MsgComponent,
    NumericInputDirective,
    FriendListComponent,
    FriendProfileComponent,
    TopbarComponent,
    ChatInfoComponent,
    ChatMenuComponent,
    JoinChannelComponent,
    NotificationComponent,
    PlayHistoryComponent,
    PlayDashboardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    RouterModule,
    MatSelectModule,
    MatOptionModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
