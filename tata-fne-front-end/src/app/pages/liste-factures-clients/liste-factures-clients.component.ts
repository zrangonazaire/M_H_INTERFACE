import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';
import {
  FneClientInvoicesQuery,
  FneInvoiceService,
  FneInvoiceSyncResult
} from '../../core/services/fne-invoice.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

type InvoiceRow = Record<string, unknown>;

@Component({
  selector: 'app-liste-factures-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './liste-factures-clients.component.html',
  styleUrl: './liste-factures-clients.component.scss'
})
export class ListeFacturesClientsComponent {
  private readonly fneUsernameStorageKey = 'tata_fne_external_username';

  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly fneUsername = signal(localStorage.getItem(this.fneUsernameStorageKey) ?? '');
  protected readonly fnePassword = signal('');

  protected readonly page = signal(1);
  protected readonly perPage = signal(12);
  protected readonly fromDate = signal(this.toDateInputValue(this.addDays(new Date(), -14)));
  protected readonly toDate = signal(this.toDateInputValue(new Date()));
  protected readonly sortBy = signal('-date');
  protected readonly listing = signal('issued');
  protected readonly complete = signal(true);

  protected readonly isConnecting = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly rawResponse = signal<FneInvoiceSyncResult | null>(null);
  protected readonly invoices = signal<InvoiceRow[]>([]);

  protected readonly listingOptions = ['issued', 'received'];
  protected readonly totalItems = computed(() => this.rawResponse()?.total ?? this.invoices().length);

  constructor(
    private readonly authService: AuthenticationService,
    private readonly invoiceService: FneInvoiceService,
    private readonly router: Router
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');

    if (this.fneUsername()) {
      this.loadInvoicesFromDatabase();
    }
  }

  protected loginAndSync(): void {
    const username = this.fneUsername().trim();
    const password = this.fnePassword().trim();

    if (!username || !password) {
      this.error.set('Le username et le mot de passe FNE sont obligatoires.');
      this.success.set(null);
      return;
    }

    this.isConnecting.set(true);
    this.error.set(null);
    this.success.set(null);

    this.invoiceService.loginToFne(username, password)
      .pipe(finalize(() => this.isConnecting.set(false)))
      .subscribe({
        next: (res) => {
          this.fnePassword.set('');
          localStorage.setItem(this.fneUsernameStorageKey, username);
          this.success.set(res.message || 'Connexion FNE reussie.');
          this.syncInvoicesFromFne();
        },
        error: (err) => {
          this.error.set(this.extractErrorMessage(err, 'Connexion FNE impossible.'));
          this.success.set(null);
        }
      });
  }

