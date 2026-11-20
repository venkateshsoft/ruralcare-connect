import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ status: z.string().optional(), priority: z.string().optional(), assigneeId: z.string().nullable().optional(), escalation: z.boolean().optional(), title: z.string().min(3).optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid task update'); const task = await prisma.task.update({ where: { id }, data: parsed.data, include: { patient: true, assignee: true } }); await writeAudit('Task updated', 'Task', id, `${task.patient.name} task is now ${task.status}`); return Response.json(task); } catch (error) { return serverError(error); } }
