import { Component } from '@angular/core';
import { AuthenticationService } from '../../core/services/authentication.service';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-menu-gauche',
  imports: [RouterLink],
  templateUrl: './menu-gauche.html',
  styleUrl: './menu-gauche.scss',
})
export class MenuGauche {
  constructor(
    private readonly auth: AuthenticationService,
    private readonly router: Router,
  ) { }

  protected hasAdminRole(): boolean {
    const authorities = this.auth.getCurrentAuthorities();
    return authorities.includes('ADMIN');
  }

  protected checkParametresAccess(): void {
    const authorities = this.auth.getCurrentAuthorities();

    if (authorities.includes('ADMIN')) {
      this.router.navigate(['/parametres']);
    } else {
      alert('Vous n\'avez pas le droit sur cette fonctionnalité');
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
