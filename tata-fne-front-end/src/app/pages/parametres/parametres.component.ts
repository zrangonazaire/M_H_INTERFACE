import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../core/services/authentication.service';
import { RoleService } from '../../core/services/role.service';
import { FunctionalityService } from '../../core/services/functionality.service';
import { RoleFunctionalityService } from '../../core/services/role-functionality.service';
import { EtablissementService } from '../../core/services/etablissement.service';
import { SocietyService } from '../../core/services/society.service';
import { DepartmentService, DepartmentResponse } from '../../core/services/department.service';
import { AttributionService } from '../../core/services/attribution.service';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import { RegistrationRequest, ChangePasswordRequest, UserDTO } from '../../core/models/auth';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MenuGauche],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.scss'
})
export class ParametresComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab= signal('Compte');

  // API Data
  roles = signal<any[]>([]);
  functionalities = signal<any[]>([]);
  roleFunctionalities = signal<any[]>([]);
  departments = signal<DepartmentResponse[]>([]);
  etablissements = signal<any[]>([]);
  societies = signal<any[]>([]);
  attributions = signal<any[]>([]);
  users = signal<UserDTO[]>([]);

  // Pagination State
  pagination = signal<{
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

  // Attribution Pagination State
  attributionPagination = signal<{
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

  // Users Pagination State
  usersPagination = signal<{
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

  // Form data
  newRole = signal({
    code: '',
    nom: ''
  });

  newFunctionality = signal({
    nom: '',
    description: '',
    code: ''
  });

  newEtablissement = signal({
    codeEtablissement: '',
    nom: '',
    typeEtablissement: '',
    adresse: '',
    ville: '',
    telephone: '',
    email: '',
    responsable: '',
    dateOuverture: '',
    activitePrincipale: '',
    idSociete: 1
  });

  newDepartment = signal({
    code: '',
    nom: '',
    idEtablissement: 1
  });

  newSociety = signal({
    raisonSociale: '',
    sigle: '',
    formeJuridique: '',
    objetSocial: '',
    numeroRccm: '',
    numeroIfu: '',
    capitalSocial: 0,
    siegeSocial: '',
    pays: '',
    ville: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    dirigeantPrincipal: '',
    exerciceComptableDebut: '',
    exerciceComptableFin: ''
  });

  // User Management Form Data
  newUser = signal<RegistrationRequest>({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    pdvFne: '',
    etablisssementFne: ''
  });

  changePassword = signal<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmationPassword: ''
  });

  // UI State
  activeTab = signal('roles');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Department-User Management State
  selectedDepartmentForUsers = signal<number | null>(null);
  usersForDepartment = signal<any[]>([]);
  selectedUsersToAdd = signal<number[]>([]);

  // Attribution Management State
  selectedUserId = signal<number | null>(null);
  selectedFunctionalityId = signal<number | null>(null);
  selectedRights = signal<string[]>([]);
  availableRights = signal<string[]>(['lecture', 'writing', 'modification', 'deletion', 'impression', 'validation']);

  // Role-User Management State
  selectedUserForRole = signal<number | null>(null);
  selectedRoleForUser = signal<string>('');

  constructor(
    private readonly auth: AuthenticationService,
    private readonly router: Router,
    private readonly roleService: RoleService,
    private readonly functionalityService: FunctionalityService,
    private readonly roleFunctionalityService: RoleFunctionalityService,
    private readonly departmentService: DepartmentService,
    private readonly etablissementService: EtablissementService,
    private readonly societyService: SocietyService,
    private readonly attributionService: AttributionService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.auth.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.auth.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    debugger;
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load all data in parallel
      this.roleService.getRoles().subscribe({
        next: (roles) => this.roles.set(roles),
        error: (err) => this.handleError('Erreur lors du chargement des rôles')
      });

      this.functionalityService.getFunctionalities().subscribe({

        next: (functionalities) => this.functionalities.set(functionalities),
        error: (err) => this.handleError('Erreur lors du chargement des fonctionnalités')
      });

      this.roleFunctionalityService.getRoleFunctionalities().subscribe({
        next: (roleFunctionalities) => this.roleFunctionalities.set(roleFunctionalities),
        error: (err) => this.handleError('Erreur lors du chargement des rôles-fonctionnalités')
      });

      this.departmentService.getDepartments().subscribe({
        next: (departments) => this.departments.set(departments),
        error: (err) => this.handleError('Erreur lors du chargement des départements')
      });

      this.etablissementService.getEtablissements().subscribe({
        next: (etablissements) => this.etablissements.set(etablissements),
        error: (err) => this.handleError('Erreur lors du chargement des établissements')
      });

      this.societyService.getSocietiesPaginated(this.pagination().currentPage, this.pagination().pageSize).subscribe({
        next: (result) => {
          this.societies.set(result.societies);
          this.pagination.update(p => ({
            ...p,
            currentPage: result.currentPage,
            totalItems: result.totalItems,
            totalPages: result.totalPages
          }));
        },
        error: (err) => this.handleError('Erreur lors du chargement des sociétés')
      });

      this.attributionService.getAttributions().subscribe({
        next: (attributions) => this.attributions.set(attributions),
        error: (err) => this.handleError('Erreur lors du chargement des attributions')
      });

      // Load users with pagination
      this.loadUsersPage(0);

      // Also load all users for dropdowns and department management
      this.userService.getUsers().subscribe({
        next: (users) => this.users.set(users),
        error: (err) => this.handleError('Erreur lors du chargement des utilisateurs')
      });

    } catch (err) {
      this.handleError('Erreur lors du chargement des données');
    } finally {
      this.loading.set(false);
    }
  }

  // Role Management
  createRole(): void {
    this.loading.set(true);
    this.roleService.createRole(this.newRole()).subscribe({
      next: (role) => {
        this.roles.update(roles => [...roles, role]);
        this.newRole.set({ code: '', nom: '' });
        this.showSuccess('Rôle créé avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la création du rôle')
    }).add(() => this.loading.set(false));
  }

  // Department Management
  createDepartment(): void {
    this.loading.set(true);
    this.departmentService.createDepartment(this.newDepartment()).subscribe({
      next: (department) => {
        this.departments.update(depts => [...depts, {
          ...department,
          codeEtablissement: '', // These will be populated when fetched from backend
          libelleEtablissement: ''
        }]);
        this.newDepartment.set({ code: '', nom: '', idEtablissement: 1 });
        this.showSuccess('Département créé avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la création du département')
    }).add(() => this.loading.set(false));
  }

  // Department-User Management
  loadUsersForDepartment(departmentId: number): void {
    this.loading.set(true);
    this.selectedDepartmentForUsers.set(departmentId);
    this.departmentService.getUsersByDepartment(departmentId).subscribe({
      next: (users) => {
        this.usersForDepartment.set(users);
      },
      error: (err) => this.handleError('Erreur lors du chargement des utilisateurs du département')
    }).add(() => this.loading.set(false));
  }

  addUsersToDepartment(): void {
    if (!this.selectedDepartmentForUsers()) return;

    this.loading.set(true);
    this.departmentService.addUsersToDepartment(this.selectedDepartmentForUsers()!, this.selectedUsersToAdd()).subscribe({
      next: () => {
        this.showSuccess('Utilisateurs ajoutés au département avec succès');
        this.loadUsersForDepartment(this.selectedDepartmentForUsers()!);
        this.selectedUsersToAdd.set([]);
      },
      error: (err) => this.handleError('Erreur lors de l\'ajout des utilisateurs au département')
    }).add(() => this.loading.set(false));
  }

  removeUserFromDepartment(departmentId: number, userId: number): void {
    this.loading.set(true);
    this.departmentService.removeUserFromDepartment(departmentId, userId).subscribe({
      next: () => {
        this.showSuccess('Utilisateur retiré du département avec succès');
        this.loadUsersForDepartment(departmentId);
      },
      error: (err) => this.handleError('Erreur lors du retrait de l\'utilisateur du département')
    }).add(() => this.loading.set(false));
  }

  toggleUserSelection(userId: number): void {
    const currentSelection = this.selectedUsersToAdd();
    if (currentSelection.includes(userId)) {
      this.selectedUsersToAdd.set(currentSelection.filter(id => id !== userId));
    } else {
      this.selectedUsersToAdd.set([...currentSelection, userId]);
    }
  }

  // Helper methods for template
  getDepartmentName(departmentId: number): string {
    const dept = this.departments().find(d => d.id === departmentId);
    return dept ? dept.nom : 'Département inconnu';
  }

  isUserInDepartment(userId: number): boolean {
    return this.usersForDepartment().some(u => u.id === userId);
  }

  // Functionality Management
  createFunctionality(): void {
    this.loading.set(true);
    this.functionalityService.createFunctionality(this.newFunctionality()).subscribe({
      next: (functionality) => {
        this.functionalities.update(funcs => [...funcs, functionality]);
        this.newFunctionality.set({ nom: '', description: '', code: '' });
        this.showSuccess('Fonctionnalité créée avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la création de la fonctionnalité')
    }).add(() => this.loading.set(false));
  }

  // Etablissement Management
  createEtablissement(): void {
    this.loading.set(true);
    this.etablissementService.createEtablissement(this.newEtablissement()).subscribe({
      next: (etablissement) => {
        this.etablissements.update(etabs => [...etabs, etablissement]);
        this.newEtablissement.set({
          codeEtablissement: '',
          nom: '',
          typeEtablissement: '',
          adresse: '',
          ville: '',
          telephone: '',
          email: '',
          responsable: '',
          dateOuverture: '',
          activitePrincipale: '',
          idSociete: 1
        });
        this.showSuccess('Établissement créé avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la création de l\'établissement')
    }).add(() => this.loading.set(false));
  }

  // Society Management
  createSociety(): void {
    this.loading.set(true);
    this.societyService.createSociety(this.newSociety()).subscribe({
      next: (society) => {
        this.societies.update(socs => [...socs, society]);
        this.newSociety.set({
          raisonSociale: '',
          sigle: '',
          formeJuridique: '',
          objetSocial: '',
          numeroRccm: '',
          numeroIfu: '',
          capitalSocial: 0,
          siegeSocial: '',
          pays: '',
          ville: '',
          adresse: '',
          telephone: '',
          email: '',
          siteWeb: '',
          dirigeantPrincipal: '',
          exerciceComptableDebut: '',
          exerciceComptableFin: ''
        });
        this.showSuccess('Société créée avec succès');
      },
      error: (err) => this.handleError('Échec de la création de la société')
    }).add(() => this.loading.set(false));
  }

  // User Management
  registerUser(): void {
    this.loading.set(true);
    this.userService.registerUser(this.newUser()).subscribe({
      next: () => {
        this.showSuccess('Utilisateur enregistré avec succès. Veuillez vérifier votre email pour l\'activation.');
        this.newUser.set({
          firstname: '',
          lastname: '',
          email: '',
          password: ''
        });
        // Refresh user list
        this.userService.getUsers().subscribe({
          next: (users) => this.users.set(users),
          error: (err) => this.handleError('Erreur lors du rafraîchissement de la liste des utilisateurs')
        });
      },
      error: (err) => this.handleError('Erreur lors de l\'enregistrement de l\'utilisateur')
    }).add(() => this.loading.set(false));
  }

  changeUserPassword(): void {
    this.loading.set(true);
    this.userService.changePassword(this.changePassword()).subscribe({
      next: () => {
        this.showSuccess('Mot de passe modifié avec succès');
        this.changePassword.set({
          currentPassword: '',
          newPassword: '',
          confirmationPassword: ''
        });
      },
      error: (err) => this.handleError('Erreur lors du changement de mot de passe')
    }).add(() => this.loading.set(false));
  }

  toggleUserLock(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.userService.toggleAccountLock(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(user => user.id === updatedUser.id ? updatedUser : user)
        );
        this.showSuccess(`Compte utilisateur ${!currentStatus ? 'verrouillé' : 'déverrouillé'} avec succès`);
      },
      error: (err) => this.handleError('Erreur lors de la mise à jour du statut de verrouillage')
    }).add(() => this.loading.set(false));
  }

  toggleUserStatus(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.userService.toggleAccountStatus(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(user => user.id === updatedUser.id ? updatedUser : user)
        );
        this.showSuccess(`Compte utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      },
      error: (err) => this.handleError('Erreur lors de la mise à jour du statut de l\'utilisateur')
    }).add(() => this.loading.set(false));
  }

  // Pagination Methods
  loadSocietiesPage(page: number): void {
    this.loading.set(true);
    this.pagination.update(p => ({ ...p, currentPage: page }));

    this.societyService.getSocietiesPaginated(page, this.pagination().pageSize).subscribe({
      next: (result) => {
        this.societies.set(result.societies);
        this.pagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: (err) => this.handleError('Erreur lors du chargement des sociétés')
    }).add(() => this.loading.set(false));
  }

  getPaginationEndIndex(): number {
    return Math.min((this.pagination().currentPage + 1) * this.pagination().pageSize, this.pagination().totalItems);
  }

  changePageSize(size: number): void {
    this.loading.set(true);
    this.pagination.update(p => ({ ...p, pageSize: size, currentPage: 0 }));

    this.societyService.getSocietiesPaginated(0, size).subscribe({
      next: (result) => {
        this.societies.set(result.societies);
        this.pagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: (err) => this.handleError('Erreur lors du chargement des sociétés')
    }).add(() => this.loading.set(false));
  }

  // Attribution Pagination Methods
  loadAttributionsPage(page: number): void {
    this.loading.set(true);
    this.attributionPagination.update(p => ({ ...p, currentPage: page }));

    this.attributionService.getAttributionsPaginated(page, this.attributionPagination().pageSize).subscribe({
      next: (result) => {
        this.attributions.set(result.attributions);
        this.attributionPagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: (err) => this.handleError('Erreur lors du chargement des attributions')
    }).add(() => this.loading.set(false));
  }

  getAttributionPaginationEndIndex(): number {
    return Math.min((this.attributionPagination().currentPage + 1) * this.attributionPagination().pageSize, this.attributionPagination().totalItems);
  }

  changeAttributionPageSize(size: number): void {
    this.loading.set(true);
    this.attributionPagination.update(p => ({ ...p, pageSize: size, currentPage: 0 }));

    this.attributionService.getAttributionsPaginated(0, size).subscribe({
      next: (result) => {
        this.attributions.set(result.attributions);
        this.attributionPagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: (err) => this.handleError('Erreur lors du chargement des attributions')
    }).add(() => this.loading.set(false));
  }

  // Users Pagination Methods
  loadUsersPage(page: number): void {
    this.loading.set(true);
    this.usersPagination.update(p => ({ ...p, currentPage: page }));

    this.userService.getUsersPaginated(page, this.usersPagination().pageSize).subscribe({
      next: (result) => {
        this.users.set(result.users);
        this.usersPagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: (err) => this.handleError('Erreur lors du chargement des utilisateurs')
    }).add(() => this.loading.set(false));
  }

  getUsersPaginationEndIndex(): number {
    return Math.min((this.usersPagination().currentPage + 1) * this.usersPagination().pageSize, this.usersPagination().totalItems);
  }

  changeUsersPageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (!target || !target.value) return;

    const size = Number(target.value);
    this.loading.set(true);
    this.usersPagination.update(p => ({ ...p, pageSize: size, currentPage: 0 }));

    this.userService.getUsersPaginated(0, size).subscribe({
      next: (result) => {
        this.users.set(result.users);
        this.usersPagination.update(p => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
        this.showSuccess(`Taille de page modifiée à ${size} utilisateurs par page`);
      },
      error: (err) => this.handleError('Erreur lors du chargement des utilisateurs')
    }).add(() => this.loading.set(false));
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const totalPages = this.usersPagination().totalPages;
    const currentPage = this.usersPagination().currentPage;

    if (totalPages <= 7) {
      // Show all pages if total pages is 7 or less
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(0);

      // Show pages around current page
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      if (start > 1) {
        pages.push(-1); // Placeholder for ellipsis
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) {
        pages.push(-1); // Placeholder for ellipsis
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages - 1);
      }
    }

    return pages.filter(page => page !== -1);
  }

  // UI Helpers
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  private handleError(message: string): void {
    this.loading.set(false);
    this.notificationService.error(message);
    console.error(message);
  }

  private showSuccess(message: string): void {
    this.notificationService.success(message);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  protected async checkParametresAccess(): Promise<void> {
    try {
      const userId = this.auth.getCurrentId();
      const roleId = this.auth.getCurrentIdRole();

      if (!userId || !roleId) {
        this.notificationService.warning('Informations utilisateur manquantes');
        return;
      }

      const hasAccess = await this.attributionService.checkRoleExist(Number(userId), Number(roleId)).toPromise();

      if (!hasAccess) {
        this.notificationService.warning('Vous n\'avez pas le droit sur cette fonctionnalité');
        return;
      }

      this.router.navigate(['/parametres']);
    } catch (error) {
      console.error('Erreur lors de la vérification des droits:', error);
      this.notificationService.error('Erreur lors de la vérification des droits');
    }
  }

  // Attribution Management Methods
  createAttribution(): void {
    if (!this.selectedUserId() || !this.selectedFunctionalityId()) {
      this.notificationService.warning('Veuillez sélectionner un utilisateur et une fonctionnalité');
      return;
    }

    this.loading.set(true);
    const userId = this.selectedUserId();
    const functionalityId = this.selectedFunctionalityId();

    // Ensure IDs are valid numbers
    if (userId === null || functionalityId === null) {
      this.notificationService.error('Les IDs utilisateur et fonctionnalité ne peuvent pas être nuls');
      this.loading.set(false);
      return;
    }

    const attribution: any = {
      userId: Number(userId),
      functionalityId: Number(functionalityId),
      lecture: this.selectedRights().includes('lecture'),
      writing: this.selectedRights().includes('writing'),
      modification: this.selectedRights().includes('modification'),
      deletion: this.selectedRights().includes('deletion'),
      impression: this.selectedRights().includes('impression'),
      validation: this.selectedRights().includes('validation')
    };

    // Vérifier que les IDs sont des nombres valides
    if (isNaN(attribution.userId) || isNaN(attribution.functionalityId)) {
      this.notificationService.error('Les IDs utilisateur et fonctionnalité doivent être des nombres valides');
      this.loading.set(false);
      return;
    }

    // Afficher les données envoyées dans la console pour débogage
    console.log('***************s pour l\'attribution:', attribution);

    this.attributionService.createAttribution(attribution).subscribe({
      next: (newAttribution) => {
        console.log('Attribution créée avec succès:', newAttribution);
        this.attributions.update(attrs => [...attrs, newAttribution]);
        this.showSuccess('Attribution créée avec succès');
        this.resetAttributionForm();
      },
      error: (err) => this.handleError('Erreur lors de la création de l\'attribution')
    }).add(() => this.loading.set(false));
  }

  updateAttribution(attributionId: number): void {
    this.loading.set(true);
    const attribution = {
      lecture: true,
      writing: true,
      modification: false,
      deletion: false,
      impression: true,
      validation: true
    };

    this.attributionService.updateAttribution(attributionId, attribution).subscribe({
      next: (updatedAttribution) => {
        this.attributions.update(attrs =>
          attrs.map(attr => attr.id === updatedAttribution.id ? updatedAttribution : attr)
        );
        this.showSuccess('Attribution mise à jour avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la mise à jour de l\'attribution')
    }).add(() => this.loading.set(false));
  }

  deleteAttribution(attributionId: number): void {
    this.loading.set(true);
    this.attributionService.deleteAttribution(attributionId).subscribe({
      next: () => {
        this.attributions.update(attrs => attrs.filter(attr => attr.id !== attributionId));
        this.showSuccess('Attribution supprimée avec succès');
      },
      error: (err) => this.handleError('Erreur lors de la suppression de l\'attribution')
    }).add(() => this.loading.set(false));
  }

  resetAttributionForm(): void {
    this.selectedUserId.set(null);
    this.selectedFunctionalityId.set(null);
    this.selectedRights.set([]);
  }

  toggleRight(right: string): void {
    const currentRights = this.selectedRights();
    if (currentRights.includes(right)) {
      this.selectedRights.set(currentRights.filter(r => r !== right));
    } else {
      this.selectedRights.set([...currentRights, right]);
    }
  }

  isRightSelected(right: string): boolean {
    return this.selectedRights().includes(right);
  }

  getUserName(userId: number): string {
    const user = this.users().find(u => u.id === userId);
    return user ? `${user.firstname} ${user.lastname}` : 'Utilisateur inconnu';
  }

  getRoleName(roleId: number): string {
    const role = this.roles().find(r => r.id === roleId);
    return role ? role.nom : 'Rôle inconnu';
  }

  getSocietyName(societyId: number): string {
    const society = this.societies().find(s => s.id === societyId);
    return society ? society.raisonSociale : 'Société inconnue';
  }

  getEtablissementName(etablissementId: number): string {
    const etab = this.etablissements().find(e => e.id === etablissementId);
    return etab ? etab.nom : 'Établissement inconnu';
  }

  getFunctionalityName(functionalityId: number): string {
    const func = this.functionalities().find(f => f.id === functionalityId);
    return func ? func.nom : 'Fonctionnalité inconnue';
  }

  // Get connected user information
  getConnectedUserFullName(): string {
    return this.auth.getCurrentUserEmail() || 'Utilisateur inconnu';
  }

  getConnectedUserEmail(): string {
    return this.auth.getCurrentUserEmail() || 'Email inconnu';
  }

  // Role-User Management Methods
  addRoleToUser(): void {
    if (!this.selectedUserForRole() || !this.selectedRoleForUser()) {
      this.notificationService.warning('Veuillez sélectionner un utilisateur et un rôle');
      return;
    }

    this.loading.set(true);
    const userId = this.selectedUserForRole()!;
    const roleName = this.selectedRoleForUser();

    this.userService.addRoleToUser(userId, roleName).subscribe({
      next: () => {
        this.showSuccess(`Rôle ${roleName} attribué à l'utilisateur avec succès`);
        // Refresh user list to show updated roles
        this.userService.getUsers().subscribe({
          next: (users) => this.users.set(users),
          error: (err) => this.handleError('Erreur lors du rafraîchissement de la liste des utilisateurs')
        });
        // Reset form
        this.selectedUserForRole.set(null);
        this.selectedRoleForUser.set('');
      },
      error: (err) => this.handleError('Erreur lors de l\'attribution du rôle à l\'utilisateur')
    }).add(() => this.loading.set(false));
  }

  // Check if user already has a specific role
  userHasRole(userId: number, roleName: string): boolean {
    const user = this.users().find(u => u.id === userId);
    return user ? user.roles?.includes(roleName) || false : false;
  }

  // Remove role from user
  async removeRoleFromUser(userId: number, roleName: string): Promise<void> {
    const confirmed = await this.notificationService.confirm(
      `Êtes-vous sûr de vouloir retirer le rôle "${roleName}" de cet utilisateur ?`,
      'Confirmation de suppression'
    );

    if (!confirmed) {
      this.notificationService.info('Suppression annulée');
      return;
    }

    this.loading.set(true);
    this.userService.removeRoleFromUser(userId, roleName).subscribe({
      next: () => {
        this.showSuccess(`Rôle ${roleName} retiré de l'utilisateur avec succès`);
        // Refresh user list to show updated roles
        this.userService.getUsers().subscribe({
          next: (users) => this.users.set(users),
          error: (err) => this.handleError('Erreur lors du rafraîchissement de la liste des utilisateurs')
        });
      },
      error: (err) => this.handleError('Erreur lors du retrait du rôle de l\'utilisateur')
    }).add(() => this.loading.set(false));
  }
}
