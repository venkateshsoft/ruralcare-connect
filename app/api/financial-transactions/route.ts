import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';
const schema = z.object({ patientId: z.string(), amount: z.coerce.number().positive(), kind: z.string().default('Payment'), reference: z.string().default('SIMULATED') });
export async function POST(request: Request) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return badRequest('Invalid transaction payload'); const d = parsed.data; const tx = await prisma.$transaction(async db => { const t = await db.financialTransaction.create({ data: { ...d, status: 'Posted' }, include: { patient: true } }); await db.patient.update({ where: { id: d.patientId }, data: { balance: { decrement: d.amount } } }); return t; }); await writeAudit('Payment posted', 'FinancialTransaction', tx.id, `$${tx.amount.toFixed(2)} posted for ${tx.patient.name}`); return Response.json(tx, { status: 201 }); } catch (error) { return serverError(error); } }
