export type SessionPersistenceMode = 'local' | 'session';

export type SessionLogoutReason =
  | 'manual'
  | 'idle-timeout'
  | 'token-expired'
  | 'invalid-token'
  | 'storage-cleared';

export interface SessionConfiguration {
  defaultRememberMe: boolean;
  rememberMeStorage: SessionPersistenceMode;
  temporaryStorage: SessionPersistenceMode;
  inactivityTimeoutMs: number;
  warningThresholdMs: number;
  monitorIntervalMs: number;
  activitySyncDebounceMs: number;
  autoLogoutOnTokenExpiry: boolean;
  syncAcrossTabs: boolean;
  logoutRedirectRoute: string;
}

export interface SessionMetadata {
  createdAt: number;
  lastActivityAt: number;
  inactivityDeadlineAt: number;
  tokenExpiresAt: number | null;
  persistence: SessionPersistenceMode;
  rememberMe: boolean;
}

export interface SessionPreference {
  rememberMe: boolean;
  persistence: SessionPersistenceMode;
  updatedAt: number;
}

export interface SessionSnapshot {
  isAuthenticated: boolean;
  state: 'active' | 'warning' | 'expired' | 'missing';
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'neutral';
  storageLabel: string;
  persistence: SessionPersistenceMode;
  rememberMe: boolean;
  createdAt: number | null;
  lastActivityAt: number | null;
  inactivityDeadlineAt: number | null;
  tokenExpiresAt: number | null;
  msUntilIdleLogout: number | null;
  msUntilTokenExpiry: number | null;
  effectiveRemainingMs: number | null;
}
