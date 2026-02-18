export interface VerificationRefundResponse {
  id: string | number;
  invoiceId: string;
  invoiceType?: string;
  numeroFactureInterne?: string;
  utilisateurCreateur?: string;
  reference: string;
  date?: string;
  createdAt?: string;
  totalTTC?: number;
  totalHorsTaxes?: number;
  totalTaxes?: number;
  token?: string;
  ncc?: string;
  warning?: boolean;
  balanceSticker?: number;
  items?: RefundItemResponse[];
}

export interface RefundItemResponse {
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
}
