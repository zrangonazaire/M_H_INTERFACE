import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';
import { UserService } from '../../core/services/user.service';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { CfaPipe } from '../../shared/pipes/cfa-pipe';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule,CfaPipe,MenuGauche],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

  protected readonly userFullName = signal('Compte');
  protected readonly certifiedInvoiceCount = signal(0);
  protected readonly totalHT = signal(0);
  protected readonly totalTTC = signal(0);
  protected readonly refundInvoiceCount = signal(0);
  protected readonly refundTotalHT = signal(0);
  protected readonly refundTotalTTC = signal(0);

  constructor(
    private readonly auth: AuthenticationService,
    private readonly router: Router,
    private readonly attributionService: AttributionService,
    private readonly userService: UserService,
    private readonly fneInvoiceService: FneInvoiceService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
    debugger;
    this.auth.getCurrentEtabFNE();
  }

  ngOnInit(): void {
    this.loadCertifiedInvoiceData();
    this.loadRefundInvoiceData();
  }

  private loadCertifiedInvoiceData(): void {
    this.fneInvoiceService.getCertifiedInvoices().subscribe({
      next: (invoices) => {
        this.certifiedInvoiceCount.set(invoices.length);
        
        // Calculer les totaux HT et TTC
        const totalHTValue = invoices.reduce((sum, invoice) => sum + (invoice.totalHorsTaxes || 0), 0);
        const totalTTCValue = invoices.reduce((sum, invoice) => sum + (invoice.totalTTC || 0), 0);
        
        this.totalHT.set(totalHTValue);
        this.totalTTC.set(totalTTCValue);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données de factures certifiées:', error);
      }
    });
  }

  private loadRefundInvoiceData(): void {
    this.fneInvoiceService.getRefunds().subscribe({
      next: (refunds) => {
        this.refundInvoiceCount.set(refunds.length);
        
        // Calculer les totaux HT et TTC pour les factures d'avoir
        const refundTotalHTValue = refunds.reduce((sum, refund) => sum + (refund.totalHorsTaxes || 0), 0);
        const refundTotalTTCValue = refunds.reduce((sum, refund) => sum + (refund.totalTTC || 0), 0);
        
        this.refundTotalHT.set(refundTotalHTValue);
        this.refundTotalTTC.set(refundTotalTTCValue);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données de factures d\'avoir:', error);
      }
    });
  }

 

 
}
