import { Component, signal } from '@angular/core';
import { AuthenticationService } from '../../core/services/authentication.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-menu-gauche',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu-gauche.html',
  styleUrl: './menu-gauche.scss',
})
export class MenuGauche {
  protected readonly parametresExpanded = signal(false);
  protected readonly observabiliteExpanded = signal(true);
  protected readonly fneExpanded = signal(true);
  protected readonly configurationExpanded = signal(true);

  constructor(
    private readonly auth: AuthenticationService,
    private readonly router: Router,
  ) {
    this.parametresExpanded.set(this.isParametresActive());
  }

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

  protected toggleParametresMenu(): void {
    if (!this.hasAdminRole()) {
      return;
    }

    if (!this.isParametresActive()) {
      this.parametresExpanded.set(true);
      this.router.navigate(['/parametres']);
      return;
    }

    this.parametresExpanded.update((value) => !value);
  }

  protected toggleObservabiliteMenu(): void {
    this.observabiliteExpanded.update((value) => !value);
  }

  protected toggleFneMenu(): void {
    this.fneExpanded.update((value) => !value);
  }

  protected toggleConfigurationMenu(): void {
    this.configurationExpanded.update((value) => !value);
  }

  protected isParametresActive(): boolean {
    const url = this.router.url;
    return (
      url.startsWith('/parametres') ||
      url.startsWith('/metriques') ||
      url.startsWith('/journal-audit') ||
      url.startsWith('/activite-compte') ||
      url.startsWith('/historique-excel') ||
      url.startsWith('/configuration-fne-active') ||
      url.startsWith('/societes') ||
      url.startsWith('/utilisateurs') ||
      url.startsWith('/roles') ||
      url.startsWith('/attribution-roles')
    );
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
