/**
 * Port interface for audit logging.
 * All tax/commission calculations should be recorded for compliance.
 */
export interface IAuditLogPort {
  log(entry: AuditLogEntry): Promise<void>;
}

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export const AUDIT_LOG_PORT = Symbol('IAuditLogPort');
