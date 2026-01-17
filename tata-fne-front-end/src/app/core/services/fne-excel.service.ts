import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ExcelImportResult } from '../models/excel-import-result';
import { ExcelReadResult } from '../models/excel-read-result';

@Injectable({ providedIn: 'root' })
export class FneExcelService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  readExcel(file: File): Observable<ExcelReadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExcelReadResult>(`${this.baseUrl}/fne/excel/read`, formData);
  }

  importExcel(file: File): Observable<ExcelImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExcelImportResult>(`${this.baseUrl}/fne/excel/import`, formData);
  }
}
