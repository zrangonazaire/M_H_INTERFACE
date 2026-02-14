import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { FneExcelService } from '../../core/services/fne-excel.service';
import { ExcelReadResult } from '../../core/models/excel-read-result';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { InvoiceSignRequest } from '../../core/models/invoice-sign-request';
import { AttributionService } from '../../core/services/attribution.service';
import { NonCertifiedInvoice } from '../../core/models/non-certified-invoice';
import { NotificationService } from '../../core/services/notification.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

type InvoiceStatus = 'a_certifier' | 'en_attente' | 'rejete' | 'certifie' | 'inconnu';

@Component({
  selector: 'app-factures-non-certifiees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MenuGauche],
  templateUrl: './factures-non-certifiees.component.html',
  styleUrl: './factures-non-certifiees.component.scss'
})
export class FacturesNonCertifieesComponent {

  readonly query = signal('');
  readonly statusFilter = signal<'all' | InvoiceStatus>('all');

  readonly invoices = signal<any[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly expandedGroups = signal<Set<string>>(new Set());
  readonly loadState = signal<'idle' | 'loading' | 'error'>('idle');
  readonly loadError = signal<string | null>(null);

  readonly readState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly readResult = signal<ExcelReadResult | null>(null);
  readonly readError = signal<string | null>(null);

  readonly certifyState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  readonly certifyError = signal<string | null>(null);
  readonly certifyCount = signal<number>(0);
  readonly certifyingId = signal<number | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly userFullName = signal('Compte');
  readonly userPdv = signal('Compte');
  readonly userEtab = signal('Compte');
  readonly certificationSuccessMessage = signal<string | null>(null);
  readonly certificationDownloadUrl = signal<string | null>(null);
  readonly newInvoiceLabel = 'Facture Odoo';
  readonly odooFileUrl = 'doc/MODEL IMPORTATION ODOO.xlsx';
  ncc: any;

  constructor(
    private readonly excelService: FneExcelService,
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly router: Router,
    private readonly attributionService: AttributionService,
    private readonly notificationService: NotificationService
  ) {
    this.loadInvoices();
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  loadOdooFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xls,.xlsx';
    input.style.display = 'none';

    input.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement)?.files?.[0];
      if (file) {
        this.processOdooFile(file);
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private processOdooFile(file: File): void {
    this.readState.set('loading');
    this.readError.set(null);
    this.readResult.set(null);

    this.excelService.readExcel(file).subscribe({
      next: (result) => {
        console.log('Excel read result:', result);
        this.readResult.set(result);

        if (result.rowCount === 0) {
          this.readError.set('Le fichier sélectionné ne contient aucune donnée.');
          this.readState.set('error');
          this.notificationService.error('Le fichier sélectionné ne contient aucune donnée.');
          return;
        }

        const expectedHeaders = [
          'Partenaire/Numéro CC',
          'Partenaire/E-mail',
          'Partenaire/Téléphone',
          'Nom d\'affichage du partenaire de la facture',
          'Lignes de facture',
          'Lignes de facture/Taxes',
          'Lignes de facture/Produit',
          'Lignes de facture/Prix unitaire',
          'Lignes de facture/Quantité',
          'Lignes de facture/Unité',
          'Lignes de facture/Remise (%)',
          'Montant hors taxes signé dans la devise',
          'Taxe',
          'Total signé en devises',
          'Statut en cours de paiement',
          'Lignes de facture/Taxes/Actif',
          'Lignes de facture/Taxes/Libellé de taxe'
        ];

        const actualHeaders = result.headers || [];
        const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header));

        if (missingHeaders.length > 0) {
          const errorMessage = `Le fichier Excel est corrompu et ne peut être certifié. En-têtes manquants : ${missingHeaders.join(', ')}`;
          this.readError.set(errorMessage);
          this.readState.set('error');
          this.notificationService.error(errorMessage);
          return;
        }

        this.readState.set('success');
        const mappedInvoices = this.mapReadRowsToInvoices(result.rows);
        console.log('Mapped invoices:', mappedInvoices);
        this.invoices.set(mappedInvoices);
        this.selected.set(new Set());
        this.notificationService.success(`${result.rowCount} lignes chargées avec succès.`);
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Lecture impossible.';
        this.readError.set(message);
        this.readState.set('error');
        this.notificationService.error(message);
      }
    });
  }

