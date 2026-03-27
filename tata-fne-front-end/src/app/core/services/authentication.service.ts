import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
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
import {
  SessionConfiguration,
  SessionLogoutReason,
  SessionMetadata,
  SessionPersistenceMode,
  SessionPreference,
  SessionSnapshot
} from '../models/session';

type TokenPayload = {
  sub?: string;
  exp?: number;
  roles?: unknown;
  idUtilisateur?: unknown;
  pdv?: unknown;
  etablissementUser?: unknown;
  fullName?: unknown;
  authorities?: unknown;
};

type SessionContext = {
  storage: Storage;
  persistence: SessionPersistenceMode;
  token: string;
  metadata: SessionMetadata | null;
};

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly userSessionsBaseUrl = `${environment.apiBaseUrl}/user-sessions`;
  private readonly sessionConfig: SessionConfiguration = environment.session;

  private readonly tokenKey = 'tata_fne_token';
  private readonly userEmailKey = 'tata_fne_user_email';
  private readonly userIdroleKey = 'tata_fne_user_idrole';
  private readonly userPdvFne = 'tata_fne_UserPdvFne';
  private readonly userEtabFbe = 'tata_fne_UserEtab';
  private readonly userIdKey = 'tata_fne_user_id';
  private readonly userAuthorities = 'tata_fne_user_authorities';
  private readonly sessionMetadataKey = 'tata_fne_session_metadata';
  private readonly sessionPreferenceKey = 'tata_fne_session_preference';
  private readonly logoutReasonKey = 'tata_fne_session_logout_reason';

  private readonly sessionDataKeys = [
    this.tokenKey,
    this.userEmailKey,
    this.userIdroleKey,
    this.userPdvFne,
    this.userEtabFbe,
    this.userIdKey,
    this.userAuthorities,
    this.sessionMetadataKey
  ] as const;

  private readonly activityEvents = ['click', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;

  private monitorId: number | null = null;
  private activityListenersRegistered = false;
  private storageListenerRegistered = false;
  private lastRecordedActivityAt = 0;
  private lastRemoteActivitySyncAt = 0;

  constructor(private readonly http: HttpClient) {
    this.bootstrapSessionInfrastructure();
  }

  login(
    payload: LoginRequest,
    options?: { rememberMe?: boolean }
  ): Observable<AuthenticationResponse> {
    const rememberMe = options?.rememberMe ?? this.sessionConfig.defaultRememberMe;

    return this.http
      .post<AuthenticationResponse>(`${this.baseUrl}/authenticate`, payload)
      .pipe(tap((response) => this.startSession(response.token, rememberMe)));
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

  setToken(token: string, options?: { rememberMe?: boolean }): void {
    const rememberMe = options?.rememberMe ?? this.resolveRememberMePreference();
    this.startSession(token, rememberMe);
  }

  setCurrentUserEmail(email: string): void {
    this.setSessionValue(this.userEmailKey, email);
  }

  setCurrentIdRole(idRole: string): void {
    this.setSessionValue(this.userIdroleKey, idRole);
  }

  setCurrentId(id: string): void {
    this.setSessionValue(this.userIdKey, id);
  }

  setCurrentPdv(pdvFne: string): void {
    this.setSessionValue(this.userPdvFne, pdvFne);
  }

  setCurrentEtabFNE(etabFne: string): void {
    this.setSessionValue(this.userEtabFbe, etabFne);
  }

  setCurrentAuthorities(authorities: string[]): void {
    this.setSessionValue(this.userAuthorities, JSON.stringify(authorities));
  }

  clearToken(): void {
    this.clearSessionData(null);
  }

  getToken(): string | null {
    return this.resolveActiveToken(true);
  }

  getCurrentAuthorities(): string[] {
    const payload = this.getTokenPayload();
    if (Array.isArray(payload?.authorities)) {
      return payload.authorities.filter((authority): authority is string => typeof authority === 'string');
    }

    const storedAuthorities = this.getSessionValue(this.userAuthorities);
    if (!storedAuthorities) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedAuthorities);
      return Array.isArray(parsed)
        ? parsed.filter((authority): authority is string => typeof authority === 'string')
        : [];
    } catch {
      return [];
    }
  }

  getCurrentUserEmail(): string | null {
    return this.getSessionValue(this.userEmailKey) ?? this.readStringClaim('sub');
  }

  getCurrentIdRole(): string | null {
    return this.readStringClaim('roles') ?? this.getSessionValue(this.userIdroleKey);
  }

  getCurrentId(): string | null {
    return this.readStringClaim('idUtilisateur') ?? this.getSessionValue(this.userIdKey);
  }

  getCurrentPdv(): string | null {
    return this.readStringClaim('pdv') ?? this.getSessionValue(this.userPdvFne);
  }

  getCurrentEtabFNE(): string | null {
    return this.readStringClaim('etablissementUser') ?? this.getSessionValue(this.userEtabFbe);
  }

  getCurrentFullName(): string | null {
    return this.readStringClaim('fullName');
  }

  isAuthenticated(): boolean {
    return Boolean(this.resolveActiveToken(true));
  }

  recordActivity(force = false): void {
    if (!this.hasBrowserStorage()) {
      return;
    }

    const context = this.getSessionContext();
    if (!context) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastRecordedActivityAt < this.sessionConfig.activitySyncDebounceMs) {
      return;
    }

    const reason = this.resolveSessionInvalidationReason(context.token, context.metadata);
    if (reason) {
      this.logout(reason, true);
      return;
    }

    const metadata =
      context.metadata ?? this.buildSessionMetadata(context.token, context.persistence, this.inferRememberMe(context.persistence));

    metadata.lastActivityAt = now;
    metadata.inactivityDeadlineAt = now + this.sessionConfig.inactivityTimeoutMs;

    context.storage.setItem(this.sessionMetadataKey, JSON.stringify(metadata));
    this.lastRecordedActivityAt = now;
    this.syncRemoteActivity(context.token, now);
  }

  refreshSessionWindow(): boolean {
    const context = this.getSessionContext();
    if (!context) {
      return false;
    }

    const reason = this.resolveSessionInvalidationReason(context.token, context.metadata);
    if (reason) {
      this.logout(reason, true);
      return false;
    }

    this.recordActivity(true);
    return true;
  }

  logout(reason: SessionLogoutReason = 'manual', redirect = false): void {
    const token = this.resolveActiveToken(false);
    if (token && reason !== 'invalid-token') {
      this.syncRemoteLogout(token, reason);
    }

    this.clearSessionData(reason);

    if (redirect) {
      void this.navigateToLogoutRoute();
    }
  }

  getSessionConfiguration(): SessionConfiguration {
    return this.sessionConfig;
  }

  getSessionPolicySummary(): string {
    const inactivity = this.formatDuration(this.sessionConfig.inactivityTimeoutMs);
    const warning = this.formatDuration(this.sessionConfig.warningThresholdMs);
    return `Deconnexion apres ${inactivity} d'inactivite, alerte ${warning} avant la fermeture.`;
  }

  getSessionPersistenceMode(): SessionPersistenceMode {
    const context = this.getSessionContext();
    if (context) {
      return context.persistence;
    }

    return this.getSessionPreference()?.persistence ?? this.resolvePersistenceFromRememberMe(this.resolveRememberMePreference());
  }

  updateSessionPersistence(persistence: SessionPersistenceMode): void {
    const rememberMe = this.inferRememberMe(persistence);
    const preference: SessionPreference = {
      rememberMe,
      persistence,
      updatedAt: Date.now()
    };

    this.persistSessionPreference(preference);

    const context = this.getSessionContext();
    if (!context) {
      return;
    }

    const entries = this.collectSessionEntries();
    const metadata =
      context.metadata ?? this.buildSessionMetadata(context.token, persistence, rememberMe);

    metadata.persistence = persistence;
    metadata.rememberMe = rememberMe;

    entries.set(this.sessionMetadataKey, JSON.stringify(metadata));

    this.removeSessionArtifacts();
    const targetStorage = this.resolveStorage(persistence);

    entries.forEach((value, key) => targetStorage.setItem(key, value));
  }

  getSessionSnapshot(): SessionSnapshot {
    const context = this.getSessionContext();
    if (!context) {
      return {
        isAuthenticated: false,
        state: 'missing',
        statusLabel: 'Aucune session active',
        statusTone: 'neutral',
        storageLabel: 'Aucun stockage',
        persistence: this.getSessionPersistenceMode(),
        rememberMe: this.resolveRememberMePreference(),
        createdAt: null,
        lastActivityAt: null,
        inactivityDeadlineAt: null,
        tokenExpiresAt: null,
        msUntilIdleLogout: null,
        msUntilTokenExpiry: null,
        effectiveRemainingMs: null
      };
    }

    const now = Date.now();
    const idleRemaining = context.metadata ? context.metadata.inactivityDeadlineAt - now : null;
    const tokenRemaining =
      context.metadata?.tokenExpiresAt !== null && context.metadata?.tokenExpiresAt !== undefined
        ? context.metadata.tokenExpiresAt - now
        : this.getTokenExpirationFromToken(context.token);
    const effectiveRemaining = this.computeEffectiveRemainingMs(idleRemaining, tokenRemaining);
    const invalidationReason = this.resolveSessionInvalidationReason(context.token, context.metadata);

    if (invalidationReason || effectiveRemaining === null || effectiveRemaining <= 0) {
      return {
        isAuthenticated: false,
        state: 'expired',
        statusLabel: 'Session expirée',
        statusTone: 'danger',
        storageLabel: this.getStorageLabel(context.persistence),
        persistence: context.persistence,
        rememberMe: context.metadata?.rememberMe ?? this.inferRememberMe(context.persistence),
        createdAt: context.metadata?.createdAt ?? null,
        lastActivityAt: context.metadata?.lastActivityAt ?? null,
        inactivityDeadlineAt: context.metadata?.inactivityDeadlineAt ?? null,
        tokenExpiresAt: context.metadata?.tokenExpiresAt ?? null,
        msUntilIdleLogout: idleRemaining,
        msUntilTokenExpiry: tokenRemaining,
        effectiveRemainingMs: effectiveRemaining
      };
    }

    if (effectiveRemaining <= this.sessionConfig.warningThresholdMs) {
      return {
        isAuthenticated: true,
        state: 'warning',
        statusLabel: 'Session a surveiller',
        statusTone: 'warning',
        storageLabel: this.getStorageLabel(context.persistence),
        persistence: context.persistence,
        rememberMe: context.metadata?.rememberMe ?? this.inferRememberMe(context.persistence),
        createdAt: context.metadata?.createdAt ?? null,
        lastActivityAt: context.metadata?.lastActivityAt ?? null,
        inactivityDeadlineAt: context.metadata?.inactivityDeadlineAt ?? null,
        tokenExpiresAt: context.metadata?.tokenExpiresAt ?? null,
        msUntilIdleLogout: idleRemaining,
        msUntilTokenExpiry: tokenRemaining,
        effectiveRemainingMs: effectiveRemaining
      };
    }

    return {
      isAuthenticated: true,
      state: 'active',
      statusLabel: 'Session operationnelle',
      statusTone: 'success',
      storageLabel: this.getStorageLabel(context.persistence),
      persistence: context.persistence,
      rememberMe: context.metadata?.rememberMe ?? this.inferRememberMe(context.persistence),
      createdAt: context.metadata?.createdAt ?? null,
      lastActivityAt: context.metadata?.lastActivityAt ?? null,
      inactivityDeadlineAt: context.metadata?.inactivityDeadlineAt ?? null,
      tokenExpiresAt: context.metadata?.tokenExpiresAt ?? null,
      msUntilIdleLogout: idleRemaining,
      msUntilTokenExpiry: tokenRemaining,
      effectiveRemainingMs: effectiveRemaining
    };
  }

  consumeLogoutReasonMessage(): string | null {
    const reason = this.consumeLogoutReason();
    if (!reason) {
      return null;
    }

    switch (reason) {
      case 'manual':
        return 'Votre session a ete fermee.';
      case 'idle-timeout':
        return "Votre session a expire apres une periode d'inactivite.";
      case 'token-expired':
        return 'Votre session a expire. Veuillez vous reconnecter.';
      case 'invalid-token':
        return "La session locale n'est plus valide. Veuillez vous reconnecter.";
      case 'storage-cleared':
        return 'La session locale a ete reinitialisee.';
      default:
        return null;
    }
  }

  private bootstrapSessionInfrastructure(): void {
    if (!this.hasBrowserStorage()) {
      return;
    }

    this.ensureSessionMetadata();
    this.registerActivityListeners();
    this.registerStorageListener();
    this.startSessionMonitor();

    const token = this.resolveActiveToken(false);
    if (!token) {
      return;
    }

    const context = this.getSessionContext();
    if (!context) {
      return;
    }

    const reason = this.resolveSessionInvalidationReason(token, context.metadata);
    if (reason) {
      this.clearSessionData(reason);
    }
  }

  private startSession(token: string, rememberMe: boolean): void {
    const persistence = this.resolvePersistenceFromRememberMe(rememberMe);
    const storage = this.resolveStorage(persistence);

    this.removeSessionArtifacts();
    this.clearLogoutReason();

    storage.setItem(this.tokenKey, token);
    storage.setItem(
      this.sessionMetadataKey,
      JSON.stringify(this.buildSessionMetadata(token, persistence, rememberMe))
    );

    this.persistSessionPreference({
      rememberMe,
      persistence,
      updatedAt: Date.now()
    });

    this.lastRecordedActivityAt = Date.now();
    this.lastRemoteActivitySyncAt = Date.now();
  }

  private resolveActiveToken(enforceSessionRules: boolean): string | null {
    const context = this.getSessionContext();
    if (!context) {
      return null;
    }

    if (!enforceSessionRules) {
      return context.token;
    }

    const reason = this.resolveSessionInvalidationReason(context.token, context.metadata);
    if (!reason) {
      return context.token;
    }

    this.logout(reason, true);
    return null;
  }

  private getSessionContext(): SessionContext | null {
    if (!this.hasBrowserStorage()) {
      return null;
    }

    const candidates: SessionContext[] = [
      this.buildSessionContext(this.localStorageRef(), 'local'),
      this.buildSessionContext(this.sessionStorageRef(), 'session')
    ].filter((context): context is SessionContext => context !== null);

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => {
      const leftScore = left.metadata?.lastActivityAt ?? 0;
      const rightScore = right.metadata?.lastActivityAt ?? 0;
      return rightScore - leftScore;
    });

    return candidates[0] ?? null;
  }

  private buildSessionContext(
    storage: Storage,
    persistence: SessionPersistenceMode
  ): SessionContext | null {
    const token = storage.getItem(this.tokenKey);
    if (!token) {
      return null;
    }

    return {
      storage,
      persistence,
      token,
      metadata: this.readSessionMetadata(storage)
    };
  }

  private ensureSessionMetadata(): void {
    const localStorageRef = this.localStorageRef();
    const sessionStorageRef = this.sessionStorageRef();

    this.ensureMetadataForStorage(localStorageRef, 'local');
    this.ensureMetadataForStorage(sessionStorageRef, 'session');
  }

  private ensureMetadataForStorage(
    storage: Storage,
    persistence: SessionPersistenceMode
  ): void {
    const token = storage.getItem(this.tokenKey);
    if (!token || storage.getItem(this.sessionMetadataKey)) {
      return;
    }

    storage.setItem(
      this.sessionMetadataKey,
      JSON.stringify(this.buildSessionMetadata(token, persistence, this.inferRememberMe(persistence)))
    );
  }

  private resolveSessionInvalidationReason(
    token: string,
    metadata: SessionMetadata | null
  ): SessionLogoutReason | null {
    const payload = this.extractTokenPayload(token);
    if (!payload) {
      return 'invalid-token';
    }

    if (
      this.sessionConfig.autoLogoutOnTokenExpiry &&
      typeof payload.exp === 'number' &&
      payload.exp * 1000 <= Date.now()
    ) {
      return 'token-expired';
    }

    if (metadata && metadata.inactivityDeadlineAt <= Date.now()) {
      return 'idle-timeout';
    }

    return null;
  }

  private registerActivityListeners(): void {
    if (!this.hasBrowserStorage() || this.activityListenersRegistered) {
      return;
    }

    const listener = this.onUserActivity;
    for (const eventName of this.activityEvents) {
      window.addEventListener(eventName, listener, { passive: true });
    }

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.activityListenersRegistered = true;
  }

  private registerStorageListener(): void {
    if (!this.hasBrowserStorage() || this.storageListenerRegistered || !this.sessionConfig.syncAcrossTabs) {
      return;
    }

    window.addEventListener('storage', this.onStorageEvent);
    this.storageListenerRegistered = true;
  }

  private startSessionMonitor(): void {
    if (!this.hasBrowserStorage() || this.monitorId !== null) {
      return;
    }

    this.monitorId = window.setInterval(() => {
      const context = this.getSessionContext();
      if (!context) {
        return;
      }

      const reason = this.resolveSessionInvalidationReason(context.token, context.metadata);
      if (reason) {
        this.logout(reason, true);
      }
    }, this.sessionConfig.monitorIntervalMs);
  }

  private readonly onUserActivity = (): void => {
    this.recordActivity();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.recordActivity(true);
    }
  };

  private readonly onStorageEvent = (event: StorageEvent): void => {
    if (!event.key) {
      return;
    }

    if (event.key === this.logoutReasonKey && event.newValue) {
      void this.navigateToLogoutRoute();
      return;
    }

    if (event.key === this.tokenKey && !event.newValue) {
      void this.navigateToLogoutRoute();
    }
  };

  private navigateToLogoutRoute(): Promise<boolean> {
    if (this.router.url === this.sessionConfig.logoutRedirectRoute) {
      return Promise.resolve(true);
    }

    return this.router.navigate([this.sessionConfig.logoutRedirectRoute]);
  }

  private clearSessionData(reason: SessionLogoutReason | null): void {
    this.removeSessionArtifacts();
    this.lastRemoteActivitySyncAt = 0;

    if (reason) {
      this.storeLogoutReason(reason);
    }
  }

  private removeSessionArtifacts(): void {
    const storages = [this.localStorageRef(), this.sessionStorageRef()];

    for (const storage of storages) {
      for (const key of this.sessionDataKeys) {
        storage.removeItem(key);
      }
    }
  }

  private collectSessionEntries(): Map<string, string> {
    const entries = new Map<string, string>();

    for (const key of this.sessionDataKeys) {
      const value = this.getSessionValue(key);
      if (value !== null) {
        entries.set(key, value);
      }
    }

    return entries;
  }

  private setSessionValue(key: string, value: string): void {
    const context = this.getSessionContext();
    const storage =
      context?.storage ??
      this.resolveStorage(this.resolvePersistenceFromRememberMe(this.resolveRememberMePreference()));

    storage.setItem(key, value);
  }

  private getSessionValue(key: string): string | null {
    const context = this.getSessionContext();
    if (context) {
      const value = context.storage.getItem(key);
      if (value !== null) {
        return value;
      }
    }

    return this.localStorageRef().getItem(key) ?? this.sessionStorageRef().getItem(key);
  }

  private getTokenPayload(): TokenPayload | null {
    const token = this.resolveActiveToken(true);
    if (!token) {
      return null;
    }

    return this.extractTokenPayload(token);
  }

  private extractTokenPayload(token: string): TokenPayload | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

      return JSON.parse(this.decodeBase64Url(payloadPart)) as TokenPayload;
    } catch {
      return null;
    }
  }

  private decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized.padEnd(normalized.length + paddingLength, '=');
    return atob(padded);
  }

  private readStringClaim(claim: keyof TokenPayload): string | null {
    const payload = this.getTokenPayload();
    const value = payload?.[claim];

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      return typeof first === 'string' || typeof first === 'number' ? String(first) : null;
    }

    return null;
  }

  private buildSessionMetadata(
    token: string,
    persistence: SessionPersistenceMode,
    rememberMe: boolean
  ): SessionMetadata {
    const now = Date.now();

    return {
      createdAt: now,
      lastActivityAt: now,
      inactivityDeadlineAt: now + this.sessionConfig.inactivityTimeoutMs,
      tokenExpiresAt: this.getTokenExpirationFromToken(token),
      persistence,
      rememberMe
    };
  }

  private getTokenExpirationFromToken(token: string): number | null {
    const payload = this.extractTokenPayload(token);
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  }

  private computeEffectiveRemainingMs(
    idleRemaining: number | null,
    tokenRemaining: number | null
  ): number | null {
    const values = [idleRemaining, tokenRemaining].filter(
      (value): value is number => value !== null && !Number.isNaN(value)
    );

    if (values.length === 0) {
      return null;
    }

    return Math.min(...values);
  }

  private formatDuration(durationMs: number): string {
    const totalMinutes = Math.round(durationMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} h ${minutes} min`;
    }

    if (hours > 0) {
      return `${hours} h`;
    }

    return `${minutes} min`;
  }

  private readSessionMetadata(storage: Storage): SessionMetadata | null {
    const rawMetadata = storage.getItem(this.sessionMetadataKey);
    if (!rawMetadata) {
      return null;
    }

    try {
      return JSON.parse(rawMetadata) as SessionMetadata;
    } catch {
      return null;
    }
  }

  private getSessionPreference(): SessionPreference | null {
    const rawPreference = this.localStorageRef().getItem(this.sessionPreferenceKey);
    if (!rawPreference) {
      return null;
    }

    try {
      return JSON.parse(rawPreference) as SessionPreference;
    } catch {
      return null;
    }
  }

  private persistSessionPreference(preference: SessionPreference): void {
    this.localStorageRef().setItem(this.sessionPreferenceKey, JSON.stringify(preference));
  }

  private resolveRememberMePreference(): boolean {
    return this.getSessionPreference()?.rememberMe ?? this.sessionConfig.defaultRememberMe;
  }

  private resolvePersistenceFromRememberMe(rememberMe: boolean): SessionPersistenceMode {
    return rememberMe ? this.sessionConfig.rememberMeStorage : this.sessionConfig.temporaryStorage;
  }

  private inferRememberMe(persistence: SessionPersistenceMode): boolean {
    return persistence === this.sessionConfig.rememberMeStorage;
  }

  private resolveStorage(persistence: SessionPersistenceMode): Storage {
    return persistence === 'local' ? this.localStorageRef() : this.sessionStorageRef();
  }

  private getStorageLabel(persistence: SessionPersistenceMode): string {
    return persistence === 'local' ? 'Stockage navigateur persistant' : 'Stockage session navigateur';
  }

  private storeLogoutReason(reason: SessionLogoutReason): void {
    this.localStorageRef().setItem(this.logoutReasonKey, reason);
  }

  private consumeLogoutReason(): SessionLogoutReason | null {
    const reason = this.localStorageRef().getItem(this.logoutReasonKey) as SessionLogoutReason | null;
    this.clearLogoutReason();
    return reason;
  }

  private clearLogoutReason(): void {
    this.localStorageRef().removeItem(this.logoutReasonKey);
  }

  private syncRemoteActivity(token: string, now: number): void {
    if (!this.hasBrowserStorage() || now - this.lastRemoteActivitySyncAt < this.sessionConfig.activitySyncDebounceMs) {
      return;
    }

    this.lastRemoteActivitySyncAt = now;
    void fetch(`${this.userSessionsBaseUrl}/heartbeat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      keepalive: true
    }).catch(() => undefined);
  }

  private syncRemoteLogout(token: string, reason: SessionLogoutReason): void {
    const url = `${this.userSessionsBaseUrl}/logout?reason=${encodeURIComponent(reason)}`;

    void fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      keepalive: true
    }).catch(() => undefined);
  }

  private hasBrowserStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined';
  }

  private localStorageRef(): Storage {
    return localStorage;
  }

  private sessionStorageRef(): Storage {
    return sessionStorage;
  }
}
