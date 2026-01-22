export interface InvoiceItem {
  taxes?: string[];
  customTaxes?: Array<{ name: string; amount: number }>;
  reference?: string;
  description?: string;
  quantity?: number;
  amount?: number;
  discount?: number;
  measurementUnit?: string;
}

export interface InvoiceSignRequest {
  invoiceType?: string;
  paymentMethod?: string;
  template?: string;
  numeroFacture?: string;
  clientNcc?: string;
  clientCompanyName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientSellerName?: string;
  pointOfSale?: string;
  establishment?: string;
  commercialMessage?: string;
  footer?: string;
  foreignCurrency?: string;
  foreignCurrencyRate?: number;
  items?: InvoiceItem[];
  customTaxes?: Array<{ name: string; amount: number }>;
  discount?: number;
}
