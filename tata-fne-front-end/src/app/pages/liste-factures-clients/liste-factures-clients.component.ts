import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';
import {
  FneClientInvoicesQuery,
  FneInvoiceService,
  FneStoredLoginResponse,
  FneInvoiceSyncResult
} from '../../core/services/fne-invoice.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

type InvoiceRow = Record<string, unknown>;
type InvoiceStatus = 'a_certifier' | 'en_attente' | 'rejete' | 'certifie' | 'inconnu';

@Component({
  selector: 'app-liste-factures-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuGauche],
  templateUrl: './liste-factures-clients.component.html',
  styleUrl: './liste-factures-clients.component.scss'
})
export class ListeFacturesClientsComponent {
  private readonly fneUsernameStorageKey = 'tata_fne_external_username';
  private readonly invoiceAmountKeys = ['totalDue', 'totalAfterTaxes', 'totalTTC', 'amount', 'total'];

  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');

  protected readonly fneUsername = signal(localStorage.getItem(this.fneUsernameStorageKey) ?? '');
  protected readonly fnePassword = signal('');
  protected readonly fneLogin = signal<FneStoredLoginResponse | null>(null);
  protected readonly isFneAuthenticated = computed(() => this.fneLogin() !== null);

  protected readonly page = signal(1);
  protected readonly perPage = signal(12);
  protected readonly fromDate = signal('2025-12-01');
  protected readonly toDate = signal(this.toDateInputValue(new Date()));
  protected readonly sortBy = signal('-date');
  protected readonly listing = signal<'issued' | 'received'>('issued');
  protected readonly complete = signal(true);

  protected readonly query = signal('');
  protected readonly statusFilter = signal<'all' | InvoiceStatus>('all');
  private quickSearchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected readonly isConnecting = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isExportingAll = signal(false);
  protected readonly navigatingToCreditNoteId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly rawResponse = signal<FneInvoiceSyncResult | null>(null);
  protected readonly invoices = signal<InvoiceRow[]>([]);

