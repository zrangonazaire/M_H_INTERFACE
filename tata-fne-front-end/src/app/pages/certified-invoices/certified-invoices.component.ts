import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { CertifiedInvoice } from '../../core/models/certified-invoice';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';

@Component({
  selector: 'app-certified-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './certified-invoices.component.html',
  styleUrl: './certified-invoices.component.scss'
})
export class CertifiedInvoicesComponent implements OnInit {
  protected readonly userFullName = signal('Compte');

  protected readonly search = signal('');
  protected readonly creatorFilter = signal('all');

  protected readonly invoices = signal<CertifiedInvoice[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly creators = computed(() => {
    const set = new Set(this.invoices().map((i) => i.utilisateurCreateur).filter(Boolean));
    return ['all', ...Array.from(set)];
  });

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const creator = this.creatorFilter();
    return this.invoices().filter((invoice) => {
      const matchesQuery =
        !q ||
        invoice.numeroFactureInterne?.toLowerCase().includes(q) ||
        invoice.reference?.toLowerCase().includes(q) ||
        invoice.token?.toLowerCase().includes(q);
      const matchesCreator = creator === 'all' || invoice.utilisateurCreateur === creator;
      return matchesQuery && matchesCreator;
    });
  });

  protected readonly totals = computed(() => {
    const list = this.filtered();
    return {
      count: list.length,
      ttc: list.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0),
      ht: list.reduce((sum, inv) => sum + (inv.totalHorsTaxes || 0), 0),
      taxes: list.reduce((sum, inv) => sum + (inv.totalTaxes || 0), 0)
    };
  });

  constructor(
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly router: Router,
    private readonly attributionService: AttributionService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.invoiceService.getCertifiedInvoices().subscribe({
      next: (data) => {
        console.log('Données reçues du backend:', data);
        this.invoices.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger les factures certifiées.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  protected trackById(_: number, invoice: CertifiedInvoice): string {
    return invoice.id;
  }

  protected formatDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
      value || 0
    );
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  protected createCreditNote(invoice: CertifiedInvoice): void {
    // Navigate to the credit note page with the invoice ID
    this.router.navigate(['/factures-certifiees', invoice.id, 'avoir']);
  }

  protected getByNumero(numeroFacture: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.invoiceService.getByNumero(numeroFacture).subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger les factures pour ce numéro.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  protected async checkParametresAccess(): Promise<void> {
    try {
      const userId = this.authService.getCurrentId();
      const roleId = this.authService.getCurrentIdRole();
      
      if (!userId || !roleId) {
        alert('Informations utilisateur manquantes');
        return;
      }

      const hasAccess = await this.attributionService.checkRoleExist(Number(userId), Number(roleId)).toPromise();
      
      if (!hasAccess) {
        alert('Vous n\'avez pas le droit sur cette fonctionnalité');
        return;
      }

      this.router.navigate(['/parametres']);
    } catch (error) {
      console.error('Erreur lors de la vérification des droits:', error);
      alert('Erreur lors de la vérification des droits');
    }
  }
}
