import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthenticationService } from '../../core/services/authentication.service';
import { NotificationService } from '../../core/services/notification.service';
import { Society, SocietyService } from '../../core/services/society.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-societes',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './societes.component.html',
  styleUrl: '../parametres/parametres.component.scss'
})
export class SocietesComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly societies = signal<Society[]>([]);
  protected readonly pagination = signal<{
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

  protected readonly newSociety = signal<Omit<Society, 'id'>>({
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

  constructor(
    private readonly authService: AuthenticationService,
    private readonly societyService: SocietyService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadSocietiesPage(0);
  }

  protected createSociety(): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.societyService.createSociety(this.newSociety()).subscribe({
      next: (society) => {
        this.societies.update((socs) => [society, ...socs].slice(0, this.pagination().pageSize));
        this.pagination.update((p) => ({
          ...p,
          totalItems: p.totalItems + 1,
          totalPages: Math.max(1, Math.ceil((p.totalItems + 1) / p.pageSize))
        }));
        this.resetSocietyForm();
        this.showSuccess('Société créée avec succès');
      },
      error: () => this.handleError('Échec de la création de la société')
    }).add(() => this.loading.set(false));
  }

  protected loadSocietiesPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.pagination.update((p) => ({ ...p, currentPage: page }));

    this.societyService.getSocietiesPaginated(page, this.pagination().pageSize).subscribe({
      next: (result) => {
        this.societies.set(result.societies);
        this.pagination.update((p) => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
      },
      error: () => this.handleError('Erreur lors du chargement des sociétés')
    }).add(() => this.loading.set(false));
  }

  protected getPaginationEndIndex(): number {
    return Math.min(
      (this.pagination().currentPage + 1) * this.pagination().pageSize,
      this.pagination().totalItems
    );
  }

  protected changePageSize(size: number): void {
    const nextSize = Number(size);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.pagination.update((p) => ({ ...p, pageSize: nextSize, currentPage: 0 }));

    this.societyService.getSocietiesPaginated(0, nextSize).subscribe({
      next: (result) => {
        this.societies.set(result.societies);
        this.pagination.update((p) => ({
          ...p,
          currentPage: result.currentPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }));
        this.showSuccess(`Taille de page modifiée à ${nextSize} sociétés par page`);
      },
      error: () => this.handleError('Erreur lors du chargement des sociétés')
    }).add(() => this.loading.set(false));
  }

  private resetSocietyForm(): void {
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

