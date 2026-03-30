import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

import { AuthenticationService } from '../../core/services/authentication.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-historique-excel',
  standalone: true,
  imports: [CommonModule, MenuGauche],
  templateUrl: './historique-excel.component.html',
  styleUrl: './historique-excel.component.scss'
})
export class HistoriqueExcelComponent {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  constructor(private readonly authService: AuthenticationService) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }
}

