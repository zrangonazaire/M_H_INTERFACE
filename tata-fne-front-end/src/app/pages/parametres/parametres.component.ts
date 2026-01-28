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
import { UserService, RegistrationRequest, ChangePasswordRequest } from '../../core/services/user.service';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.scss'
})
export class ParametresComponent implements OnInit {
  protected readonly userFullName = signal('Compte');

  // API Data
  roles = signal<any[]>([]);
  functionalities = signal<any[]>([]);
  roleFunctionalities = signal<any[]>([]);
  departments = signal<DepartmentResponse[]>([]);
  etablissements = signal<any[]>([]);
  societies = signal<any[]>([]);
  attributions = signal<any[]>([]);
  users = signal<any[]>([]);

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
    password: ''
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
    private readonly userService: UserService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load all data in parallel
      this.roleService.getRoles().subscribe({
        next: (roles) => this.roles.set(roles),
        error: (err) => this.handleError('Failed to load roles')
      });

      this.functionalityService.getFunctionalities().subscribe({
        next: (functionalities) => this.functionalities.set(functionalities),
        error: (err) => this.handleError('Failed to load functionalities')
      });

      this.roleFunctionalityService.getRoleFunctionalities().subscribe({
        next: (roleFunctionalities) => this.roleFunctionalities.set(roleFunctionalities),
        error: (err) => this.handleError('Failed to load role functionalities')
      });

      this.departmentService.getDepartments().subscribe({
        next: (departments) => this.departments.set(departments),
        error: (err) => this.handleError('Failed to load departments')
      });

      this.etablissementService.getEtablissements().subscribe({
        next: (etablissements) => this.etablissements.set(etablissements),
        error: (err) => this.handleError('Failed to load establishments')
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
        error: (err) => this.handleError('Failed to load societies')
      });

      this.attributionService.getAttributions().subscribe({
        next: (attributions) => this.attributions.set(attributions),
        error: (err) => this.handleError('Failed to load attributions')
      });

      // Load users
      this.userService.getUsers().subscribe({
        next: (users) => this.users.set(users),
        error: (err) => this.handleError('Failed to load users')
      });

    } catch (err) {
      this.handleError('Failed to load data');
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
        this.showSuccess('Role created successfully');
      },
      error: (err) => this.handleError('Failed to create role')
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
        this.showSuccess('Department created successfully');
      },
      error: (err) => this.handleError('Failed to create department')
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
      error: (err) => this.handleError('Failed to load users for department')
    }).add(() => this.loading.set(false));
  }

  addUsersToDepartment(): void {
    if (!this.selectedDepartmentForUsers()) return;

    this.loading.set(true);
    this.departmentService.addUsersToDepartment(this.selectedDepartmentForUsers()!, this.selectedUsersToAdd()).subscribe({
      next: () => {
        this.showSuccess('Users added to department successfully');
        this.loadUsersForDepartment(this.selectedDepartmentForUsers()!);
        this.selectedUsersToAdd.set([]);
      },
      error: (err) => this.handleError('Failed to add users to department')
    }).add(() => this.loading.set(false));
  }

  removeUserFromDepartment(departmentId: number, userId: number): void {
    this.loading.set(true);
    this.departmentService.removeUserFromDepartment(departmentId, userId).subscribe({
      next: () => {
        this.showSuccess('User removed from department successfully');
        this.loadUsersForDepartment(departmentId);
      },
      error: (err) => this.handleError('Failed to remove user from department')
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
        this.showSuccess('Functionality created successfully');
      },
      error: (err) => this.handleError('Failed to create functionality')
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
        this.showSuccess('Establishment created successfully');
      },
      error: (err) => this.handleError('Failed to create establishment')
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
        this.showSuccess('User registered successfully. Please check email for activation.');
        this.newUser.set({
          firstname: '',
          lastname: '',
          email: '',
          password: ''
        });
        // Refresh user list
        this.userService.getUsers().subscribe({
          next: (users) => this.users.set(users),
          error: (err) => this.handleError('Failed to refresh user list')
        });
      },
      error: (err) => this.handleError('Failed to register user')
    }).add(() => this.loading.set(false));
  }

  changeUserPassword(): void {
    this.loading.set(true);
    this.userService.changePassword(this.changePassword()).subscribe({
      next: () => {
        this.showSuccess('Password changed successfully');
        this.changePassword.set({
          currentPassword: '',
          newPassword: '',
          confirmationPassword: ''
        });
      },
      error: (err) => this.handleError('Failed to change password')
    }).add(() => this.loading.set(false));
  }

  toggleUserLock(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.userService.toggleAccountLock(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(user => user.id === updatedUser.id ? updatedUser : user)
        );
        this.showSuccess(`User account ${!currentStatus ? 'locked' : 'unlocked'} successfully`);
      },
      error: (err) => this.handleError('Failed to update user lock status')
    }).add(() => this.loading.set(false));
  }

  toggleUserStatus(userId: number, currentStatus: boolean): void {
    this.loading.set(true);
    this.userService.toggleAccountStatus(userId, !currentStatus).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(user => user.id === updatedUser.id ? updatedUser : user)
        );
        this.showSuccess(`User account ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      },
      error: (err) => this.handleError('Failed to update user status')
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
      error: (err) => this.handleError('Failed to load societies')
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
      error: (err) => this.handleError('Failed to load societies')
    }).add(() => this.loading.set(false));
  }

  // UI Helpers
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  private handleError(message: string): void {
    this.error.set(message);
    this.loading.set(false);
    console.error(message);
  }

  private showSuccess(message: string): void {
    this.success.set(message);
    setTimeout(() => this.success.set(null), 3000);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}