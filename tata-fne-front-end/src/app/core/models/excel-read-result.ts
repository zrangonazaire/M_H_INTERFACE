export interface ExcelReadResult {
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
}
