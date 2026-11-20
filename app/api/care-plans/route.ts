import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ patientId: z.string(), condition: z.string().min(2), goals: z.array(z.string()).default([]), activities: z.array(z.string()).default([]), reviewDate: z.string().optional() });
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid care plan payload'); const d = parsed.data; const plan = await prisma.carePlan.create({ data: { patientId: d.patientId, condition: d.condition, goals: JSON.stringify(d.goals), activities: JSON.stringify(d.activities), reviewDate: d.reviewDate ? new Date(d.reviewDate) : undefined }, include: { patient: true } }); await writeAudit('Care plan created', 'CarePlan', plan.id, `${plan.patient.name} care plan created for ${plan.condition}`); return Response.json(plan, { status: 201 }); } catch (error) { return serverError(error); } }
