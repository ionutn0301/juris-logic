import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IAuditLogPort, AuditLogEntry } from '../../application/ports/audit-log.port';

/**
 * Prisma-backed adapter for the IAuditLogPort.
 * Writes immutable audit records to the audit_logs table.
 */
@Injectable()
export class PrismaAuditLogAdapter implements IAuditLogPort {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLogRecord.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        input: entry.input as Record<string, string>,
        output: entry.output as Record<string, string>,
        metadata: (entry.metadata ?? {}) as Record<string, string>,
        timestamp: entry.timestamp,
      },
    });
  }
}
