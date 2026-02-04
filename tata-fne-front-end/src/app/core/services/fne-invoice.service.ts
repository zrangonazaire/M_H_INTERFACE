import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InvoiceCertificationResponse } from '../models/invoice-certification-response';
import { NonCertifiedInvoice } from '../models/non-certified-invoice';
import { CertifiedInvoice } from '../models/certified-invoice';
import { InvoiceSignRequest } from '../models/invoice-sign-request';
import { RefundInvoiceDTO } from '../models/refund-invoice.dto';
import { VerificationRefundResponse } from '../models/verification-refund-response';

@Injectable({ providedIn: 'root' })
export class FneInvoiceService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getInvoices(): Observable<NonCertifiedInvoice[]> {
    return this.http.get<NonCertifiedInvoice[]>(`${this.baseUrl}/fne/invoices`);
  }

  certifyMass(invoiceIds: number[]): Observable<InvoiceCertificationResponse[]> {
    return this.http.post<InvoiceCertificationResponse[]>(`${this.baseUrl}/fne/invoices/certify-mass`, {
      invoiceIds
    });
  }

  getCertifiedInvoices(): Observable<CertifiedInvoice[]> {
    return this.http.get<CertifiedInvoice[]>(`${this.baseUrl}/new-invoices/all-certified-invoices`);
  }

  certifyFinalFacture(numFacture: string, utilisateur: string, payload: InvoiceSignRequest): Observable<void> {
    // Nettoyer la payload pour éviter d'envoyer des propriétés undefined/null
    const cleanedPayload = this.cleanPayload(payload);
    console.log('Payload before cleaning:', payload);
    console.log('Payload after cleaning:', cleanedPayload);
    return this.http.post<void>(`${this.baseUrl}/new-invoices/certify-final-facture/${numFacture}/${utilisateur}`, cleanedPayload);
  }

  private cleanPayload(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanPayload(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Toujours supprimer customTaxes quelle que soit sa valeur
        if (key === 'customTaxes') continue;
        
        // Toujours supprimer foreignCurrencyRate quelle que soit sa valeur
        if (key === 'foreignCurrencyRate') continue;
        
        const cleanedValue = this.cleanPayload(value);
        // Garder les chaînes vides (""), ne supprimer que undefined/null
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    
    return obj;
  }

  // Retourne une URL probable pour télécharger la facture certifiée (backend doit exposer cet endpoint)
  getDownloadUrl(numFacture: string): string {
    return `${this.baseUrl}/new-invoices/download/${encodeURIComponent(numFacture)}`;
  }

  getByNumero(numeroFacture: string) {
    return this.http.get<CertifiedInvoice[]>(`${this.baseUrl}/new-invoices/by-numero?numeroFacture=${encodeURIComponent(numeroFacture)}`);
  }

  getVerificationUrl(token: string): string {
    if (!token) return '';

    // Si le token est déjà une URL décodée ou encodée (http://... ou http%3A%2F%2F...), retourner l'URL décodée
    try {
      const decoded = decodeURIComponent(token);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    } catch (e) {
      // ignore
    }

    if (/^https?:\/\//i.test(token)) return token;

    try {
      const u = new URL(this.baseUrl);
      u.pathname = `/fr/verification/${encodeURIComponent(token)}`;
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch (e) {
      return `/fr/verification/${encodeURIComponent(token)}`;
    }
  }

  createRefund(refundDto: RefundInvoiceDTO): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/new-invoices/refund-invoice`, refundDto);
  }

  getRefunds(): Observable<VerificationRefundResponse[]> {
    return this.http.get<VerificationRefundResponse[]>(`${this.baseUrl}/new-invoices/list-facture-avoir`);
  }

  getRefundsByInvoice(invoiceId: string): Observable<VerificationRefundResponse[]> {
    return this.http.get<VerificationRefundResponse[]>(`${this.baseUrl}/new-invoices/invoice/${invoiceId}`);
  }
}
