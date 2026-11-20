import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';

const schema = z.object({ title: z.string().min(3), patientId: z.string(), category: z.string(), priority: z.string().default('Medium'), assigneeId: z.string().optional(), dueDate: z.string().optional(), description: z.string().optional() });
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid task payload'); const d = parsed.data; const task = await prisma.task.create({ data: { externalId: `TSK-${Math.floor(Math.random() * 9000 + 1000)}`, title: d.title, category: d.category, priority: d.priority, description: d.description, patientId: d.patientId, assigneeId: d.assigneeId, dueDate: d.dueDate ? new Date(d.dueDate) : undefined }, include: { patient: true, assignee: true } }); await writeAudit('Task created', 'Task', task.id, `${task.title} created for ${task.patient.name}`); return Response.json(task, { status: 201 }); } catch (error) { return serverError(error); } }