  protected syncInvoicesFromFne(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.invoiceService.syncClientInvoices(this.buildQuery(), this.fneUsername().trim())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.rawResponse.set(response);
          const rows = this.extractRows(response.data);
          this.invoices.set(rows);
          this.success.set(
            `${rows.length} facture(s) synchronisee(s). `
            + `Sauvegardees: ${response.savedCount}, Creees: ${response.createdCount}, Mises a jour: ${response.updatedCount}.`
          );
        },
        error: (err) => {
          this.invoices.set([]);
          this.rawResponse.set(null);
          this.error.set(this.extractErrorMessage(err, 'Impossible de synchroniser les factures depuis la FNE.'));
          this.success.set(null);
        }
      });
  }

  protected loadInvoicesFromDatabase(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.invoiceService.getClientInvoices(this.buildQuery())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.rawResponse.set(response);
          const rows = this.extractRows(response.data);
          this.invoices.set(rows);
          this.success.set(`${rows.length} facture(s) chargee(s) depuis la base locale.`);
        },
        error: (err) => {
          this.invoices.set([]);
          this.rawResponse.set(null);
          this.error.set(this.extractErrorMessage(err, 'Impossible de charger la liste des factures clients.'));
          this.success.set(null);
        }
      });
  }

  protected trackByInvoice(index: number, row: InvoiceRow): string {
    const identifier = this.getField(row, ['id', 'invoiceId', 'reference', 'numeroFacture', 'invoiceNumber']);
    return `${identifier || 'row'}-${index}`;
  }

  protected getField(row: InvoiceRow, keys: string[]): string {
    for (const key of keys) {
      const value = row[key];
      const asText = this.toDisplayString(value);
      if (asText) {
        return asText;
      }
    }
    return '-';
  }

  protected getAmountField(row: InvoiceRow): string {
    const amount = this.readNumeric(row, ['totalDue', 'totalAfterTaxes', 'totalTTC', 'amount', 'total']);
    if (amount === null) {
      return '-';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount);
  }

  protected getDateField(row: InvoiceRow): string {
    const raw = this.getField(row, ['date', 'invoiceDate', 'createdAt', 'updatedAt']);
    if (raw === '-') {
      return raw;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return parsed.toLocaleString();
  }

  protected getTypeLabel(row: InvoiceRow): string {
    const subtype = this.getField(row, ['subtype']);
    if (subtype !== '-' && subtype.toLowerCase() === 'normal') {
      return 'Vente';
    }
    return 'Avoir';
  }

  protected isSaleInvoice(row: InvoiceRow): boolean {
    return this.getTypeLabel(row) === 'Vente';
  }

  protected hasExistingCreditNote(row: InvoiceRow): boolean {
    const raw = row['hasCreditNote'];
    if (typeof raw === 'boolean') {
      return raw;
    }
    if (typeof raw === 'string') {
      return raw.toLowerCase() === 'true';
    }
    return false;
  }

  protected getCreditNoteDownloadUrl(row: InvoiceRow): string {
    const token = this.toDisplayString(row['creditNoteToken']);
    if (!token) {
      return '';
    }
    return this.invoiceService.getVerificationUrl(token);
  }

  protected getInvoiceDownloadUrl(row: InvoiceRow): string {
    const token = this.toDisplayString(row['token']);
    if (!token) {
      return '';
    }
    if (/^https?:\/\//i.test(token)) {
      return token;
    }
    return this.invoiceService.getVerificationUrl(token);
  }

  protected makeCreditNote(row: InvoiceRow): void {
    if (!this.isSaleInvoice(row) || this.hasExistingCreditNote(row)) {
      return;
    }

    const invoiceId = this.getField(row, ['id', 'invoiceId']);
    if (!invoiceId || invoiceId === '-') {
      this.error.set('ID de facture introuvable pour creer un avoir.');
      return;
    }

    if (!this.hasFacturierRole()) {
      return;
    }

    this.router.navigate(['/factures-certifiees', invoiceId, 'avoir']);
  }

  protected hasFacturierRole(): boolean {
    const authorities = this.authService.getCurrentAuthorities();
    return authorities.includes('FACTURIER');
  }

  private extractRows(payload: unknown): InvoiceRow[] {
    const directArray = this.asInvoiceRows(payload);
    if (directArray.length > 0) {
      return directArray;
    }

    const root = this.toRecord(payload);
    if (!root) {
      return [];
    }

    const keys = ['data', 'items', 'invoices', 'rows', 'results'];
    for (const key of keys) {
      const nestedRows = this.asInvoiceRows(root[key]);
      if (nestedRows.length > 0) {
        return nestedRows;
      }

      const nestedObj = this.toRecord(root[key]);
      if (nestedObj) {
        for (const secondKey of keys) {
          const secondRows = this.asInvoiceRows(nestedObj[secondKey]);
          if (secondRows.length > 0) {
            return secondRows;
          }
        }
      }
    }

    return [];
  }

  private asInvoiceRows(value: unknown): InvoiceRow[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => this.toRecord(entry))
      .filter((entry): entry is InvoiceRow => entry !== null);
  }

  private buildQuery(): FneClientInvoicesQuery {
    return {
      page: this.page(),
      perPage: this.perPage(),
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      sortBy: this.sortBy(),
      listing: this.listing(),
      complete: this.complete()
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private toDisplayString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private readNumeric(value: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        const normalized = candidate.replace(/\s/g, '').replace(',', '.');
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const record = this.toRecord(error);
    if (!record) {
      return fallback;
    }

    const direct = this.toDisplayString(record['message']);
    if (direct) {
      return direct;
    }

    const nested = this.toRecord(record['error']);
    if (nested) {
      const nestedMessage = this.toDisplayString(nested['message']);
      if (nestedMessage) {
        return nestedMessage;
      }
      const nestedReason = this.toDisplayString(nested['reason']);
      if (nestedReason) {
        return nestedReason;
      }
    }

    return fallback;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(value: Date, days: number): Date {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
