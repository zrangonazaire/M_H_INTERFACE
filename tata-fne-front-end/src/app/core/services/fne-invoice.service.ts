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
    // Nettoyer la payload pour Ã©viter d'envoyer des propriÃ©tÃ©s undefined/null
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
        // Toujours supprimer foreignCurrencyRate quelle que soit sa valeur
        if (key === 'foreignCurrencyRate') continue;
        
        const cleanedValue = this.cleanPayload(value);
        // Garder les chaÃ®nes vides (""), ne supprimer que undefined/null
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    
    return obj;
  }

  // Retourne une URL probable pour tÃ©lÃ©charger la facture certifiÃ©e (backend doit exposer cet endpoint)
  getDownloadUrl(numFacture: string): string {
    return `${this.baseUrl}/new-invoices/download/${encodeURIComponent(numFacture)}`;
  }

  getByNumero(numeroFacture: string) {
    return this.http.get<CertifiedInvoice[]>(`${this.baseUrl}/new-invoices/by-numero?numeroFacture=${encodeURIComponent(numeroFacture)}`);
  }

  getVerificationUrl(token: string): string {
    if (!token) return '';

    const verificationToken = this.extractVerificationToken(token);
    if (!verificationToken) return '';

    try {
      const u = new URL(this.baseUrl);
      u.pathname = `/fr/verification/${encodeURIComponent(verificationToken)}`;
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch {
      return `/fr/verification/${encodeURIComponent(verificationToken)}`;
    }
  }

  private extractVerificationToken(token: string): string {
    const raw = token.trim();
    if (!raw) return '';

    const decoded = this.safeDecodeURIComponent(raw);
    const candidate = /^https?:\/\//i.test(decoded)
      ? decoded
      : (/^https?:\/\//i.test(raw) ? raw : decoded);

    if (!/^https?:\/\//i.test(candidate)) {
      return decoded;
    }

    try {
      const parsed = new URL(candidate);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const verificationIndex = segments.findIndex((segment) => segment.toLowerCase() === 'verification');

      if (verificationIndex >= 0 && verificationIndex < segments.length - 1) {
        const extracted = segments.slice(verificationIndex + 1).join('/');
        return this.safeDecodeURIComponent(extracted);
      }

      return this.safeDecodeURIComponent(segments[segments.length - 1] ?? '');
    } catch {
      return decoded;
    }
  }

  private safeDecodeURIComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
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