  readonly filteredInvoices = computed(() => {
    const query = this.query().toLowerCase();
    const status = this.statusFilter();

    return this.invoices().filter((invoice) => {
      const reference = invoice.invoiceNumber?.toLowerCase() ?? '';
      const client = invoice.clientCompanyName?.toLowerCase() ?? '';
      const ncc = invoice.clientNcc?.toLowerCase() ?? '';
      const matchesQuery = reference.includes(query) || client.includes(query) || ncc.includes(query);
      const matchesStatus = status === 'all' || this.normalizeStatus(invoice) === status;
      return matchesQuery && matchesStatus;
    });
  });

  readonly totals = computed(() => {
    const all = this.invoices();
    const grouped = new Map<string, any[]>();
    all.forEach((invoice) => {
      const key = invoice.invoiceNumber || `__${invoice.id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(invoice);
    });

    const mains = Array.from(grouped.values()).map((items) => items[0]);
    return {
      total: grouped.size,
      pending: mains.filter((invoice) => this.normalizeStatus(invoice) === 'en_attente').length,
      certified: mains.filter((invoice) => this.normalizeStatus(invoice) === 'certifie').length,
      rejected: mains.filter((invoice) => this.normalizeStatus(invoice) === 'rejete').length
    };
  });

  readonly selectedCount = computed(() => this.selected().size);
  readonly selectedApiCount = computed(() => {
    const sel = this.selected();
    const selectedItems = this.invoices().filter((invoice) => sel.has(invoice.id) && invoice.source !== 'excel');
    const unique = new Set(selectedItems.map((i) => i.invoiceNumber || `__${i.id}`));
    return unique.size;
  });
  readonly apiInvoicesCount = computed(() => {
    const apiItems = this.invoices().filter((invoice) => invoice.source !== 'excel');
    const unique = new Set(apiItems.map((i) => i.invoiceNumber || `__${i.id}`));
    return unique.size;
  });

  readonly groupedInvoices = computed(() => {
    const filtered = this.filteredInvoices();
    const grouped = new Map<string, NonCertifiedInvoice[]>();

    filtered.forEach((invoice) => {
      const invoiceNumber = invoice.invoiceNumber || 'unknown';
      if (!grouped.has(invoiceNumber)) {
        grouped.set(invoiceNumber, []);
      }
      grouped.get(invoiceNumber)!.push(invoice);
    });

    const result = Array.from(grouped.entries()).map(([invoiceNumber, items]) => ({
      invoiceNumber,
      items,
      mainInvoice: items[0]
    }));

    result.forEach((group) => {
      console.log('Group clientCompanyName:', group.mainInvoice.clientCompanyName);
      console.log('Group clientNcc:', group.mainInvoice.clientNcc);
    });
    console.log('Grouped Invoices:', result);
    return result;
  });

  // ========== PAGINATION ==========
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly pageSizeOptions = [5, 10, 20, 50, 100];

  readonly groupedInvoicesAll = computed(() => {
    const filtered = this.filteredInvoices();
    const grouped = new Map<string, NonCertifiedInvoice[]>();

    filtered.forEach((invoice) => {
      const invoiceNumber = invoice.invoiceNumber || 'unknown';
      if (!grouped.has(invoiceNumber)) {
        grouped.set(invoiceNumber, []);
      }
      grouped.get(invoiceNumber)!.push(invoice);
    });

    return Array.from(grouped.entries()).map(([invoiceNumber, items]) => ({
      invoiceNumber,
      items,
      mainInvoice: items[0]
    }));
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.groupedInvoicesAll().length / this.pageSize()) || 1;
  });

  readonly paginatedInvoices = computed(() => {
    const all = this.groupedInvoicesAll();
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return all.slice(start, end);
  });

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
    const all = this.groupedInvoicesAll();
    if (all.length === 0) return 'Aucune facture';
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min((this.currentPage() + 1) * this.pageSize(), all.length);
    return `Affichage de ${start} à ${end} sur ${all.length} factures`;
  }

  toggleSelection(invoiceId: number): void {
    const next = new Set(this.selected());
    if (next.has(invoiceId)) {
      next.delete(invoiceId);
    } else {
      next.add(invoiceId);
    }
    this.selected.set(next);
  }

  toggleGroupSelection(invoiceIds: number[]): void {
    const next = new Set(this.selected());
    const allSelected = invoiceIds.every((id) => next.has(id));

    if (allSelected) {
      invoiceIds.forEach((id) => next.delete(id));
    } else {
      invoiceIds.forEach((id) => next.add(id));
    }
    this.selected.set(next);
  }

  toggleAll(checked: boolean): void {
    if (!checked) {
      this.selected.set(new Set());
      return;
    }

    const next = new Set(this.selected());
    this.filteredInvoices().forEach((invoice) => next.add(invoice.id));
    this.selected.set(next);
  }

  isSelected(invoiceId: number): boolean {
    return this.selected().has(invoiceId);
  }

  isGroupFullySelected(items: any[]): boolean {
    return items.length > 0 && items.every((item) => this.selected().has(item.id));
  }

  isRequiredFieldMissing(invoice: any): boolean {
    return !invoice.invoiceNumber ||
      !invoice.typeClient ||
      !invoice.clientCompanyName ||
      !invoice.paymentMethod;
  }

  getGroupItemIds(items: any[]): number[] {
    return items.map((item) => item.id);
  }

  toggleGroupExpand(invoiceNumber: string): void {
    const next = new Set(this.expandedGroups());
    if (next.has(invoiceNumber)) {
      next.delete(invoiceNumber);
    } else {
      next.add(invoiceNumber);
    }
    this.expandedGroups.set(next);
  }

  isGroupExpanded(invoiceNumber: string): boolean {
    return this.expandedGroups().has(invoiceNumber);
  }

  calculateGroupAmountHT(items: any[]): number {
    return items.reduce((sum, item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0;
      const amountBeforeDiscount = quantity * unitPrice;
      const discountAmount = amountBeforeDiscount * (discount / 100);
      return sum + (amountBeforeDiscount - discountAmount);
    }, 0);
  }

  calculateGroupTotalDiscount(items: any[]): number {
    return items.reduce((sum, item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0;
      const amountBeforeDiscount = quantity * unitPrice;
      const discountAmount = amountBeforeDiscount * (discount / 100);
      return sum + discountAmount;
    }, 0);
  }

  getUnitForItem(item: any): string {
    return item.unite ?? 'MAS';
  }

  calculateGroupAmountTTC(items: any[]): number {
    const ht = this.calculateGroupAmountHT(items);
    const tax = this.calculateGroupTotalTax(items);
    return ht + tax;
  }

  calculateGroupTotalTax(items: any[]): number {
    return items.reduce((sum, item) => {
      return sum + this.calculateProductTaxAmount(item);
    }, 0);
  }

  calculateProductTaxAmount(item: any): number {
    const quantity = this.toNumber(item.quantite) ?? 0;
    const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
    const discount = this.toNumber(item.remise) ?? 0;
    const amountBeforeDiscount = quantity * unitPrice;
    const amountAfterDiscount = amountBeforeDiscount * (1 - discount / 100);
    const taxRate = this.getTaxRate(item.codeTaxe);
    return amountAfterDiscount * taxRate;
  }

  calculateLineAmountTTC(item: any): number {
    const quantity = this.toNumber(item.quantite) ?? 0;
    const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
    const discount = this.toNumber(item.remise) ?? 0;
    const amountBeforeDiscount = quantity * unitPrice;
    const amountAfterDiscount = amountBeforeDiscount * (1 - (discount / 100));
    const taxAmount = this.calculateProductTaxAmount(item);
    return amountAfterDiscount + taxAmount;
  }

  displayCurrency(value: string | number | null | undefined): string {
    const num = this.toNumber(value);
    return num === null ? '' : this.formatCurrency(num);
  }

  displayPercentage(value: string | number | null | undefined): string {
    const num = this.toNumber(value);
    return num === null ? '' : `${num} %`;
  }

  getTaxRate(taxCode: string | null | undefined): number {
    if (!taxCode) return 0;
    const code = taxCode.toLowerCase().trim();
    if (code.includes('tva')) return 0.18;
    if (code.includes('tvac')) return 0.18;
    if (code.includes('exempt')) return 0;
    return 0.18;
  }

  getTaxLabel(taxCode: string | null | undefined): string {
    if (!taxCode) return '-';
    const code = taxCode.toUpperCase().trim();
    const rate = this.getTaxRate(taxCode);
    return `${Math.round(rate * 100)}% (${Math.round(rate * 100)})`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(value);
  }

  getStatusLabel(status: InvoiceStatus): string {
    if (status === 'a_certifier') return 'A certifier';
    if (status === 'en_attente') return 'En attente';
    if (status === 'rejete') return 'Rejete';
    if (status === 'certifie') return 'Certifie';
    return 'Inconnu';
  }

  trackById(_: number, invoice: any): string {
    return `${invoice.id}`;
  }

  getDisplayDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }

  getDisplayDateTime(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  getEmissionLabel(invoice: any): string {
    return invoice.source ?? 'api';
  }

  loadInvoices(): void {
    this.loadState.set('loading');
    this.loadError.set(null);
    this.invoiceService.getInvoices().subscribe({
      next: (invoices) => {
        this.invoices.set(invoices.map((invoice) => ({ ...invoice, source: 'api' })));
        this.selected.set(new Set());
        this.loadState.set('idle');
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Impossible de charger les factures.';
        this.loadError.set(message);
        this.loadState.set('error');
        this.notificationService.error(message);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    this.readState.set('loading');
    this.readError.set(null);
    this.readResult.set(null);

    this.excelService.readExcel(file).pipe(finalize(() => input && (input.value = ''))).subscribe({
      next: (result) => {
        this.readResult.set(result);

        if (result.rowCount === 0) {
          this.readError.set('Le fichier sélectionné ne contient aucune donnée.');
          this.readState.set('error');
          this.notificationService.error('Le fichier sélectionné ne contient aucune donnée.');
          return;
        }
        console.log('*********************Excel read result:', result);
        this.readState.set('success');
        this.invoices.set(this.mapReadRowsToInvoices(result.rows));
        this.selected.set(new Set());
        this.notificationService.success(`${result.rowCount} lignes chargées avec succès.`);
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Lecture impossible.';
        this.readError.set(message);
        this.readState.set('error');
        this.notificationService.error(message);
      }
    });
  }

  certifyAll(): void {
    const apiIds = this.invoices()
      .filter((invoice) => invoice.source !== 'excel')
      .map((invoice) => invoice.id);

    if (apiIds.length === 0) {
      this.certifyError.set('Aucune facture issue de la base a certifier.');
      this.certifyState.set('error');
      this.notificationService.warning('Aucune facture issue de la base à certifier.');
      return;
    }

    this.certifyState.set('loading');
    this.certifyError.set(null);
    this.certifyCount.set(0);

    this.invoiceService.certifyMass(apiIds).subscribe({
      next: (responses) => {
        this.certifyCount.set(responses.length);
        this.certifyState.set('success');
        this.loadInvoices();
        this.notificationService.success(`${responses.length} facture(s) certifiée(s) avec succès.`);
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Certification en masse impossible.';
        this.certifyError.set(message);
        this.certifyState.set('error');
        this.notificationService.error(message);
      }
    });
  }

  certifyOne(invoice: any): void {
    debugger;
    this.actionError.set(null);
    const utilisateur = this.authService.getCurrentFullName() ?? 'non defini';
    const numFacture = invoice.invoiceNumber;
    if (!numFacture) {
      this.actionError.set('Référence de facture manquante.');
      this.notificationService.error('Référence de facture manquante.');
      return;
    }

    const allItems = this.invoices().filter((item) => item.invoiceNumber === numFacture);
    const payload = this.buildSignRequest(invoice, allItems);

    console.log('Certifier FNE payload', { numFacture, utilisateur, payload });

    this.certifyingId.set(invoice.id);
    this.invoiceService.certifyFinalFacture(numFacture, utilisateur, payload).subscribe({
      next: () => {
        this.invoices.set(this.invoices().filter((it) => it.invoiceNumber !== numFacture));
        this.selected.set(new Set(Array.from(this.selected()).filter((id) => this.invoices().some((inv) => inv.id === id))));

        const msg = `Certification effectuée avec succès: ${numFacture}`;
        this.certificationSuccessMessage.set(msg);
        this.notificationService.success(msg);

        this.invoiceService.getByNumero(numFacture).subscribe({
          next: (certified) => {
            if (certified && certified.length > 0 && certified[0].token) {
              const token = certified[0].token;
              const verificationUrl = this.invoiceService.getVerificationUrl(token);
              this.certificationDownloadUrl.set(verificationUrl);
              console.log('Certification success (with token):', { numFacture, msg, token, verificationUrl });
            } else {
              const url = this.invoiceService.getDownloadUrl(numFacture);
              this.certificationDownloadUrl.set(url);
              console.log('Certification success (no token):', { numFacture, msg, url });
            }
          },
          error: (err) => {
            const url = this.invoiceService.getDownloadUrl(numFacture);
            this.certificationDownloadUrl.set(url);
            console.warn('Failed to fetch certified invoice token, fallback to download URL', err);
          }
        });

        this.certifyingId.set(null);
        this.readState.set('idle');
      },
      error: (error: any) => {
        console.error('Erreur lors de la certification:', error);
        const message = error.error?.message;
        this.actionError.set(message);
        this.certifyingId.set(null);
        this.notificationService.error(message || 'Erreur lors de la certification');
      }
    });
  }

  private buildSignRequest(invoice: any, items: any[]): InvoiceSignRequest {
    const paymentMethod = this.normalizePaymentMethod(invoice.modePaiement || invoice.paymentMethod);

    const signItems = items.map((item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0;
      const amount = unitPrice;
      const taxes = this.getTaxesFromDisplay(item.codeTaxe);
      const measurementUnit = item.unite ?? '';

      const itemObj: any = {
        taxes: taxes,
        reference: item.refArticle || undefined,
        description: item.designation || item.refArticle || undefined,
        quantity: quantity || undefined,
        amount: amount || undefined,
        measurementUnit: measurementUnit
      };

      if (discount > 0) {
        itemObj.discount = discount;
      }

      return itemObj;
    });

    const isFromExcel = invoice.source === 'excel';
    const utilisateur = this.authService.getCurrentFullName() ?? 'non defini';
    const pdv = this.authService.getCurrentPdv() ?? 'non defini';
    const etablissement = this.authService.getCurrentEtabFNE() ?? 'non defini';

    const payload: any = {
      invoiceType: 'sale',
      paymentMethod: paymentMethod,
      template: invoice.typeClient || 'B2B',
      clientNcc: invoice.clientNcc || undefined,
      clientCompanyName: invoice.clientCompanyName || invoice.nomClient || undefined,
      clientPhone: invoice.telephoneClient || '',
      clientEmail: invoice.emailClient || '',
      clientSellerName: utilisateur,
      pointOfSale: pdv,
      establishment: etablissement,
      commercialMessage: invoice.commentaire || undefined,
      footer: undefined,
      items: signItems,
      discount: undefined
    };

    if (!isFromExcel) {
      payload.numeroFacture = invoice.invoiceNumber;
      payload.clientSellerName = invoice.clientSellerName || undefined;
      payload.foreignCurrency = '';
      payload.foreignCurrencyRate = 0;
    }

    return payload;
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;

    let s = (value as string).trim();
    if (!s) return null;
    s = s.replace(/[^-\d.,-]/g, '');

    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '');
      s = s.replace(/,/g, '.');
    } else if (s.indexOf(',') !== -1) {
      s = s.replace(/,/g, '.');
    }

    const num = Number(s);
    return Number.isNaN(num) ? null : num;
  }

  private normalizePaymentMethod(value?: string | null): string {
    if (!value) return 'transfer';
    const v = value.toLowerCase().trim();
    if (v.includes('virement')) return 'transfer';
    if (v.includes('carte')) return 'card';
    if (v.includes('espe') || v.includes('espèce') || v.includes('espece')) return 'cash';
    if (v.includes('mobile')) return 'mobile-money';
    if (v.includes('cheque') || v.includes('chèque')) return 'check';
    if (v.includes('terme')) return 'transfer';
    return 'transfer';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  normalizeStatus(invoice: any): InvoiceStatus {
    const raw = invoice.factureCertifStatus?.toLowerCase().trim() ?? '';
    if (!raw) return 'inconnu';
    if (raw.includes('rejete') || raw.includes('rejet')) return 'rejete';
    if (raw.includes('certifie')) return 'certifie';
    if (raw.includes('attente')) return 'en_attente';
    if (raw.includes('a certifier')) return 'a_certifier';
    return 'inconnu';
  }

  protected async checkParametresAccess(): Promise<void> {
    try {
      const userId = this.authService.getCurrentId();
      const roleId = this.authService.getCurrentIdRole();

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

  private mapReadRowsToInvoices(rows: Array<Record<string, string>>): any[] {
    const groupedRows = new Map<string, Array<Record<string, string>>>();
    rows.forEach((row) => {
      const normalized = this.normalizeRow(row);
      const lignesFacture = this.getFirstValue(normalized, ['lignesdefacture', 'lignesfacture', 'lignesdefacturelignesdefacture', 'lignesdefactureproduit']) || '';
      const invoiceNumber = lignesFacture.length > 23
        ? lignesFacture.substring(0, 23)
        : lignesFacture;
      if (!groupedRows.has(invoiceNumber)) {
        groupedRows.set(invoiceNumber, []);
      }
      groupedRows.get(invoiceNumber)!.push(row);
    });

    const clientInfoMap = new Map<string, {
      clientCompanyName: string | null;
      clientNameAlt: string | null;
      clientNcc: string | null;
      typeClient: string;
      codeClient: string | null;
      telephoneClient: string | null;
      emailClient: string | null;
      clientSellerName: string | null;
    }>();

    groupedRows.forEach((groupRows, invoiceNumber) => {
      const firstRow = groupRows[0];
      const normalized = this.normalizeRow(firstRow);
      console.log('Normalized row for client extraction:', normalized);
      const clientNcc = this.getFirstValue(normalized, this.clientNccKeys);
      const clientCompanyName = this.getFirstValue(normalized, ['nomdaffichagedupartenairedelafacture']);
      console.log('Client Company Name:', clientCompanyName);
      const clientNameAlt = this.getFirstValue(normalized, this.clientNameKeys) || '';
      const colonneA = this.getFirstValue(normalized, ['ncc']) || '';
      const clientNccValue = this.getFirstValue(normalized, ['partenairenumerocc']) || '000000000000';

      const typeClient = clientCompanyName && clientCompanyName.trim() ? 'B2B' : 'B2C';
      const codeClient = this.extractInitialsFromClient(clientCompanyName || clientNameAlt);
      const telephoneClient = this.getFirstValue(normalized, this.telephoneClientKeys);
      const emailClient = this.getFirstValue(normalized, this.emailClientKeys);
      const clientSellerName = this.getFirstValue(normalized, this.clientSellerNameKeys) || 'non defini';

      console.log('Debug client extraction:', {
        clientNcc,
        clientCompanyName,
        clientNameAlt,
        colonneA,
        typeClient,
        codeClient,
        telephoneClient,
        emailClient,
        clientSellerName,
        normalizedKeys: Object.keys(normalized),
        normalizedValues: normalized
      });

      clientInfoMap.set(invoiceNumber, {
        clientCompanyName,
        clientNameAlt,
        clientNcc,
        typeClient,
        codeClient,
        telephoneClient,
        emailClient,
        clientSellerName
      });
    });

    return rows.map((row, index) => {
      const normalized = this.normalizeRow(row);

      const lignesFacture = this.getFirstValue(normalized, ['lignesdefacture', 'lignesfacture', 'lignesdefacturelignesdefacture', 'lignesdefactureproduit']) || '';
      const invoiceNumber = lignesFacture.length > 23
        ? lignesFacture.substring(0, 23).replace(/\//g, '-')
        : lignesFacture.replace(/\//g, '-');

      const invoiceType = this.getFirstValue(normalized, this.invoiceTypeKeys);
      const statutEnCoursDePaiement = this.getFirstValue(normalized, ['statutencourdepaiement', 'statutencourdepaiement', 'statutencoursdepaiement', 'statutencourdepaiment']) || '';
      const paymentMethod = statutEnCoursDePaiement.trim().toLowerCase() === 'comptabilisé' ? 'transfer' : 'transfer';

      const clientNcc = this.getFirstValue(normalized, this.clientNccKeys);
      const clientCompanyName = this.getFirstValue(normalized, ['nomdaffichagedupartenairedelafacture']);
      const clientNameAlt = this.getFirstValue(normalized, this.clientNameKeys) || '';
      const typeClient = this.getFirstValue(normalized, this.typeClientKeys) || (clientCompanyName && clientCompanyName.trim() ? 'B2B' : 'B2C');
      const clientInfo = clientInfoMap.get(invoiceNumber);
      const codeClient = clientInfo?.codeClient;
      const telephoneClient = this.getFirstValue(normalized, this.telephoneClientKeys) || '';
      const emailClient = this.getFirstValue(normalized, this.emailClientKeys) || '';
      const clientSellerName = this.getFirstValue(normalized, this.clientSellerNameKeys) || 'non defini';

      const status = this.getFirstValue(normalized, this.statusKeys);
      const invoiceDate = this.getFirstValue(normalized, this.invoiceDateKeys);

      const refArticle = this.getFirstValue(normalized, this.refArticleKeys) || this.extractReferenceFromLignesDefactureProduit(this.getFirstValue(normalized, ['lignesdefactureproduit']));
      const designation = this.getFirstValue(normalized, ['lignesdefacture', 'lignesfacture', 'lignesdefacturelignesdefacture', 'lignesdefactureproduit']) || this.getFirstValue(normalized, this.designationKeys);
      const designationWithoutBrackets = designation ? designation.replace(/\[[^\]]*\]/g, '').trim() : null;
      const designationWithoutInvoiceNumber = designationWithoutBrackets?.replace(/numéro facture/i, '').trim() || designationWithoutBrackets;
      const designationWithoutLeftChars = designationWithoutInvoiceNumber?.replace(/^[^)]*\)/, '').trim() || designationWithoutInvoiceNumber;
      const quantite = this.getFirstValue(normalized, ['quantite', 'qty', 'quantity', 'colonneG', 'g', 'colonne7', 'quantiteg', 'qtyg', 'quantityg', 'quantitecolonneG', 'qtycolonneG', 'quantitycolonneG', 'lignesdefacturequantite']) || this.getFirstValue(normalized, this.quantiteKeys);
      const prixUnitaireHT = this.getFirstValue(normalized, ['prixunitaireht', 'puht', 'prixunitaire', 'colonneF', 'f', 'colonne6', 'prixht', 'prixunitairehtf', 'lignesdefactureprixunitaire']) || this.getFirstValue(normalized, this.prixUnitaireHTKeys);

      console.log('Debug Excel row:', {
        designation,
        quantite,
        prixUnitaireHT,
        normalizedKeys: Object.keys(normalized),
        normalizedValues: normalized
      });
      const codeTaxe = this.getFirstValue(normalized, ['codetaxe', 'taxe', 'taxcode', 'lignesdefacturetaxes']) || this.getFirstValue(normalized, this.codeTaxeKeys);
      const unite = this.getFirstValue(normalized, this.uniteKeys);
      const remise = this.getFirstValue(normalized, ['lignesdefactureremise', 'lignesfactureremise', 'lignesdefacturelignesdefactureremise', 'remise']) || this.getFirstValue(normalized, this.remiseKeys);
      const modePaiement = this.getFirstValue(normalized, this.modePaiementKeys);
      const devise = this.getFirstValue(normalized, this.deviseKeys);
      const tauxChange = this.getFirstValue(normalized, this.tauxChangeKeys);
      const commentaire = (invoiceNumber || 'non defini').replace(/\//g, '-');

      return {
        id: index + 1,
        invoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate ?? null,
        clientCompanyName: clientCompanyName ?? null,
        clientNcc: clientNcc ?? null,
        invoiceType: invoiceType ?? null,
        paymentMethod: paymentMethod ?? null,
        factureCertifStatus: status ?? 'En attente',
        dateDeModification: null,
        source: 'excel',
        typeClient: (clientNcc && clientNcc.trim()) ? typeClient : 'B2C',
        codeClient: codeClient ?? null,
        nomClient: clientNameAlt ?? null,
        telephoneClient: telephoneClient ?? null,
        emailClient: emailClient ?? null,
        refArticle: refArticle ?? null,
        designation: designationWithoutLeftChars ?? designationWithoutInvoiceNumber ?? designationWithoutBrackets ?? designation ?? null,
        quantite: quantite ?? null,
        prixUnitaireHT: prixUnitaireHT ?? null,
        codeTaxe: codeTaxe ?? null,
        unite: unite ?? null,
        remise: remise ?? null,
        modePaiement: modePaiement ?? null,
        devise: devise ?? null,
        tauxChange: tauxChange ?? null,
        commentaire: commentaire ?? null,
        clientSellerName: clientSellerName ?? null
      };
    });
  }

  private normalizeRow(row: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (!key) return;
      const normalizedKey = this.normalizeKey(key);
      if (!normalizedKey) return;
      normalized[normalizedKey] = value;
    });
    return normalized;
  }

  private normalizeKey(key: string): string {
    return key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();
  }

  private getFirstValue(row: Record<string, string>, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key];
      if (value && value.trim()) {
        return value;
      }
    }
    return null;
  }

  private readonly invoiceNumberKeys = ['invoicenumber', 'invoiceid', 'numerofacture', 'numfacture', 'numfact', 'facturenumber'];
  private readonly invoiceTypeKeys = ['typeclient', 'invoicetype', 'typefacture', 'type'];
  private readonly paymentMethodKeys = ['paymentmethod', 'modepaiement', 'moyenpaiement', 'paiement'];
  private readonly clientNccKeys = ['clientncc', 'partenairenumerocc', 'clientnif', 'nif', 'nccclient'];
  private readonly clientCompanyNameKeys = ['clientcompanyname', 'clientcompagnyname', 'client', 'raisonsociale', 'societe', 'nomclient'];
  private readonly clientNameKeys = ['nomdaffichagedupartenairedelafacture'];
  private readonly statusKeys = ['facturecertifstatus', 'statuscertification', 'statut', 'status'];
  private readonly invoiceDateKeys = ['invoicedate', 'datefacture', 'date'];
  private readonly typeClientKeys = ['typeclient', 'typeclient', 'typeclient'];
  private readonly codeClientKeys = ['codeclient'];
  private readonly telephoneClientKeys = ['telephoneclient', 'telclient', 'phoneclient', 'partenairetelephone'];
  private readonly emailClientKeys = ['emailclient', 'mailclient', 'partenaireemail'];
  private readonly refArticleKeys = ['refarticle', 'referencearticle', 'article'];
  private readonly designationKeys = ['designation', 'designationarticle'];
  private readonly quantiteKeys = ['quantite', 'qty', 'quantity'];
  private readonly prixUnitaireHTKeys = ['prixunitaireht', 'puht', 'prixunitaire'];
  private readonly codeTaxeKeys = ['codetaxe', 'taxe', 'taxcode'];
  private readonly uniteKeys = ['unite', 'unit'];
  private readonly remiseKeys = ['remise', 'discount'];
  private readonly modePaiementKeys = ['modepaiement', 'paymentmethod', 'paiement'];
  private readonly deviseKeys = ['devise', 'currency'];
  private readonly tauxChangeKeys = ['tauxchange', 'changerate'];
  private readonly commentaireKeys = ['commentaire', 'comment', 'note'];
  private readonly clientSellerNameKeys = ['clientsellername', 'vendeurclient', 'seller'];

  private extractReferenceFromLignesDefactureProduit(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = value.match(/\[([^\]]+)\]/);
    return match ? match[1].trim() : null;
  }

  private extractInitialsFromClient(value: string | null | undefined): string | null {
    if (!value) return null;
    const words = value.trim().split(/\s+/);
    const initials = words.map(word => word.charAt(0)).join('').toUpperCase();
    return initials || null;
  }

  private getTaxesFromDisplay(taxCode: string | null | undefined): string[] | undefined {
    if (!taxCode) return undefined;
    const label = this.getTaxLabel(taxCode);
    if (label === '18% (18)') {
      return ['TVA'];
    } else {
      return ['TVAC'];
    }
  }
}
