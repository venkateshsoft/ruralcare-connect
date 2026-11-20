import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { badRequest, serverError } from '@/lib/http';

const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int().min(0).max(125), zip: z.string().min(3), phone: z.string().min(7), conditions: z.array(z.string()).default([]), risk: z.enum(['High', 'Moderate', 'Low']).default('Low'), preferredChannel: z.string().default('SMS'), consent: z.boolean().default(true), balance: z.coerce.number().nonnegative().default(0) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map(i => i.message).join(', '));
    const data = parsed.data;
    const patient = await prisma.patient.create({ data: { externalId: `RC-${Math.floor(Math.random() * 90000 + 10000)}`, name: data.name, initials: data.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(), age: data.age, zip: data.zip, phone: data.phone, conditions: JSON.stringify(data.conditions), risk: data.risk, preferredChannel: data.preferredChannel, consent: data.consent, balance: data.balance } });
    await writeAudit('Patient created', 'Patient', patient.id, `${patient.name} registered in the patient registry`);
    return Response.json(patient, { status: 201 });
  } catch (error) { return serverError(error); }
}
