import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthenticationResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegistrationRequest,
  ResetPasswordRequest
} from '../models/auth';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly tokenKey = 'tata_fne_token';
  private readonly userEmailKey = 'tata_fne_user_email';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<AuthenticationResponse>(`${this.baseUrl}/authenticate`, payload)
      .pipe(tap((res) => this.setToken(res.token)));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, request);
  }

  register(payload: RegistrationRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/register`, payload);
  }

  activateAccount(token: string): Observable<void> {
    const params = new HttpParams().set('token', token);
    return this.http.get<void>(`${this.baseUrl}/activate-account`, { params });
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, payload);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  setCurrentUserEmail(email: string): void {
    localStorage.setItem(this.userEmailKey, email);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userEmailKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUserEmail(): string | null {
    return localStorage.getItem(this.userEmailKey);
  }

  getCurrentFullName(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.fullName ?? null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  logout(): void {
    this.clearToken();
  }
}
