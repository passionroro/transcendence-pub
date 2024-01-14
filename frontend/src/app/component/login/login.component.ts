import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/service/auth.service';
import { UserService } from 'src/app/service/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  err: string | undefined;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService,
    ) { }

  ngOnInit(): void {
    this.userService.disconnectSocket();
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.err = params['error'];
      }
    });
  }

  async login() {
    this.authService.login();
  }
}
