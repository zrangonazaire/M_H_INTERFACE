import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { FneExcelService } from '../../core/services/fne-excel.service';
import { ExcelReadResult } from '../../core/models/excel-read-result';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { NonCertifiedInvoice } from '../../core/models/non-certified-invoice';
import { AuthenticationService } from '../../core/services/authentication.service';
import { InvoiceSignRequest } from '../../core/models/invoice-sign-request';
import { AttributionService } from '../../core/services/attribution.service';

type InvoiceStatus = 'a_certifier' | 'en_attente' | 'rejete' | 'certifie' | 'inconnu';

@Component({
  selector: 'app-factures-non-certifiees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './factures-non-certifiees.component.html',
  styleUrl: './factures-non-certifiees.component.scss'
})
export class FacturesNonCertifieesComponent {
  readonly query = signal('');
  readonly statusFilter = signal<'all' | InvoiceStatus>('all');

  readonly invoices = signal<NonCertifiedInvoice[]>([]);
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
  readonly certificationSuccessMessage = signal<string | null>(null);
  readonly certificationDownloadUrl = signal<string | null>(null);

  constructor(
    private readonly excelService: FneExcelService,
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly router: Router,
    private readonly attributionService: AttributionService
  ) {
    this.loadInvoices();
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
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
    // Grouper par numéro de facture pour compter les factures uniques
    const grouped = new Map<string, NonCertifiedInvoice[]>();
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

    return Array.from(grouped.entries()).map(([invoiceNumber, items]) => ({
      invoiceNumber,
      items,
      mainInvoice: items[0]
    }));
  });

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

  isGroupFullySelected(items: NonCertifiedInvoice[]): boolean {
    return items.length > 0 && items.every((item) => this.selected().has(item.id));
  }

  getGroupItemIds(items: NonCertifiedInvoice[]): number[] {
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

  calculateGroupAmountHT(items: NonCertifiedInvoice[]): number {
    return items.reduce((sum, item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0; // Remise en %
      const amountBeforeDiscount = quantity * unitPrice;
      const discountAmount = amountBeforeDiscount * (discount / 100);
      return sum + (amountBeforeDiscount - discountAmount);
    }, 0);
  }

  calculateGroupTotalDiscount(items: NonCertifiedInvoice[]): number {
    return items.reduce((sum, item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0; // Remise en %
      const amountBeforeDiscount = quantity * unitPrice;
      const discountAmount = amountBeforeDiscount * (discount / 100);
      return sum + discountAmount;
    }, 0);
  }

  calculateGroupAmountTTC(items: NonCertifiedInvoice[]): number {
    const ht = this.calculateGroupAmountHT(items);
    const tax = this.calculateGroupTotalTax(items);
    return ht + tax;
  }

  calculateGroupTotalTax(items: NonCertifiedInvoice[]): number {
    return items.reduce((sum, item) => {
      return sum + this.calculateProductTaxAmount(item);
    }, 0);
  }

  calculateProductTaxAmount(item: NonCertifiedInvoice): number {
    const quantity = this.toNumber(item.quantite) ?? 0;
    const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
    const discount = this.toNumber(item.remise) ?? 0;
    const amountBeforeDiscount = quantity * unitPrice;
    const amountAfterDiscount = amountBeforeDiscount * (1 - discount / 100);
    const taxRate = this.getTaxRate(item.codeTaxe);
    return amountAfterDiscount * taxRate;
  }

  calculateLineAmountTTC(item: NonCertifiedInvoice): number {
    const quantity = this.toNumber(item.quantite) ?? 0;
    const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
    const discount = this.toNumber(item.remise) ?? 0;
    const amountBeforeDiscount = quantity * unitPrice;
    const amountAfterDiscount = amountBeforeDiscount * (1 - (discount / 100));
    const taxAmount = this.calculateProductTaxAmount(item);
    return amountAfterDiscount + taxAmount;
  }

  // Affiche une valeur monétaire ou '-' si invalide
  displayCurrency(value: string | number | null | undefined): string {
    const num = this.toNumber(value);
    return num === null ? '-' : this.formatCurrency(num);
  }

  // Affiche un pourcentage (ex: '10 %') ou '-' si invalide
  displayPercentage(value: string | number | null | undefined): string {
    const num = this.toNumber(value);
    return num === null ? '-' : `${num} %`;
  }

  getTaxRate(taxCode: string | null | undefined): number {
    if (!taxCode) return 0;
    const code = taxCode.toLowerCase().trim();
    if (code.includes('tva')) return 0.18; // TVA = 18%
    if (code.includes('tvac')) return 0.18; // TVAC = 18%
    if (code.includes('exempt')) return 0; // Exempt
    return 0.18; // Défaut: 18%
  }

  getTaxLabel(taxCode: string | null | undefined): string {
    if (!taxCode) return '-';
    const code = taxCode.toUpperCase().trim();
    const rate = this.getTaxRate(taxCode);
    return `${code} (${Math.round(rate * 100)})`;
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

  trackById(_: number, invoice: NonCertifiedInvoice): string {
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

  getEmissionLabel(invoice: NonCertifiedInvoice): string {
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

    this.excelService
      .readExcel(file)
      .pipe(finalize(() => input && (input.value = '')))
      .subscribe({
        next: (result) => {
          this.readResult.set(result);
          this.readState.set('success');
          this.invoices.set(this.mapReadRowsToInvoices(result.rows));
          this.selected.set(new Set());
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Lecture impossible.';
          this.readError.set(message);
          this.readState.set('error');
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
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Certification en masse impossible.';
        this.certifyError.set(message);
        this.certifyState.set('error');
      }
    });
  }

  certifyOne(invoice: NonCertifiedInvoice): void {
    this.actionError.set(null);
    const utilisateur = this.authService.getCurrentFullName() ?? 'non defini';
    const numFacture = invoice.invoiceNumber;
    if (!numFacture) {
      this.actionError.set('Référence de facture manquante.');
      return;
    }

    // Récupérer tous les produits de cette facture
    const allItems = this.invoices().filter((item) => item.invoiceNumber === numFacture);
    
    const payload = this.buildSignRequest(invoice, allItems);

    // Log payload sent to backend for traceability
    console.log('Certifier FNE payload', { numFacture, utilisateur, payload });

    this.certifyingId.set(invoice.id);
    this.invoiceService.certifyFinalFacture(numFacture, utilisateur, payload).subscribe({
      next: () => {
        // Retirer de l'affichage toutes les lignes appartenant à cette facture
        this.invoices.set(this.invoices().filter((it) => it.invoiceNumber !== numFacture));
        this.selected.set(new Set(Array.from(this.selected()).filter((id) => this.invoices().some((inv) => inv.id === id))));

        // Construire un message de succès et un lien de téléchargement probable
        const msg = `Certification effectuée avec succès: ${numFacture}`;
        this.certificationSuccessMessage.set(msg);

        // Récupérer la facture certifiée pour obtenir le token public
        this.invoiceService.getByNumero(numFacture).subscribe({
          next: (certified) => {
            if (certified && certified.length > 0 && certified[0].token) {
              const token = certified[0].token;
              const verificationUrl = this.invoiceService.getVerificationUrl(token);
              this.certificationDownloadUrl.set(verificationUrl);
              console.log('Certification success (with token):', { numFacture, msg, token, verificationUrl });
            } else {
              // fallback to previous heuristic
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
        // réinitialiser l'état de lecture pour remplacer le message "Lecture terminée"
        this.readState.set('idle');
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Certification impossible.';
        this.actionError.set(message);
        this.certifyingId.set(null);
      }
    });
  }

  private buildSignRequest(invoice: NonCertifiedInvoice, items: NonCertifiedInvoice[]): InvoiceSignRequest {
    const paymentMethod = this.normalizePaymentMethod(invoice.modePaiement || invoice.paymentMethod);

    // Construire les items à partir de tous les produits
    const signItems = items.map((item) => {
      const quantity = this.toNumber(item.quantite) ?? 0;
      const unitPrice = this.toNumber(item.prixUnitaireHT) ?? 0;
      const discount = this.toNumber(item.remise) ?? 0;
      // amount = prix unitaire HT
      const amount = unitPrice;
      return {
        taxes: item.codeTaxe ? [item.codeTaxe] : undefined,
        customTaxes: undefined,
        reference: item.refArticle || undefined,
        description: item.designation || item.refArticle || undefined,
        quantity: quantity || undefined,
        amount: amount || undefined,
        discount: discount > 0 ? discount : undefined,
        measurementUnit: item.unite || undefined
      };
    });

    return {
      invoiceType: 'sale',
      paymentMethod: paymentMethod,
      template: 'B2B',
      numeroFacture: invoice.invoiceNumber,
      clientNcc: invoice.clientNcc || undefined,
      clientCompanyName: invoice.clientCompanyName || invoice.nomClient || undefined,
      clientPhone: invoice.telephoneClient || undefined,
      clientEmail: invoice.emailClient || undefined,
      clientSellerName: invoice.clientSellerName || undefined,
      pointOfSale: 'PDV_TATA_AFRICA_CI',
      establishment: 'TATA AFRICA CI',
      commercialMessage: invoice.commentaire || undefined,
      footer: undefined,
      foreignCurrency: '',
      foreignCurrencyRate: 0,
      items: signItems,
      customTaxes: undefined,
      discount: undefined
    };
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;

    // Normaliser la chaîne : retirer espaces et caractères non numériques sauf . , -
    let s = (value as string).trim();
    if (!s) return null;
    // Enlever caractères non numériques sauf . , -
    s = s.replace(/[^ -\d.,-]/g, '');

    // Cas où la chaîne contient à la fois '.' et ',' -> supposer que '.' est séparateur de milliers
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
      s = s.replace(/\./g, ''); // enlever points milliers
      s = s.replace(/,/g, '.'); // la virgule devient décimale
    } else if (s.indexOf(',') !== -1) {
      // si seule la virgule est présente, l'utiliser comme séparateur décimal
      s = s.replace(/,/g, '.');
    } else {
      // pas de virgule, points éventuels peuvent être milliers ou décimale selon contexte; on laisse
    }

    const num = Number(s);
    return Number.isNaN(num) ? null : num;
  }

  private normalizePaymentMethod(value?: string | null): string {
    if (!value) return 'card';
    const v = value.toLowerCase().trim();
    if (v.includes('virement')) return 'transfer';
    if (v.includes('carte')) return 'card';
    if (v.includes('espe') || v.includes('espèce') || v.includes('espece')) return 'cash';
    if (v.includes('mobile')) return 'mobile-money';
    if (v.includes('cheque') || v.includes('chèque')) return 'check';
    if (v.includes('terme')) return 'deferred';
    return 'card';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  normalizeStatus(invoice: NonCertifiedInvoice): InvoiceStatus {
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

  private mapReadRowsToInvoices(rows: Array<Record<string, string>>): NonCertifiedInvoice[] {
    return rows.map((row, index) => {
      const normalized = this.normalizeRow(row);
      const invoiceNumber = this.getFirstValue(normalized, this.invoiceNumberKeys);
      const invoiceType = this.getFirstValue(normalized, this.invoiceTypeKeys);
      const paymentMethod = this.getFirstValue(normalized, this.paymentMethodKeys);
      const clientNcc = this.getFirstValue(normalized, this.clientNccKeys);
      const clientCompanyName = this.getFirstValue(normalized, this.clientCompanyNameKeys);
      const clientNameAlt = this.getFirstValue(normalized, this.clientNameKeys);
      const status = this.getFirstValue(normalized, this.statusKeys);
      const invoiceDate = this.getFirstValue(normalized, this.invoiceDateKeys);

      const typeClient = this.getFirstValue(normalized, this.typeClientKeys);
      const codeClient = this.getFirstValue(normalized, this.codeClientKeys);
      const telephoneClient = this.getFirstValue(normalized, this.telephoneClientKeys);
      const emailClient = this.getFirstValue(normalized, this.emailClientKeys);
      const refArticle = this.getFirstValue(normalized, this.refArticleKeys);
      const designation = this.getFirstValue(normalized, this.designationKeys);
      const quantite = this.getFirstValue(normalized, this.quantiteKeys);
      const prixUnitaireHT = this.getFirstValue(normalized, this.prixUnitaireHTKeys);
      const codeTaxe = this.getFirstValue(normalized, this.codeTaxeKeys);
      const unite = this.getFirstValue(normalized, this.uniteKeys);
      const remise = this.getFirstValue(normalized, this.remiseKeys);
      const modePaiement = this.getFirstValue(normalized, this.modePaiementKeys);
      const devise = this.getFirstValue(normalized, this.deviseKeys);
      const tauxChange = this.getFirstValue(normalized, this.tauxChangeKeys);
      const commentaire = this.getFirstValue(normalized, this.commentaireKeys);
      const clientSellerName = this.getFirstValue(normalized, this.clientSellerNameKeys);

      return {
        id: index + 1,
        invoiceNumber: invoiceNumber ?? '',
        invoiceDate: invoiceDate ?? null,
        clientCompanyName: clientCompanyName ?? clientNameAlt ?? null,
        clientNcc: clientNcc ?? null,
        invoiceType: invoiceType ?? null,
        paymentMethod: paymentMethod ?? null,
        factureCertifStatus: status ?? 'En attente',
        dateDeModification: null,
        source: 'excel',
        typeClient: typeClient ?? null,
        codeClient: codeClient ?? null,
        nomClient: clientNameAlt ?? null,
        telephoneClient: telephoneClient ?? null,
        emailClient: emailClient ?? null,
        refArticle: refArticle ?? null,
        designation: designation ?? null,
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
  private readonly clientNccKeys = ['clientncc', 'ncc', 'clientnif', 'nif', 'nccclient'];
  private readonly clientCompanyNameKeys = ['clientcompanyname', 'clientcompagnyname', 'client', 'raisonsociale', 'societe', 'nomclient'];
  private readonly clientNameKeys = ['nomclient'];
  private readonly statusKeys = ['facturecertifstatus', 'statuscertification', 'statut', 'status'];
  private readonly invoiceDateKeys = ['invoicedate', 'datefacture', 'date'];
  private readonly typeClientKeys = ['typeclient'];
  private readonly codeClientKeys = ['codeclient'];
  private readonly telephoneClientKeys = ['telephoneclient', 'telclient', 'phoneclient'];
  private readonly emailClientKeys = ['emailclient', 'mailclient'];
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
}
