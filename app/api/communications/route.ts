import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ patientId: z.string(), channel: z.enum(['SMS', 'Voice']), template: z.string(), content: z.string().min(1) });
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid communication payload'); const d = parsed.data; const communication = await prisma.communication.create({ data: { ...d, status: 'Sent' }, include: { patient: true } }); await writeAudit('Patient outreach sent', 'Communication', communication.id, `${communication.channel} simulation sent to ${communication.patient.name}`); return Response.json(communication, { status: 201 }); } catch (error) { return serverError(error); } }
