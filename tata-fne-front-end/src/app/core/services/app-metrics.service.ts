import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type AppMetricsOverview = {
  status: string;
  collectedAt: string;
  http: {
    windowSeconds: number;
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    avgResponseTimeMs: number;
    maxResponseTimeMs: number;
    successRatePct: number;
    errorRatePct: number;
  };
  system: {
    cpuUsagePct: number | null;
    jvmMemoryUsagePct: number | null;
    jvmUsedBytes: number;
    jvmMaxBytes: number;
    dbStatus: string;
    dbValidationTimeMs: number | null;
    dbSizeBytes: number | null;
    dbActiveConnections: number | null;
    dbMaxConnections: number | null;
    dbUsagePct: number | null;
  };
  fneInvoices: {
    total: number;
    certified: number;
    pending: number;
    cancelled: number;
    certifiedRatePct: number;
  };
  audit: {
    totalActions: number;
    successActions: number;
    errorActions: number;
  };
};

@Injectable({ providedIn: 'root' })
export class AppMetricsService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<AppMetricsOverview> {
    return this.http.get<AppMetricsOverview>(`${this.baseUrl}/metrics/overview`);
  }
}
