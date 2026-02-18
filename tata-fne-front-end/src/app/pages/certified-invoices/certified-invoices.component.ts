import { CommonModule } from '@angular/common';
import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { CertifiedInvoice } from '../../core/models/certified-invoice';
import { VerificationRefundResponse } from '../../core/models/verification-refund-response';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

type PeriodFilter = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type AmountFilter = 'ttc' | 'ht';
type TokenFilter = 'all' | 'with' | 'without';
type SalesRefundFilter = 'all' | 'withRefund' | 'withoutRefund';
type InvoiceTableItem = CertifiedInvoice | VerificationRefundResponse;

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
  protected readonly periodFilter = signal<PeriodFilter>('all');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly amountTypeFilter = signal<AmountFilter>('ttc');
  protected readonly amountMinFilter = signal('');
  protected readonly amountMaxFilter = signal('');
  protected readonly tokenFilter = signal<TokenFilter>('all');
  protected readonly salesRefundFilter = signal<SalesRefundFilter>('all');

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
    const source = this.currentTab() === 'sales' ? this.invoices() : this.refunds();
    const set = new Set(source.map((i) => this.getCreator(i)).filter(Boolean));
    return ['all', ...Array.from(set)];
  });

  protected readonly refundedInvoiceIds = computed(() => {
    return new Set(this.refunds().map((refund) => refund.invoiceId).filter(Boolean));
  });

  protected readonly salesById = computed(() => {
    return new Map(this.invoices().map((invoice) => [invoice.id, invoice]));
  });

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const creator = this.creatorFilter();
    const tab = this.currentTab();
    const from = this.parseStartDate(this.dateFrom());
    const to = this.parseEndDate(this.dateTo());
    const minAmount = this.parseNumber(this.amountMinFilter());
    const maxAmount = this.parseNumber(this.amountMaxFilter());
    const amountType = this.amountTypeFilter();
    const tokenFilter = this.tokenFilter();
    const refundedInvoiceIds = this.refundedInvoiceIds();
    const salesRefundFilter = this.salesRefundFilter();

    if (tab === 'sales') {
      return this.invoices().filter((invoice) => {
        // Filter by tab
        const matchesTab = (invoice.invoiceType || '').toLowerCase() === 'sale';

        // Filter by search query
        const matchesQuery =
          !q ||
          invoice.numeroFactureInterne?.toLowerCase().includes(q) ||
          invoice.reference?.toLowerCase().includes(q) ||
          invoice.token?.toLowerCase().includes(q) ||
          invoice.utilisateurCreateur?.toLowerCase().includes(q);

        // Filter by creator
        const matchesCreator = creator === 'all' || this.getCreator(invoice) === creator;

        // Filter by token availability
        const matchesToken = this.matchesTokenFilter(invoice.token, tokenFilter);

        // Filter by amount
        const amount = this.getAmountValue(invoice, amountType);
        const matchesAmount = this.matchesAmountRange(amount, minAmount, maxAmount);

        // Filter by date range
        const matchesDate = this.matchesDateRange(this.getRegistrationDate(invoice), from, to);

        // Filter by refund existence on sales
        const hasRefund = refundedInvoiceIds.has(invoice.id);
        const matchesRefundFilter =
          salesRefundFilter === 'all'
            ? true
            : salesRefundFilter === 'withRefund'
              ? hasRefund
              : !hasRefund;

        return matchesTab && matchesQuery && matchesCreator && matchesToken && matchesAmount && matchesDate && matchesRefundFilter;
      });
    } else {
      return this.refunds().filter((refund) => {
        // Filter by search query
        const matchesQuery =
          !q ||
          refund.numeroFactureInterne?.toLowerCase().includes(q) ||
          refund.reference?.toLowerCase().includes(q) ||
          refund.token?.toLowerCase().includes(q) ||
          this.getCreator(refund)?.toLowerCase().includes(q) ||
          refund.invoiceId?.toLowerCase().includes(q) ||
          this.getInternalNumber(refund).toLowerCase().includes(q);

        // Filter by creator
        const matchesCreator = creator === 'all' || this.getCreator(refund) === creator;

        // Filter by token availability
        const matchesToken = this.matchesTokenFilter(refund.token, tokenFilter);

        // Filter by amount
        const amount = this.getAmountValue(refund, amountType);
        const matchesAmount = this.matchesAmountRange(amount, minAmount, maxAmount);

        // Filter by date range
        const matchesDate = this.matchesDateRange(this.getRegistrationDate(refund), from, to);

        return matchesQuery && matchesCreator && matchesToken && matchesAmount && matchesDate;
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
      ttc: list.reduce((sum, inv) => sum + this.getAmountValue(inv, 'ttc'), 0),
      ht: list.reduce((sum, inv) => sum + this.getAmountValue(inv, 'ht'), 0),
      taxes: list.reduce((sum, inv) => sum + this.getAmountValue(inv, 'taxes'), 0)
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

    effect(() => {
      const total = this.totalPages();
      if (this.currentPage() >= total) {
        this.currentPage.set(Math.max(total - 1, 0));
      }
    });
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

  protected setCurrentTab(tab: 'sales' | 'refunds'): void {
    if (this.currentTab() === tab) return;
    this.currentTab.set(tab);
    this.creatorFilter.set('all');
    this.currentPage.set(0);
  }

  protected onPeriodChange(value: PeriodFilter): void {
    this.periodFilter.set(value);

    if (value === 'all') {
      this.dateFrom.set('');
      this.dateTo.set('');
      this.currentPage.set(0);
      return;
    }

    if (value === 'custom') {
      this.currentPage.set(0);
      return;
    }

    const range = this.getRangeForPreset(value);
    this.dateFrom.set(range.from);
    this.dateTo.set(range.to);
    this.currentPage.set(0);
  }

  protected onDateRangeChange(): void {
    this.periodFilter.set(this.dateFrom() || this.dateTo() ? 'custom' : 'all');
    this.currentPage.set(0);
  }

  protected resetFilters(): void {
    this.search.set('');
    this.creatorFilter.set('all');
    this.periodFilter.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.amountTypeFilter.set('ttc');
    this.amountMinFilter.set('');
    this.amountMaxFilter.set('');
    this.tokenFilter.set('all');
    this.salesRefundFilter.set('all');
    this.currentPage.set(0);
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
    if (all.length === 0) return 'Aucun resultat';
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min((this.currentPage() + 1) * this.pageSize(), all.length);
    const entity = this.currentTab() === 'sales' ? 'factures' : 'avoirs';
    return `Affichage de ${start} a ${end} sur ${all.length} ${entity}`;
  }

  protected trackById(_: number, invoice: InvoiceTableItem): string {
    return `${invoice.id}`;
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

  protected createCreditNote(invoice: InvoiceTableItem): void {
    if (this.isRefund(invoice)) {
      return;
    }
    // Navigate to the credit note page with the invoice ID
    this.router.navigate(['/factures-certifiees', invoice.id, 'avoir']);
  }

  protected shouldShowCreateCreditNoteButton(invoice: InvoiceTableItem): boolean {
    if (this.isRefund(invoice)) {
      return false;
    }
    // Check if there are any refunds for this invoice
    return !this.refundedInvoiceIds().has(invoice.id);
  }

  protected getRegistrationDate(invoice: InvoiceTableItem): string {
    if (this.isRefund(invoice)) {
      return invoice.createdAt || invoice.date || '';
    }
    return invoice.date || '';
  }

  protected getCreator(invoice: InvoiceTableItem): string {
    if (this.isRefund(invoice)) {
      const fromRefund = invoice.utilisateurCreateur || '';
      if (fromRefund.trim()) {
        return fromRefund;
      }
      const linkedSale = this.getLinkedSaleInvoice(invoice);
      return linkedSale?.utilisateurCreateur || '';
    }
    return invoice.utilisateurCreateur || '';
  }

  protected getInternalNumber(invoice: InvoiceTableItem): string {
    if (this.isRefund(invoice)) {
      const fromRefund = invoice.numeroFactureInterne || '';
      if (fromRefund.trim()) {
        return fromRefund;
      }
      const linkedSale = this.getLinkedSaleInvoice(invoice);
      return linkedSale?.numeroFactureInterne || invoice.invoiceId || '-';
    }
    return invoice.numeroFactureInterne || '-';
  }

  protected getAmountValue(invoice: InvoiceTableItem, type: 'ttc' | 'ht' | 'taxes'): number {
    if (this.isRefund(invoice)) {
      const linkedSale = this.getLinkedSaleInvoice(invoice);
      if (linkedSale) {
        return this.extractAmount(linkedSale, type);
      }
    }
    return this.extractAmount(invoice, type);
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

  private getRangeForPreset(value: Exclude<PeriodFilter, 'all' | 'custom'>): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = new Date(today);
    let to = new Date(today);

    if (value === 'last7') {
      from.setDate(today.getDate() - 6);
    } else if (value === 'last30') {
      from.setDate(today.getDate() - 29);
    } else if (value === 'thisMonth') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (value === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (value === 'thisYear') {
      from = new Date(today.getFullYear(), 0, 1);
    }

    return {
      from: this.toDateInputValue(from),
      to: this.toDateInputValue(to)
    };
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseStartDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseEndDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseInvoiceDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const raw = value.trim();
    if (!raw) {
      return null;
    }

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    const normalized = new Date(raw.replace(' ', 'T'));
    return Number.isNaN(normalized.getTime()) ? null : normalized;
  }

  private parseNumber(value: string): number | null {
    if (!value || !value.trim()) {
      return null;
    }

    let normalized = value.trim().replace(/\s/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private matchesAmountRange(amount: number, min: number | null, max: number | null): boolean {
    if (min !== null && amount < min) {
      return false;
    }
    if (max !== null && amount > max) {
      return false;
    }
    return true;
  }

  private matchesTokenFilter(token: string | undefined | null, filter: TokenFilter): boolean {
    const hasToken = Boolean(token && token.trim());
    if (filter === 'with') {
      return hasToken;
    }
    if (filter === 'without') {
      return !hasToken;
    }
    return true;
  }

  private matchesDateRange(value: string, start: Date | null, end: Date | null): boolean {
    if (!start && !end) {
      return true;
    }

    const invoiceDate = this.parseInvoiceDate(value);
    if (!invoiceDate) {
      return false;
    }

    if (start && invoiceDate < start) {
      return false;
    }

    if (end && invoiceDate > end) {
      return false;
    }

    return true;
  }

  private getLinkedSaleInvoice(refund: VerificationRefundResponse): CertifiedInvoice | undefined {
    return this.salesById().get(refund.invoiceId);
  }

  private extractAmount(invoice: InvoiceTableItem, type: 'ttc' | 'ht' | 'taxes'): number {
    if (type === 'ttc') {
      return invoice.totalTTC || 0;
    }
    if (type === 'ht') {
      return invoice.totalHorsTaxes || 0;
    }
    return invoice.totalTaxes || 0;
  }

  private isRefund(invoice: InvoiceTableItem): invoice is VerificationRefundResponse {
    return 'invoiceId' in invoice;
  }
}

