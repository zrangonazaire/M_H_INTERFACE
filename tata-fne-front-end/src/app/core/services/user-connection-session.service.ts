import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserConnectionSession } from '../models/user-connection-session';

@Injectable({ providedIn: 'root' })
export class UserConnectionSessionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/user-sessions`;

  constructor(private readonly http: HttpClient) {}

  getRecentSessions(limit = 20): Observable<UserConnectionSession[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<UserConnectionSession[]>(this.baseUrl, { params });
  }
}
