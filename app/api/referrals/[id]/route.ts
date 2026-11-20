import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  specialty: z.string().min(2).optional(),
  reason: z.string().min(3).optional(),
  priority: z.enum(["Urgent", "Routine", "High"]).optional(),
  status: z.enum(["Draft", "Sent", "Received", "Appointment Scheduled", "Appointment Completed", "Feedback Received", "Patient Unreachable", "Closed"]).optional(),
  owner: z.string().min(2).optional(),
  notes: z.string().nullable().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const referral = await prisma.referral.update({ where: { id }, data: parsed.data, include: { patient: true } });
    await writeAudit("Referral updated", "Referral", id, referral.patient.name + " referral is now " + referral.status);
    return Response.json(referral);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const referral = await prisma.referral.findUnique({ where: { id }, include: { patient: true } });
    if (!referral) return badRequest("Referral not found", 404);
    await prisma.referral.delete({ where: { id } });
    await writeAudit("Referral deleted", "Referral", id, referral.patient.name + " referral to " + referral.specialty + " deleted");
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
