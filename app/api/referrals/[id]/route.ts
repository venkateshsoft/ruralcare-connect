import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ status: z.string().optional(), priority: z.string().optional(), notes: z.string().optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid referral update'); const referral = await prisma.referral.update({ where: { id }, data: parsed.data, include: { patient: true } }); await writeAudit('Referral status changed', 'Referral', id, `${referral.patient.name} referral is now ${referral.status}`); return Response.json(referral); } catch (error) { return serverError(error); } }
