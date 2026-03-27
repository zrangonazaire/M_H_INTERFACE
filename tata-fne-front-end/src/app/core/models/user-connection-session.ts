export interface UserConnectionSession {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  connectedAt: string;
  lastActivityAt: string;
  disconnectedAt: string | null;
  expiresAt: string;
  status: 'ACTIVE' | 'LOGGED_OUT' | 'EXPIRED';
  remainingMs: number;
  currentSession: boolean;
  clientIp: string | null;
  userAgent: string | null;
  logoutReason: string | null;
}
