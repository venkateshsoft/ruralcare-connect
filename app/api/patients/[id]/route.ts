import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2).optional(),
  age: z.coerce.number().int().min(0).max(125).optional(),
  zip: z.string().min(3).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  risk: z.enum(["High", "Moderate", "Low"]).optional(),
  conditions: z.array(z.string()).optional(),
  preferredChannel: z.enum(["SMS", "Voice"]).optional(),
  consent: z.boolean().optional(),
  balance: z.coerce.number().nonnegative().optional(),
  lastEncounter: z.string().nullable().optional(),
  nextAppointment: z.string().nullable().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const { conditions, email, ...rest } = parsed.data;
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        email: email === "" ? null : email,
        conditions: conditions ? JSON.stringify(conditions) : undefined
      }
    });
    await writeAudit("Patient updated", "Patient", id, "Demographic or clinical summary updated for " + patient.name);
    return Response.json(patient);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return badRequest("Patient not found", 404);
    await prisma.patient.delete({ where: { id } });
    await writeAudit("Patient deleted", "Patient", id, patient.name + " and related demo records deleted");
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
