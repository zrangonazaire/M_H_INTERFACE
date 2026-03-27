export interface UserActionAuditLog {
  id: number;
  occurredAt: string;
  userId: number | null;
  userFullName: string | null;
  userEmail: string | null;
  module: string;
  action: string;
  endpoint: string;
  httpMethod: string;
  result: string;
  httpStatus: number;
  durationMs: number;
  clientIp: string | null;
  requestPayload: string | null;
  responsePayload: string | null;
}

export interface UserActionAuditQueryResult {
  auditLogs: UserActionAuditLog[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}
