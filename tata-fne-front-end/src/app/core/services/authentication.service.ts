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
  private readonly userIdroleKey = 'tata_fne_user_idrole';
  private readonly userPdvFne = 'tata_fne_UserPdvFne';
  private readonly userEtabFbe = 'tata_fne_UserEtab'
  private readonly userIdKey = 'tata_fne_user_id';
  private readonly userAuthorities = 'tata_fne_user_authorities';

  constructor(private readonly http: HttpClient) { }

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
  setCurrentIdRole(IdRole: string): void {
    localStorage.setItem(this.userIdroleKey, IdRole);
  }
  setCurrentId(Id: string): void {
    localStorage.setItem(this.userIdKey, Id);
  }
  setCurrentPdv(PdvFNE: string): void {
    localStorage.setItem(this.userPdvFne, PdvFNE);
  }
  setCurrentEtabFNE(EtabFNE: string): void {
    localStorage.setItem(this.userEtabFbe, EtabFNE);
  }
  setCurrentAuthorities(Authorities: string[]): void {
    localStorage.setItem(this.userAuthorities, JSON.stringify(Authorities));
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userEmailKey);

    localStorage.removeItem(this.userPdvFne);
    localStorage.removeItem(this.userIdroleKey);
    localStorage.removeItem(this.userEtabFbe);
    localStorage.removeItem(this.userIdKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  getCurrentAuthorities(): string[] {
    const token = this.getToken();
    if (!token) return [];

    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.authorities ?? [];
    } catch (error) {
      return [];
    }

  }

  getCurrentUserEmail(): string | null {
    return localStorage.getItem(this.userEmailKey);
  }

  getCurrentIdRole(): string | null {

    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.roles ?? null;
    } catch {
      return null;
    }
  }
  getCurrentId(): string | null {
    console.log('Getting current full name from token' + this.getToken());
    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.idUtilisateur ?? null;
    } catch {
      return null;
    }
  }
  getCurrentPdv(): string | null {
    console.log('Getting current pdv name from token' + this.getToken());
    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.pdv ?? null;
    } catch {
      return null;
    }
  }
  getCurrentEtabFNE(): string | null {

    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      return payload?.etablissementUser ?? null;
    } catch {
      return null;
    }
  }

  getCurrentFullName(): string | null {

    console.log('Getting current full name from token' + this.getToken());
    const token = this.getToken();
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);
      console.log('***** payload ****/ ', payload);
      return payload?.fullName ?? null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const payload = JSON.parse(decoded);

      // Vérifier l'expiration du token
      const exp = payload.exp;
      if (!exp) return false;

      const now = Math.floor(Date.now() / 1000);
      return exp > now;
    } catch {
      return false;
    }
  }

  logout(): void {
    this.clearToken();
  }
}
