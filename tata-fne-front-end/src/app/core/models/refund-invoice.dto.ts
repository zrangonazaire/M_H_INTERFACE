export interface RefundInvoiceDTO {
  invoiceId: string;
  items: RefundItemDTO[];
}

export interface RefundItemDTO {
  id: string;
  quantity: number;
}
