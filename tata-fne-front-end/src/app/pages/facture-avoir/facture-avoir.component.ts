import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CertifiedInvoice, ItemDto } from '../../core/models/certified-invoice';
import { RefundInvoiceDTO, RefundItemDTO } from '../../core/models/refund-invoice.dto';
import { FneInvoiceService } from '../../core/services/fne-invoice.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { AttributionService } from '../../core/services/attribution.service';

@Component({
  selector: 'app-facture-avoir',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './facture-avoir.component.html',
  styleUrl: './facture-avoir.component.scss'
})
export class FactureAvoirComponent implements OnInit {
  protected readonly userFullName = signal('Compte');
  protected readonly invoice = signal<CertifiedInvoice | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly invoiceService: FneInvoiceService,
    private readonly authService: AuthenticationService,
    private readonly attributionService: AttributionService
  ) {
    this.userFullName.set(this.authService.getCurrentFullName() ?? 'Compte');
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
    
    // Charger la facture par ID
    this.invoiceService.getCertifiedInvoices().subscribe({
      next: (data) => {
        const invoice = data.find(inv => inv.id === invoiceId);
        if (invoice) {
          // Ajouter la propriété creditQuantity à chaque item pour le suivi de l'avoir
          const invoiceWithCredit = {
            ...invoice,
            items: invoice.items?.map(item => ({
              ...item,
              creditQuantity: item.quantity // Par défaut, tout avoir
            }))
          };
          this.invoice.set(invoiceWithCredit);
        } else {
          this.error.set('Facture non trouvée.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Impossible de charger la facture.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  protected updateCreditQuantity(item: ItemDto, value: string): void {
    const quantity = parseInt(value, 10);
    if (isNaN(quantity) || quantity < 0) return;

    const currentInvoice = this.invoice();
    if (!currentInvoice || !currentInvoice.items) return;

    const updatedItems = currentInvoice.items.map(i => 
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

    // Créer le DTO pour l'appel API
    const refundDto: RefundInvoiceDTO = {
      invoiceId: invoice.id,
      items: invoice.items.map(item => ({
        id: item.id,
        quantity: item.creditQuantity || 0
      }))
    };

    // Afficher les valeurs envoyées dans la console
    console.log('Données envoyées à l\'API:', {
      invoiceId: refundDto.invoiceId,
      items: refundDto.items.map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
      totalAmount: this.creditTotal()
    });

    // Appeler l'API backend
    this.invoiceService.createRefund(refundDto).subscribe({
      next: (response) => {
        console.log('Avoir créé avec succès:', response);
        alert('Avoir créé avec succès pour un montant de ' + this.formatMoney(this.creditTotal()));
        // Optionnel : rediriger vers la liste des factures après succès
        this.router.navigate(['/factures-certifiees']);
      },
      error: (err) => {
        console.error('Erreur lors de la création de l\'avoir:', err);
        const errorMessage = err?.error?.message || 'Erreur lors de la création de l\'avoir';
        alert(errorMessage);
      }
    });
  }

  protected createCreditNoteForItem(item: ItemDto): void {
    const invoice = this.invoice();
    if (!invoice) return;

    // Logique de création de l'avoir pour un item spécifique
    console.log('Création de l\'avoir pour le produit:', item.description);
    console.log('Détails de l\'avoir:', {
      invoiceId: invoice.id,
      productId: item.id,
      quantity: item.creditQuantity,
      amount: (item.amount / (item.quantity || 1)) * (item.creditQuantity || 0)
    });

    // Pour l'instant, on affiche un message de confirmation
    alert('Avoir créé avec succès pour le produit ' + (item.description || 'inconnu') + ' pour un montant de ' + this.formatMoney((item.amount / (item.quantity || 1)) * (item.creditQuantity || 0)));
  }

  protected resetQuantities(): void {
    const currentInvoice = this.invoice();
    if (!currentInvoice || !currentInvoice.items) return;

    const resetItems = currentInvoice.items.map(item => ({
      ...item,
      creditQuantity: item.quantity // Réinitialiser à la quantité totale
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
