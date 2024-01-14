import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenGuard {

  constructor(private authService: AuthService, private router: Router) { }

  async canActivate(): Promise<boolean> {
    if (await this.authService.hasValidToken()
      && await this.authService.ifUserExists()
      && await this.authService.isVerifiedTFA()) {
      return true;
    }

    this.router.navigateByUrl('/login');
    return false;
  }
}
