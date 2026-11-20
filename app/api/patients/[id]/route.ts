import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';

const schema = z.object({ name: z.string().min(2).optional(), risk: z.enum(['High', 'Moderate', 'Low']).optional(), phone: z.string().min(7).optional(), conditions: z.array(z.string()).optional(), balance: z.coerce.number().nonnegative().optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid patient update'); const { conditions, ...rest } = parsed.data; const patient = await prisma.patient.update({ where: { id }, data: { ...rest, conditions: conditions ? JSON.stringify(conditions) : undefined } }); await writeAudit('Patient updated', 'Patient', id, `Demographic or clinical summary updated for ${patient.name}`); return Response.json(patient); } catch (error) { return serverError(error); }
}