  protected readonly listingOptions: Array<'issued' | 'received'> = ['issued', 'received'];
  protected readonly tablePageSizeOptions = [10, 25, 50, 100];
  protected readonly totalItems = computed(() => this.rawResponse()?.total ?? this.invoices().length);
  protected readonly currentTablePage = computed(() => this.rawResponse()?.page ?? this.page());
  protected readonly currentTablePageSize = computed(() => this.rawResponse()?.perPage ?? this.perPage());
  protected readonly totalTablePages = computed(() => {
    const pageSize = Math.max(1, this.currentTablePageSize());
    return Math.max(1, Math.ceil(this.totalItems() / pageSize));
  });
  protected readonly paginatedInvoices = computed(() => this.invoices());
  protected readonly tableStartIndex = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 0;
    }
    const page = Math.min(Math.max(this.currentTablePage(), 1), this.totalTablePages());
    return (page - 1) * this.currentTablePageSize() + 1;
  });
  protected readonly tableEndIndex = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 0;
    }
    return Math.min(this.tableStartIndex() + this.currentTablePageSize() - 1, total);
  });

  constructor(
    private readonly authService: AuthenticationService,
    private readonly invoiceService: FneInvoiceService,
    private readonly router: Router
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
    this.loadInvoicesFromDatabase();
  }

  protected onFneUsernameChange(value: string): void {
    const next = value ?? '';
    const trimmed = next.trim();
    this.fneUsername.set(next);

    const currentLogin = this.fneLogin();
    if (currentLogin && currentLogin.username !== trimmed) {
      this.fneLogin.set(null);
    }
  }

  protected onQuickSearchChange(value: string): void {
    this.query.set(value ?? '');
    this.page.set(1);

    if (this.quickSearchDebounceHandle) {
      clearTimeout(this.quickSearchDebounceHandle);
    }

    this.quickSearchDebounceHandle = setTimeout(() => {
      this.loadInvoicesFromDatabase();
    }, 350);
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set((value as 'all' | InvoiceStatus) ?? 'all');
    this.page.set(1);
    this.loadInvoicesFromDatabase();
  }

  protected connectToFne(): void {
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
          this.fneUsername.set(username);
          localStorage.setItem(this.fneUsernameStorageKey, username);
          this.fneLogin.set(res);
          this.success.set(res.message || 'Connexion FNE reussie.');
        },
        error: (err) => {
          this.error.set(this.extractErrorMessage(err, 'Connexion FNE impossible.'));
          this.success.set(null);
        }
      });
  }

  protected syncInvoicesFromFne(): void {
    const login = this.fneLogin();
    if (!login) {
      this.error.set("Veuillez d'abord vous connecter a la FNE pour recuperer le token.");
      this.success.set(null);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.invoiceService.syncClientInvoices(this.buildQuery(), login.username)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.rawResponse.set(response);
          this.syncQueryStateFromResponse(response);
          const rows = this.extractRows(response.data);
          this.setInvoices(rows);
          this.success.set(
            `${rows.length} facture(s) synchronisee(s). `
            + `Sauvegardees: ${response.savedCount}, Creees: ${response.createdCount}, Mises a jour: ${response.updatedCount}.`
          );
        },
        error: (err) => {
          this.setInvoices([]);
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
          this.syncQueryStateFromResponse(response);
          const rows = this.extractRows(response.data);
          const total = Number.isFinite(response.total) && response.total > 0 ? response.total : rows.length;
          this.setInvoices(rows);
          this.success.set(`${rows.length} facture(s) affichee(s) sur ${total} facture(s) total(es) depuis la base locale.`);
        },
        error: (err) => {
          this.setInvoices([]);
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
    const amount = this.readNumeric(row, this.invoiceAmountKeys);
    if (amount === null) {
      return '-';
    }
    const displayAmount = this.isSaleInvoice(row) ? amount : Math.abs(amount);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(displayAmount);
  }

  protected goToPreviousTablePage(): void {
    const currentPage = this.currentTablePage();
    if (currentPage <= 1) {
      return;
    }
    this.page.set(currentPage - 1);
    this.reloadCurrentTablePage();
  }

  protected goToNextTablePage(): void {
    const currentPage = this.currentTablePage();
    if (currentPage >= this.totalTablePages()) {
      return;
    }
    this.page.set(currentPage + 1);
    this.reloadCurrentTablePage();
  }

  protected onTablePageSizeChange(value: string | number): void {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) {
      return;
    }
    this.perPage.set(next);
    this.page.set(1);
    this.reloadCurrentTablePage();
  }

  protected onListingChange(value: string): void {
    const normalized = this.normalizeListingValue(value);
    if (this.listing() === normalized) {
      return;
    }
    this.listing.set(normalized);
    this.page.set(1);
    this.loadInvoicesFromDatabase();
  }

  protected exportInvoicesToExcel(): void {
    const rows = this.paginatedInvoices();
    if (rows.length === 0) {
      this.error.set('Aucune donnee a exporter.');
      this.success.set(null);
      return;
    }

    this.error.set(null);
    this.exportRowsToExcel(rows, 'factures-clients');
    this.success.set(`${rows.length} ligne(s) exportee(s) vers Excel.`);
  }

  protected async exportAllInvoicesToExcel(): Promise<void> {
    if (this.isExportingAll()) {
      return;
    }
    if (this.totalItems() === 0) {
      this.error.set('Aucune donnee a exporter.');
      this.success.set(null);
      return;
    }

    this.isExportingAll.set(true);
    this.error.set(null);

    try {
      const exportPageSize = 100;
      const baseQuery = this.buildQuery();
      const firstPage = await firstValueFrom(
        this.invoiceService.getClientInvoices({
          ...baseQuery,
          page: 1,
          perPage: exportPageSize
        })
      );

      const rows: InvoiceRow[] = this.extractRows(firstPage.data);
      const total = Number.isFinite(firstPage.total) && firstPage.total > 0 ? firstPage.total : rows.length;
      const totalPages = Math.max(1, Math.ceil(total / exportPageSize));

      for (let pageIndex = 2; pageIndex <= totalPages; pageIndex++) {
        const pageResult = await firstValueFrom(
          this.invoiceService.getClientInvoices({
            ...baseQuery,
            page: pageIndex,
            perPage: exportPageSize
          })
        );
        rows.push(...this.extractRows(pageResult.data));
      }

      if (rows.length === 0) {
        this.error.set('Aucune donnee a exporter.');
        this.success.set(null);
        return;
      }

      this.exportRowsToExcel(rows, 'factures-clients-toutes-pages');
      this.success.set(`${rows.length} ligne(s) exportee(s) vers Excel (toutes les pages).`);
    } catch (err) {
      this.error.set(this.extractErrorMessage(err, 'Impossible d exporter toutes les donnees vers Excel.'));
      this.success.set(null);
    } finally {
      this.isExportingAll.set(false);
    }
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
    if (this.navigatingToCreditNoteId() !== null) {
      return;
    }

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

    this.navigatingToCreditNoteId.set(invoiceId);
    this.router.navigate(['/factures-certifiees', invoiceId, 'avoir'])
      .finally(() => this.navigatingToCreditNoteId.set(null));
  }

  protected hasFacturierRole(): boolean {
    const authorities = this.authService.getCurrentAuthorities();
    return authorities.includes('FACTURIER');
  }

  private setInvoices(rows: InvoiceRow[]): void {
    this.invoices.set(rows);
  }

  private reloadCurrentTablePage(): void {
    this.loadInvoicesFromDatabase();
  }

  private syncQueryStateFromResponse(response: FneInvoiceSyncResult): void {
    if (Number.isFinite(response.page) && response.page > 0) {
      this.page.set(response.page);
    }
    if (Number.isFinite(response.perPage) && response.perPage > 0) {
      this.perPage.set(response.perPage);
    }
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
      listing: this.normalizeListingValue(this.listing()),
      complete: this.complete(),
      query: this.query(),
      status: this.statusFilter()
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

  private normalizeListingValue(value: string | null | undefined): 'issued' | 'received' {
    const normalized = (value ?? '').toLowerCase().trim();
    if (
      normalized === 'received'
      || normalized === 'fournisseurs'
      || normalized === 'fournisseur'
      || normalized === 'supplier'
      || normalized === 'suppliers'
    ) {
      return 'received';
    }
    return 'issued';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private exportRowsToExcel(rows: InvoiceRow[], filePrefix: string): void {
    const headers = ['Reference', 'Date', 'Type', 'Client', 'Montant', 'Token'];
    const lines = rows.map((row) => {
      const amount = this.readNumeric(row, this.invoiceAmountKeys);
      const displayAmount = amount === null ? '' : (this.isSaleInvoice(row) ? amount : Math.abs(amount));
      return [
        this.getField(row, ['reference', 'invoiceNumber', 'numeroFacture']),
        this.getDateField(row),
        this.getTypeLabel(row),
        this.getField(row, ['clientCompanyName', 'clientMerchantName', 'customerName', 'client']),
        displayAmount === '' ? '' : String(displayAmount),
        this.getInvoiceDownloadUrl(row)
      ];
    });

    const tableHeader = headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('');
    const tableRows = lines
      .map((line) => `<tr>${line.map((value) => `<td>${this.escapeHtml(value)}</td>`).join('')}</tr>`)
      .join('');
    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table>
            <thead><tr>${tableHeader}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filePrefix}-${this.buildExportTimestamp()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private buildExportTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    const hours = `${now.getHours()}`.padStart(2, '0');
    const minutes = `${now.getMinutes()}`.padStart(2, '0');
    const seconds = `${now.getSeconds()}`.padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
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
