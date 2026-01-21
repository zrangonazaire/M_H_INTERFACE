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

  constructor(
    private readonly excelService: FneExcelService,
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly router: Router
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
    return {
      total: all.length,
      pending: all.filter((invoice) => this.normalizeStatus(invoice) === 'en_attente').length,
      certified: all.filter((invoice) => this.normalizeStatus(invoice) === 'certifie').length,
      rejected: all.filter((invoice) => this.normalizeStatus(invoice) === 'rejete').length
    };
  });

  readonly selectedCount = computed(() => this.selected().size);
  readonly selectedApiCount = computed(() =>
    this.invoices().filter((invoice) => this.selected().has(invoice.id) && invoice.source !== 'excel').length
  );
  readonly apiInvoicesCount = computed(() => this.invoices().filter((invoice) => invoice.source !== 'excel').length);

  toggleSelection(invoiceId: number): void {
    const next = new Set(this.selected());
    if (next.has(invoiceId)) {
      next.delete(invoiceId);
    } else {
      next.add(invoiceId);
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

    const payload = this.buildSignRequest(invoice);

    // Log payload sent to backend for traceability
    console.log('Certifier FNE payload', { numFacture, utilisateur, payload });

    this.certifyingId.set(invoice.id);
    this.invoiceService.certifyFinalFacture(numFacture, utilisateur, payload).subscribe({
      next: () => {
        this.certifyingId.set(null);
        this.loadInvoices();
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Certification impossible.';
        this.actionError.set(message);
        this.certifyingId.set(null);
      }
    });
  }

  private buildSignRequest(invoice: NonCertifiedInvoice): InvoiceSignRequest {
    const amount = this.toNumber(invoice.prixUnitaireHT);
    const quantity = this.toNumber(invoice.quantite);
    const discount = this.toNumber(invoice.remise);
    const paymentMethod = this.normalizePaymentMethod(invoice.modePaiement || invoice.paymentMethod);

    return {
      invoiceType: 'sale',
      paymentMethod: paymentMethod,
      template: 'B2B',
      numeroFacture: invoice.invoiceNumber,
      clientNcc: invoice.clientNcc || undefined,
      clientCompanyName: invoice.clientCompanyName || invoice.nomClient || undefined,
      clientPhone: invoice.telephoneClient || undefined,
      clientEmail: invoice.emailClient || undefined,
      pointOfSale: 'PDV_TATA_AFRICA_CI',
      establishment: 'TATA AFRICA CI',
      commercialMessage: invoice.commentaire || undefined,
      items: [
        {
          taxes: invoice.codeTaxe ? [invoice.codeTaxe] : undefined,
          description: invoice.designation || invoice.refArticle || undefined,
          quantity: quantity ?? undefined,
          amount: amount ?? undefined
        }
      ],
      discount: discount ?? undefined
    };
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'number' ? value : Number((value as string).replace(',', '.'));
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
