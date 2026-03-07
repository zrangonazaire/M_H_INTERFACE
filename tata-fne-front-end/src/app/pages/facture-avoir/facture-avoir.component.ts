import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CertifiedInvoice, ItemDto } from '../../core/models/certified-invoice';
import { RefundInvoiceDTO } from '../../core/models/refund-invoice.dto';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';
import { NotificationService } from '../../core/services/notification.service';
import { MenuGauche } from '../menu-gauche/menu-gauche';

@Component({
  selector: 'app-facture-avoir',
  standalone: true,
  imports: [CommonModule, RouterModule, MenuGauche],
  templateUrl: './facture-avoir.component.html',
  styleUrl: './facture-avoir.component.scss'
})
export class FactureAvoirComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly userPdv = signal('Compte');
  protected readonly userEtab = signal('Compte');
  protected readonly invoice = signal<CertifiedInvoice | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly attributionService: AttributionService,
    private readonly notificationService: NotificationService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
    this.userPdv.set(this.authService.getCurrentPdv() ?? 'Compte');
    this.userEtab.set(this.authService.getCurrentEtabFNE() ?? 'Compte');
  }

  ngOnInit(): void {
    this.loadInvoice();
  }

  protected loadInvoice(): void {
    const invoiceId = this.route.snapshot.paramMap.get('id');
    if (!invoiceId) {
      this.error.set('Aucun ID de facture fourni.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // 1) Try certified invoices first (existing behavior).
    this.invoiceService.getCertifiedInvoices().subscribe({
      next: (data) => {
        const invoice = data.find((inv) => inv.id === invoiceId);
        if (invoice) {
          this.invoice.set(this.withDefaultCreditQuantities(invoice));
          this.loading.set(false);
          return;
        }

        // 2) Fallback for IDs coming from liste-factures-clients.
        this.loadClientInvoice(invoiceId);
      },
      error: () => {
        // If certified endpoint fails, still try client invoice endpoint.
        this.loadClientInvoice(invoiceId);
      }
    });
  }

  protected updateCreditQuantity(item: ItemDto, value: string): void {
    const quantity = parseInt(value, 10);
    if (Number.isNaN(quantity) || quantity < 0) return;

    const currentInvoice = this.invoice();
    if (!currentInvoice || !currentInvoice.items) return;

    const updatedItems = currentInvoice.items.map((i) =>
      i.id === item.id
        ? { ...i, creditQuantity: Math.min(quantity, i.quantity || 0) }
        : i
    );

    this.invoice.set({
      ...currentInvoice,
      items: updatedItems
    });
  }

  protected creditTotal(): number {
    const invoice = this.invoice();
    if (!invoice || !invoice.items) return 0;

    return invoice.items.reduce((total, item) => {
      const unitPrice = item.amount / (item.quantity || 1);
      return total + (unitPrice * (item.creditQuantity || 0));
    }, 0);
  }

  protected createCreditNote(): void {
    const invoice = this.invoice();
    if (!invoice || !invoice.items) return;

    const refundDto: RefundInvoiceDTO = {
      invoiceId: invoice.id,
      items: invoice.items.map((item) => ({
        id: item.id,
        quantity: item.creditQuantity || 0
      }))
    };

    console.log('Donnees envoyees a l API:', {
      invoiceId: refundDto.invoiceId,
      items: refundDto.items.map((item) => ({
        id: item.id,
        quantity: item.quantity
      })),
      totalAmount: this.creditTotal()
    });

    this.invoiceService.createRefund(refundDto).subscribe({
      next: (response) => {
        console.log('Avoir cree avec succes:', response);
        this.notificationService.success(`Avoir cree avec succes pour un montant de ${this.formatMoney(this.creditTotal())}`);
        this.router.navigate(['/factures-certifiees']);
      },
      error: (err) => {
        console.error('Erreur lors de la creation de l avoir:', err);
        const errorMessage = err?.error?.message || 'Erreur lors de la creation de l avoir';
        this.notificationService.error(errorMessage);
      }
    });
  }

  protected createCreditNoteForItem(item: ItemDto): void {
    const invoice = this.invoice();
    if (!invoice) return;

    console.log('Creation de l avoir pour le produit:', item.description);
    console.log('Details de l avoir:', {
      invoiceId: invoice.id,
      productId: item.id,
      quantity: item.creditQuantity,
      amount: (item.amount / (item.quantity || 1)) * (item.creditQuantity || 0)
    });

    this.notificationService.success(
      `Avoir cree avec succes pour le produit ${item.description || 'inconnu'} pour un montant de ${this.formatMoney((item.amount / (item.quantity || 1)) * (item.creditQuantity || 0))}`
    );
  }

  protected resetQuantities(): void {
    const currentInvoice = this.invoice();
    if (!currentInvoice || !currentInvoice.items) return;

    const resetItems = currentInvoice.items.map((item) => ({
      ...item,
      creditQuantity: item.quantity
    }));

    this.invoice.set({
      ...currentInvoice,
      items: resetItems
    });
  }

  protected backToInvoices(): void {
    this.router.navigate(['/factures-certifiees']);
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
        this.notificationService.warning('Vous n avez pas le droit sur cette fonctionnalite');
        return;
      }

      this.router.navigate(['/parametres']);
    } catch (error) {
      console.error('Erreur lors de la verification des droits:', error);
      this.notificationService.error('Erreur lors de la verification des droits');
    }
  }

  private loadClientInvoice(invoiceId: string): void {
    this.invoiceService.getClientInvoiceById(invoiceId).subscribe({
      next: (rawInvoice) => {
        const mapped = this.mapClientInvoiceToCertified(invoiceId, rawInvoice);
        if (!mapped) {
          this.invoice.set(null);
          this.error.set('Facture non trouvee.');
          this.loading.set(false);
          return;
        }

        this.invoice.set(this.withDefaultCreditQuantities(mapped));
        this.error.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger la facture.';
        this.invoice.set(null);
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  private withDefaultCreditQuantities(invoice: CertifiedInvoice): CertifiedInvoice {
    return {
      ...invoice,
      items: invoice.items?.map((item) => ({
        ...item,
        creditQuantity: item.quantity ?? 0
      }))
    };
  }

  private mapClientInvoiceToCertified(
    fallbackInvoiceId: string,
    source: Record<string, unknown>
  ): CertifiedInvoice | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const id = this.readString(source, ['id', 'invoiceId']) || fallbackInvoiceId;
    const subtype = this.readString(source, ['subtype']).toLowerCase();
    const invoiceType = subtype === 'normal' ? 'sale' : 'refund';

    const totalTTC = this.readNumber(source, ['totalTTC', 'totalAfterTaxes', 'totalDue', 'amount', 'total']) ?? 0;
    const totalHorsTaxes = this.readNumber(source, ['totalHorsTaxes', 'totalHT', 'amountWithoutTaxes']) ?? totalTTC;
    const totalTaxes = this.readNumber(source, ['totalTaxes', 'taxes', 'taxAmount']) ?? Math.max(totalTTC - totalHorsTaxes, 0);

    const rawToken = this.readString(source, ['token', 'externalToken']);
    const token = this.normalizeToken(rawToken);

    return {
      id,
      invoiceType,
      numeroFactureInterne: this.readString(source, ['numeroFactureInterne', 'invoiceNumber', 'reference']) || id,
      utilisateurCreateur: this.readString(source, ['utilisateurCreateur', 'createdBy', 'user']) || '-',
      reference: this.readString(source, ['reference', 'invoiceNumber']) || id,
      date: this.readString(source, ['date', 'invoiceDate', 'createdAt', 'updatedAt']) || '',
      totalTTC,
      totalHorsTaxes,
      totalTaxes,
      token,
      items: this.mapClientItems(source['items'])
    };
  }

  private mapClientItems(value: unknown): ItemDto[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry, index) => {
        const item = this.asRecord(entry);
        if (!item) {
          return null;
        }

        return {
          id: this.readString(item, ['id', 'itemId']) || `item-${index + 1}`,
          quantity: this.readNumber(item, ['quantity', 'qty']) ?? 0,
          reference: this.readString(item, ['reference', 'code']) || '',
          description: this.readString(item, ['description', 'label', 'name']) || '',
          amount: this.readNumber(item, ['amount', 'total', 'price', 'totalAmount']) ?? 0
        } as ItemDto;
      })
      .filter((item): item is ItemDto => item !== null);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readString(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }
    return '';
  }

  private readNumber(record: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private normalizeToken(token: string): string {
    if (!token) {
      return '';
    }
    if (/^https?:\/\//i.test(token)) {
      return token;
    }
    return this.invoiceService.getVerificationUrl(token);
  }
}
