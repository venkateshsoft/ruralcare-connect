import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ patientId: z.string(), specialty: z.string().min(2), reason: z.string().min(3), priority: z.string().default('Routine'), owner: z.string().default('Care Coordination'), notes: z.string().optional() });
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid referral payload'); const d = parsed.data; const referral = await prisma.referral.create({ data: { externalId: `REF-${Math.floor(Math.random() * 9000 + 1000)}`, ...d }, include: { patient: true } }); await writeAudit('Referral created', 'Referral', referral.id, `${referral.patient.name} referred to ${referral.specialty}`); return Response.json(referral, { status: 201 }); } catch (error) { return serverError(error); } }
