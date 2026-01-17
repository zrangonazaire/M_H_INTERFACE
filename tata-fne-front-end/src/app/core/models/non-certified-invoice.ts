export interface NonCertifiedInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  clientCompanyName: string | null;
  clientNcc: string | null;
  invoiceType: string | null;
  paymentMethod: string | null;
  factureCertifStatus: string | null;
  dateDeModification: string | null;
  source?: 'api' | 'excel';
}
