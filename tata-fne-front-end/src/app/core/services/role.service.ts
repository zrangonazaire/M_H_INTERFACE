import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Role } from '../models/role';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http
      .get<ApiResponse<{ roles: Role[] }>>(`${this.baseUrl}/roles`)
      .pipe(map((response) => response.data.roles));
  }
}
