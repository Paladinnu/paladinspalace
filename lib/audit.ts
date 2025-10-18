import { prisma } from './listings';
import { logger } from './logger';

interface AuditOptions {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
}

export async function audit(opts: AuditOptions) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: opts.userId || null,
        action: opts.action,
        entityType: opts.entityType || null,
        entityId: opts.entityId || null,
        ip: opts.ip || null,
        userAgent: opts.userAgent || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata).slice(0, 4000) : null
      }
    });
  } catch (e: any) {
    logger.warn('audit_insert_failed', { error: e.message });
  }
}
