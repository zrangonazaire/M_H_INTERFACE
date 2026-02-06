import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  protected readonly userFullName = signal('Compte');

  constructor(
    private readonly auth: AuthenticationService,
    private readonly router: Router,
    private readonly attributionService: AttributionService,
    private readonly userService: UserService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
    debugger;
    this.auth.getCurrentEtabFNE();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  protected checkParametresAccess(): void {
    debugger;
    const userId = this.auth.getCurrentId();
    const roleId = 1;//this.auth.getCurrentIdRole();

    if (!userId || !roleId) {
      alert('Informations utilisateur manquantes');
      return;
    }

    this.userService
      .getIfRoleExiteByIdUser(Number(userId), Number(roleId))
      .subscribe({
        next: (hasAccess: boolean) => {
          console.log('THE ROLE IS', hasAccess);

          if (hasAccess === true) {
            this.router.navigate(['/parametres']);
          } else {
            alert('Vous n\'avez pas le droit sur cette fonctionnalité');
          }
        },
        error: (error) => {
          console.error('Erreur lors de la vérification des droits:', error);

          if (error.status === 0) {
            alert('Impossible de contacter le serveur (backend arrêté ou URL incorrecte)');
          } else {
            alert(`Erreur ${error.status} : ${error.error?.message || error.message}`);
          }
        }
      });
  }
}
