import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RegistrationRequest, UserDTO } from '../../core/models/auth';
import { AuthenticationService } from '../../core/services/authentication.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './utilisateurs.component.html',
  styleUrl: '../parametres/parametres.component.scss'
})
export class UtilisateursComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly users = signal<UserDTO[]>([]);
  protected readonly usersPagination = signal<{
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }>({
    currentPage: 0,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1
  });

  protected readonly newUser = signal<RegistrationRequest>({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    pdvFne: '',
    etablisssementFne: ''
  });

  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadUsersPage(0);
  }

  protected registerUser(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.userService.registerUser(this.newUser()).subscribe({
      next: () => {
        this.showSuccess('Utilisateur enregistré avec succès.');
        this.newUser.set({
          firstname: '',
          lastname: '',
          email: '',
          password: '',
          pdvFne: '',
          etablisssementFne: ''
        });
        this.loadUsersPage(0, false);
      },
      error: () => this.handleError('Erreur lors de l’enregistrement de l’utilisateur')
    }).add(() => this.loading.set(false));
  }

  protected toggleUserLock(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.userService.toggleAccountLock(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update((users) =>
          users.map((user) => user.id === (updatedUser as any).id ? (updatedUser as any) : user)
        );
        this.showSuccess(`Compte utilisateur ${!currentStatus ? 'verrouillé' : 'déverrouillé'} avec succès`);
      },
      error: () => this.handleError('Erreur lors de la mise à jour du statut de verrouillage')
    }).add(() => this.loading.set(false));
  }

  protected toggleUserStatus(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.userService.toggleAccountStatus(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update((users) =>
          users.map((user) => user.id === (updatedUser as any).id ? (updatedUser as any) : user)
        );
        this.showSuccess(`Compte utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      },
      error: () => this.handleError('Erreur lors de la mise à jour du statut de l’utilisateur')
    }).add(() => this.loading.set(false));
  }

  protected loadUsersPage(page: number, showLoader = true): void {
    if (showLoader) {
      this.loading.set(true);
    }
    this.error.set(null);
    this.success.set(null);
    this.usersPagination.update((p) => ({ ...p, currentPage: page }));

    this.userService.getUsersPaginated(page, this.usersPagination().pageSize).subscribe({
      next: (result) => {
        this.users.set(result.users);
        this.usersPagination.update((p) => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: () => this.handleError('Erreur lors du chargement des utilisateurs')
    }).add(() => {
      if (showLoader) {
        this.loading.set(false);
      }
    });
  }

  protected getUsersPaginationEndIndex(): number {
    return Math.min(
      (this.usersPagination().currentPage + 1) * this.usersPagination().pageSize,
      this.usersPagination().totalItems
    );
  }

  protected changeUsersPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target?.value) return;

    const size = Number(target.value);
    if (!Number.isFinite(size) || size <= 0) return;

    this.usersPagination.update((p) => ({ ...p, pageSize: size, currentPage: 0 }));
    this.loadUsersPage(0);
  }

  protected getVisiblePages(): number[] {
    const pages: number[] = [];
    const totalPages = this.usersPagination().totalPages;
    const currentPage = this.usersPagination().currentPage;

    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);

      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (totalPages > 1) {
        pages.push(totalPages - 1);
      }
    }

    return Array.from(new Set(pages)).filter((page) => page >= 0 && page < totalPages);
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
