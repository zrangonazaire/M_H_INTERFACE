import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthenticationService } from '../../core/services/authentication.service';
import { NotificationService } from '../../core/services/notification.service';
import { RoleService } from '../../core/services/role.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './roles.component.html',
  styleUrl: '../parametres/parametres.component.scss'
})
export class RolesComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly roles = signal<any[]>([]);
  protected readonly newRole = signal({
    code: '',
    nom: ''
  });

  constructor(
    private readonly authService: AuthenticationService,
    private readonly roleService: RoleService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  protected createRole(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.roleService.createRole(this.newRole() as any).subscribe({
      next: (role) => {
        this.roles.update((roles) => [role, ...roles]);
        this.newRole.set({ code: '', nom: '' });
        this.showSuccess('Rôle créé avec succès');
      },
      error: () => this.handleError('Erreur lors de la création du rôle')
    }).add(() => this.loading.set(false));
  }

  private loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles as any),
      error: () => this.handleError('Erreur lors du chargement des rôles')
    }).add(() => this.loading.set(false));
  }

  private handleError(message: string): void {
    this.error.set(message);
    this.notificationService.error(message);
  }

  private showSuccess(message: string): void {
    this.success.set(message);
    this.notificationService.success(message);
  }
}

