import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UserDTO } from '../../core/models/auth';
import { AuthenticationService } from '../../core/services/authentication.service';
import { NotificationService } from '../../core/services/notification.service';
import { RoleService } from '../../core/services/role.service';
import { UserService } from '../../core/services/user.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-attribution-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './attribution-roles.component.html',
  styleUrl: '../parametres/parametres.component.scss'
})
export class AttributionRolesComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly roles = signal<any[]>([]);
  protected readonly users = signal<UserDTO[]>([]);

  protected readonly selectedUserForRole = signal<number | null>(null);
  protected readonly selectedRoleForUser = signal<string>('');

  constructor(
    private readonly authService: AuthenticationService,
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  protected addRoleToUser(): void {
    if (!this.selectedUserForRole() || !this.selectedRoleForUser()) {
      this.notificationService.warning('Veuillez sélectionner un utilisateur et un rôle');
      return;
    }

    const userId = this.selectedUserForRole()!;
    const roleName = this.selectedRoleForUser();

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.userService.addRoleToUser(userId, roleName).subscribe({
      next: () => {
        this.showSuccess(`Rôle ${roleName} attribué à l'utilisateur avec succès`);
        this.selectedUserForRole.set(null);
        this.selectedRoleForUser.set('');
        this.loadUsers(false);
      },
      error: () => this.handleError('Erreur lors de l’attribution du rôle à l’utilisateur')
    }).add(() => this.loading.set(false));
  }

  protected userHasRole(userId: number, roleName: string): boolean {
    const user = this.users().find((u) => u.id === userId);
    return user ? user.roles?.includes(roleName) || false : false;
  }

  protected async removeRoleFromUser(userId: number, roleName: string): Promise<void> {
    const confirmed = await this.notificationService.confirm(
      `Êtes-vous sûr de vouloir retirer le rôle "${roleName}" de cet utilisateur ?`,
      'Confirmation de suppression'
    );

    if (!confirmed) {
      this.notificationService.info('Suppression annulée');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.userService.removeRoleFromUser(userId, roleName).subscribe({
      next: () => {
        this.showSuccess(`Rôle ${roleName} retiré de l'utilisateur avec succès`);
        this.loadUsers(false);
      },
      error: () => this.handleError('Erreur lors du retrait du rôle')
    }).add(() => this.loading.set(false));
  }

  private loadUsers(showLoader = true): void {
    if (showLoader) {
      this.loading.set(true);
    }

    this.userService.getUsers().subscribe({
      next: (users) => this.users.set(users as any),
      error: () => this.handleError('Erreur lors du chargement de la liste des utilisateurs')
    }).add(() => {
      if (showLoader) {
        this.loading.set(false);
      }
    });
  }

  private loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles as any),
      error: () => {
        this.roles.set([]);
        this.notificationService.warning('Impossible de charger la liste des rôles');
      }
    });
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

