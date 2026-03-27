import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import {
  UserActionAuditLog,
  UserActionAuditQueryResult
} from '../models/user-action-audit-log';

export interface UserActionAuditFilters {
  page?: number;
  size?: number;
  search?: string;
  module?: string;
  httpMethod?: string;
  result?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable({ providedIn: 'root' })
export class UserActionAuditService {
  private readonly baseUrl = `${environment.apiBaseUrl}/audit-logs`;

  constructor(private readonly http: HttpClient) {}

  getAuditLogs(filters: UserActionAuditFilters = {}): Observable<UserActionAuditQueryResult> {
    let params = new HttpParams()
      .set('page', filters.page ?? 0)
      .set('size', filters.size ?? 10);

    params = this.appendParam(params, 'search', filters.search);
    params = this.appendParam(params, 'module', filters.module);
    params = this.appendParam(params, 'httpMethod', filters.httpMethod);
    params = this.appendParam(params, 'result', filters.result);
    params = this.appendParam(params, 'fromDate', filters.fromDate);
    params = this.appendParam(params, 'toDate', filters.toDate);

    return this.http
      .get<
        ApiResponse<{
          auditLogs: UserActionAuditLog[];
          currentPage: number;
          totalItems: number;
          totalPages: number;
        }>
      >(this.baseUrl, { params })
      .pipe(
        map((response) => ({
          auditLogs: response.data.auditLogs,
          currentPage: response.data.currentPage,
          totalItems: response.data.totalItems,
          totalPages: response.data.totalPages
        }))
      );
  }

  getModules(): Observable<string[]> {
    return this.http
      .get<ApiResponse<{ modules: string[] }>>(`${this.baseUrl}/modules`)
      .pipe(map((response) => response.data.modules));
  }

  private appendParam(params: HttpParams, key: string, value?: string): HttpParams {
    if (!value || !value.trim()) {
      return params;
    }

    return params.set(key, value.trim());
  }
}
