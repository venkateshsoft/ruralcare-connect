import { prisma } from './prisma';

export async function writeAudit(action: string, entity: string, entityId: string, detail: string, actorId?: string) {
  return prisma.auditEvent.create({ data: { action, entity, entityId, detail, actorId } });
}
