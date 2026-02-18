import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthenticationService } from '../../core/services/authentication.service';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { CertifiedInvoice } from '../../core/models/certified-invoice';
import { CfaPipe } from '../../shared/pipes/cfa-pipe';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CfaPipe, MenuGauche],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly stickerUnitPrice = 20;

  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');
  protected readonly certifiedInvoiceCount = signal(0);
  protected readonly totalHT = signal(0);
  protected readonly totalTTC = signal(0);
  protected readonly refundInvoiceCount = signal(0);
  protected readonly refundTotalHT = signal(0);
  protected readonly refundTotalTTC = signal(0);
  protected readonly stickersAmount = signal(0);
  protected readonly stickersQuantity = computed(() => Math.floor(this.stickersAmount() / this.stickerUnitPrice));

  constructor(
    private readonly auth: AuthenticationService,
    private readonly fneInvoiceService: FneInvoiceService
  ) {
    this.userFullName.set(this.auth.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.auth.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.auth.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadCertifiedInvoiceData();
  }

  private loadCertifiedInvoiceData(): void {
    this.fneInvoiceService.getCertifiedInvoices().subscribe({
      next: (invoices) => {
        this.certifiedInvoiceCount.set(invoices.length);

        const totalHTValue = invoices.reduce((sum, invoice) => sum + (invoice.totalHorsTaxes || 0), 0);
        const totalTTCValue = invoices.reduce((sum, invoice) => sum + (invoice.totalTTC || 0), 0);

        this.totalHT.set(totalHTValue);
        this.totalTTC.set(totalTTCValue);
        this.loadRefundInvoiceData(invoices);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des donnees de factures certifiees:', error);
        this.loadRefundInvoiceData([]);
      }
    });
  }

  private loadRefundInvoiceData(salesInvoices: CertifiedInvoice[]): void {
    const salesById = new Map(salesInvoices.map((invoice) => [invoice.id, invoice]));

    this.fneInvoiceService.getRefunds().subscribe({
      next: (refunds) => {
        this.refundInvoiceCount.set(refunds.length);

        const refundTotalHTValue = refunds.reduce((sum, refund) => {
          const linkedSale = salesById.get(refund.invoiceId);
          return sum + (linkedSale?.totalHorsTaxes ?? refund.totalHorsTaxes ?? 0);
        }, 0);

        const refundTotalTTCValue = refunds.reduce((sum, refund) => {
          const linkedSale = salesById.get(refund.invoiceId);
          return sum + (linkedSale?.totalTTC ?? refund.totalTTC ?? 0);
        }, 0);

        this.refundTotalHT.set(refundTotalHTValue);
        this.refundTotalTTC.set(refundTotalTTCValue);

        const latestBalanceFunds = this.getFirstDefinedValue(salesInvoices.map((invoice) => invoice.balanceFunds));
        const latestBalanceSticker = this.getFirstDefinedValue(refunds.map((refund) => refund.balanceSticker));
        this.stickersAmount.set(this.getSmallestAvailable(latestBalanceFunds, latestBalanceSticker));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des donnees de factures d\'avoir:', error);
        const latestBalanceFunds = this.getFirstDefinedValue(salesInvoices.map((invoice) => invoice.balanceFunds));
        this.stickersAmount.set(this.getSmallestAvailable(latestBalanceFunds, null));
      }
    });
  }

  private getFirstDefinedValue(values: Array<number | null | undefined>): number | null {
    for (const value of values) {
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return null;
  }

  private getSmallestAvailable(first: number | null, second: number | null): number {
    if (first !== null && second !== null) {
      return Math.min(first, second);
    }
    if (first !== null) {
      return first;
    }
    if (second !== null) {
      return second;
    }
    return 0;
  }
}
