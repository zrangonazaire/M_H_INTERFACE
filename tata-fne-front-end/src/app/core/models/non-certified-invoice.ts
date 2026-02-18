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
  // Optional fields coming from Excel
  typeClient?: string | null;
  codeClient?: string | null;
  nomClient?: string | null;
  telephoneClient?: string | null;
  emailClient?: string | null;
  refArticle?: string | null;
  designation?: string | null;
  quantite?: string | number | null;
  prixUnitaireHT?: string | number | null;
  codeTaxe?: string | null;
  customTaxes?: Array<{ name: string; amount: number; isRate?: boolean }>;
  unite?: string | null;
  remise?: string | number | null;
  modePaiement?: string | null;
  devise?: string | null;
  tauxChange?: string | number | null;
  commentaire?: string | null;
  clientSellerName?: string | null;
}
