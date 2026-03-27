import { SessionConfiguration } from '../app/core/models/session';

const session: SessionConfiguration = {
  defaultRememberMe: true,
  rememberMeStorage: 'local',
  temporaryStorage: 'session',
  inactivityTimeoutMs: 30 * 60 * 1000,
  warningThresholdMs: 5 * 60 * 1000,
  monitorIntervalMs: 30 * 1000,
  activitySyncDebounceMs: 15 * 1000,
  autoLogoutOnTokenExpiry: true,
  syncAcrossTabs: true,
  logoutRedirectRoute: '/login'
};

export const environment = {
  apiBaseUrl: '/api/v1',
  session
};
