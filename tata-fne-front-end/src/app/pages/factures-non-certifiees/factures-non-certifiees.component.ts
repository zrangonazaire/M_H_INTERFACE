import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { FneExcelService } from '../../core/services/fne-excel.service';
import { ExcelReadResult } from '../../core/models/excel-read-result';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { NonCertifiedInvoice } from '../../core/models/non-certified-invoice';

type InvoiceStatus = 'a_certifier' | 'en_attente' | 'rejete' | 'certifie' | 'inconnu';

@Component({
  selector: 'app-factures-non-certifiees',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(
    private readonly excelService: FneExcelService,
    private readonly invoiceService: FneInvoiceService
  ) {
    this.loadInvoices();
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
  readonly apiInvoicesCount = computed(
    () => this.invoices().filter((invoice) => invoice.source !== 'excel').length
  );

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
      const status = this.getFirstValue(normalized, this.statusKeys);
      const invoiceDate = this.getFirstValue(normalized, this.invoiceDateKeys);

      return {
        id: index + 1,
        invoiceNumber: invoiceNumber ?? '',
        invoiceDate: invoiceDate ?? null,
        clientCompanyName: clientCompanyName ?? null,
        clientNcc: clientNcc ?? null,
        invoiceType: invoiceType ?? null,
        paymentMethod: paymentMethod ?? null,
        factureCertifStatus: status ?? 'En attente',
        dateDeModification: null,
        source: 'excel'
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

  private readonly invoiceNumberKeys = [
    'invoicenumber',
    'invoiceid',
    'numerofacture',
    'numfacture',
    'numfact',
    'facturenumber'
  ];
  private readonly invoiceTypeKeys = ['typeclient', 'invoicetype', 'typefacture', 'type'];
  private readonly paymentMethodKeys = ['paymentmethod', 'modepaiement', 'moyenpaiement', 'paiement'];
  private readonly clientNccKeys = ['clientncc', 'ncc', 'clientnif', 'nif', 'nccclient'];
  private readonly clientCompanyNameKeys = [
    'clientcompanyname',
    'clientcompagnyname',
    'client',
    'raisonsociale',
    'societe',
    'nomclient'
  ];
  private readonly statusKeys = ['facturecertifstatus', 'statuscertification', 'statut', 'status'];
  private readonly invoiceDateKeys = ['invoicedate', 'datefacture', 'date'];
}
