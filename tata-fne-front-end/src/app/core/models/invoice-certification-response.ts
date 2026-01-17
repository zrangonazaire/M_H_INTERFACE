export interface InvoiceCertificationResponse {
  ncc: string | null;
  reference: string | null;
  token: string | null;
  warning: boolean;
  balance_sticker: number;
  invoice: unknown;
}
