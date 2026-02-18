export interface CertifiedInvoice {
  id: string;
  invoiceType: string;
  numeroFactureInterne: string;
  utilisateurCreateur: string;
  reference: string;
  date: string;
  totalTTC: number;
  totalHorsTaxes: number;
  totalTaxes: number;
  balanceFunds?: number;
  token: string;
  items?: ItemDto[];
}

export interface ItemDto {
  id: string;
  quantity?: number;
  reference?: string;
  description?: string;
  amount: number;
  discount?: number;
  measurementUnit?: string;
  createdAt?: string;
  updatedAt?: string;
  invoiceId?: string;
  parentId?: string;
  creditQuantity?: number;
}
