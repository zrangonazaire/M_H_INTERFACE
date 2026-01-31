import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface Attribution {
  id: number;
  userId: number;
  functionalityId: number;
  lecture: boolean;
  writing: boolean;
  modification: boolean;
  deletion: boolean;
  impression: boolean;
  validation: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AttributionService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getAttributions(): Observable<Attribution[]> {
    return this.http
      .get<ApiResponse<{ attributions: Attribution[] }>>(`${this.baseUrl}/attributions`)
      .pipe(map((response) => response.data.attributions));
  }

  getAttributionsPaginated(page: number, size: number): Observable<{ attributions: Attribution[], currentPage: number, totalItems: number, totalPages: number }> {
    return this.http
      .get<ApiResponse<{ attributions: Attribution[], currentPage: number, totalItems: number, totalPages: number }>>(
        `${this.baseUrl}/attributions/paginated?page=${page}&size=${size}`
      )
      .pipe(map((response) => response.data));
  }

  getAttributionById(id: number): Observable<Attribution> {
    return this.http
      .get<ApiResponse<{ attribution: Attribution }>>(`${this.baseUrl}/attributions/${id}`)
      .pipe(map((response) => response.data.attribution));
  }

  createAttribution(attribution: Omit<Attribution, 'id'>): Observable<Attribution> {
    return this.http
      .post<ApiResponse<{ attribution: Attribution }>>(`${this.baseUrl}/attributions`, attribution)
      .pipe(map((response) => response.data.attribution));
  }

  updateAttribution(id: number, attribution: Partial<Attribution>): Observable<Attribution> {
    return this.http
      .put<ApiResponse<{ attribution: Attribution }>>(`${this.baseUrl}/attributions/${id}`, attribution)
      .pipe(map((response) => response.data.attribution));
  }

  deleteAttribution(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<{ attribution: Attribution }>>(`${this.baseUrl}/attributions/${id}`)
      .pipe(map(() => {}));
  }

  checkRoleExist(userId: number, roleId: number): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ exists: boolean }>>(`${this.baseUrl}/users/${userId}/roles/${roleId}/checkroleexist`)
      .pipe(map((response) => response.data.exists));
  }
}
