export interface ExcelImportResult {
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}
