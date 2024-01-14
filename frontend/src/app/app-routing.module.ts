import { NgModule, inject }       from '@angular/core';
import { RouterModule, Routes }   from '@angular/router';
import { HomeComponent }          from './component/home/home.component';
import { PlayComponent }          from './component/play/play.component';
import { ChatComponent }          from './component/chat/chat.component';
import { PageNotFoundComponent }  from './component/page-not-found/page-not-found.component';
import { LoginComponent }         from './component/login/login.component';
import { TokenGuard }             from './guard/token.guard';
import { CallbackComponent }      from './component/callback/callback.component';
import { ProfileComponent }       from './component/profile/profile.component';
import { FriendProfileComponent } from './component/friend-profile/friend-profile.component';
import { ChatInfoComponent }      from './component/chat-info/chat-info.component';
import { JoinChannelComponent } from './component/join-channel/join-channel.component';

const routes: Routes = [
  { path: 'login',            component : LoginComponent },
  { path: 'callback',         component : CallbackComponent },
  { path: '', canActivate: [() => inject(TokenGuard).canActivate()], children: [
    { path: 'home',           component : HomeComponent },
    { path: 'play',           component : PlayComponent },
    { path: 'chat-info/:id',  component : ChatInfoComponent },
    { path: 'chat/:id',       component : ChatComponent },
    { path: 'chat',           component : ChatComponent },
    { path: 'join-channel',   component : JoinChannelComponent },
    { path: 'profile/:id',    component : FriendProfileComponent },
    { path: 'profile',        component : ProfileComponent},
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**',             component : PageNotFoundComponent }
  ]}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
