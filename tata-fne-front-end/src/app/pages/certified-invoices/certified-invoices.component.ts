import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { CertifiedInvoice } from '../../core/models/certified-invoice';
import { VerificationRefundResponse } from '../../core/models/verification-refund-response';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-certified-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,MenuGauche],
  templateUrl: './certified-invoices.component.html',
  styleUrl: './certified-invoices.component.scss'
})
export class CertifiedInvoicesComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab= signal('Compte');

  protected readonly search = signal('');
  protected readonly creatorFilter = signal('all');

  protected readonly invoices = signal<CertifiedInvoice[]>([]);
  protected readonly refunds = signal<VerificationRefundResponse[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly currentTab = signal<'sales' | 'refunds'>('sales');

  // ========== PAGINATION ==========
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly pageSizeOptions = [5, 10, 20, 50, 100];

  protected readonly creators = computed(() => {
    const set = new Set(this.invoices().map((i) => i.utilisateurCreateur).filter(Boolean));
    return ['all', ...Array.from(set)];
  });

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const creator = this.creatorFilter();
    const tab = this.currentTab();
    
    if (tab === 'sales') {
      return this.invoices().filter((invoice) => {
        // Filter by tab
        const matchesTab = (invoice.invoiceType || '').toLowerCase() === 'sale';
        
        // Filter by search query
        const matchesQuery =
          !q ||
          invoice.numeroFactureInterne?.toLowerCase().includes(q) ||
          invoice.reference?.toLowerCase().includes(q) ||
          invoice.token?.toLowerCase().includes(q);
        
        // Filter by creator
        const matchesCreator = creator === 'all' || invoice.utilisateurCreateur === creator;
        
        return matchesTab && matchesQuery && matchesCreator;
      });
    } else {
      return this.refunds().filter((refund) => {
        // Filter by search query
        const matchesQuery =
          !q ||
          refund.numeroFactureInterne?.toLowerCase().includes(q) ||
          refund.reference?.toLowerCase().includes(q) ||
          refund.token?.toLowerCase().includes(q);
        
        // Filter by creator
        const matchesCreator = creator === 'all' || refund.utilisateurCreateur === creator;
        
        return matchesQuery && matchesCreator;
      });
    }
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filtered().length / this.pageSize()) || 1;
  });

  readonly paginatedItems = computed(() => {
    const all = this.filtered();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return all.slice(start, end);
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
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    
    // Charger les factures de vente
    this.invoiceService.getCertifiedInvoices().subscribe({
      next: (data) => {
        console.log('Données reçues du backend:', data);
        this.invoices.set(data);
        
        // Charger les factures d'avoir
        this.invoiceService.getRefunds().subscribe({
          next: (refundData) => {
            console.log('Avoirs reçus du backend:', refundData);
            this.refunds.set(refundData);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Erreur lors du chargement des avoirs:', err);
            // Continuer même si les avoirs ne chargent pas
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger les factures certifiées.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  // Pagination methods
  setPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  previousPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  firstPage(): void {
    this.setPage(0);
  }

  lastPage(): void {
    this.setPage(this.totalPages() - 1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  getVisiblePages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      if (start > 1) pages.push(-1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < total - 2) pages.push(-1);
      if (total > 1) pages.push(total - 1);
    }
    return pages.filter(p => p !== -1);
  }

  getPaginationInfo(): string {
    const all = this.filtered();
    if (all.length === 0) return 'Aucune facture';
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min((this.currentPage() + 1) * this.pageSize(), all.length);
    return `Affichage de ${start} à ${end} sur ${all.length} factures`;
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

  protected shouldShowCreateCreditNoteButton(invoice: CertifiedInvoice): boolean {
    // Check if there are any refunds for this invoice
    return this.refunds().filter(refund => refund.invoiceId === invoice.id).length === 0;
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

  protected hasFacturierRole(): boolean {
    const authorities = this.authService.getCurrentAuthorities();
    return authorities.includes('FACTURIER');
  }
}
