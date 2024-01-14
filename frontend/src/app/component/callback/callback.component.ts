import { HttpClient } from '@angular/common/http';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/service/auth.service';
import { lastValueFrom  } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-callback',
  templateUrl: './callback.component.html',
  styleUrls: ['./callback.component.css']
})
export class CallbackComponent {
  @ViewChild('tfaDialogTemplate') tfaDialogTemplate!: TemplateRef<any>;
  tfaPassword: string = '';
  err: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private dialog: MatDialog,
    private userService: UserService,
    ) { }

  async requestToken(code: string) {
    try {
      const response: any = await lastValueFrom(this.http.get(environment.BACK_URL + '/auth/token?code=' + code));
      const token = response.token;
      if (token) {
        return token;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.log('error: ', error);
      this.err = "Coudn't complete the authentication process.";
      this.router.navigate(['/login']);
    }
  }

  async getUserInfo(token: string) {
    try {
      const response = await lastValueFrom(this.http.get(environment.BACK_URL + '/user/data/' + token));
      return response;
    } catch (error) {
      console.log('error: ', error);
      throw new Error('Could not get user info');
    }
  }

  ngOnInit(): void {
    this.userService.disconnectSocket();
    this.route.queryParams.subscribe(async params => {
      try {
        const authCode = params['code'];
        if (authCode) {
          const token = await this.requestToken(authCode);
          if (token) {
              const userInfo: any = await this.getUserInfo(token);
              const response: any = await lastValueFrom(this.http.get(environment.BACK_URL + '/auth/sign',
              { params: { username: userInfo.login, email: userInfo.email, id: userInfo.id } }));
              localStorage.setItem('token', response.token);
              localStorage.setItem('user', response.login);
              localStorage.setItem('id', response.id);

              if (await this.authService.ifTFAEnabled()) {
                this.dialog.open(this.tfaDialogTemplate);
                this.router.navigate(['/login']);
              } else {
                window.location.href = '/';
              }
          } else {
            throw new Error('No token in response');
          }
        } else {
          throw new Error('No auth code in response');
        }
      } catch (error) {
        console.error('error: ', error);
        this.router.navigate(['/login'], { queryParams: { error: "Couldn't complete the authentication process." } });
      }
    });
  }

  onCancelClick() {
    this.tfaPassword = '';
    this.dialog.closeAll();
    this.router.navigate(['/login']);
  }

  async onSendClick() {
    this.dialog.closeAll();
    try {
      if (!/^\d{6}$/.test(this.tfaPassword)) {
      this.tfaPassword = '';
      throw new Error('Invalid TFA code');
      }

      const response: any = await this.authService.verifyTFA(this.tfaPassword);
      this.tfaPassword = '';
      if (response && response.err) {
        throw new Error(response.err);
      } else if (response.ok === true) {
        this.router.navigate(['/']);
      }
    } catch (error) {
      this.tfaPassword = '';
      localStorage.removeItem('token');
      this.router.navigate(['/login'], { queryParams: { error: error } });
    }  
  }
}
