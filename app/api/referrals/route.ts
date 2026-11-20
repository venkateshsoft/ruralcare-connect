import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  patientId: z.string().min(1),
  specialty: z.string().trim().min(2),
  reason: z.string().trim().min(3),
  priority: z.enum(["Urgent", "Routine", "High"]).default("Routine"),
  owner: z.string().trim().min(2).default("Care Coordination"),
  notes: z.string().optional()
});

export async function GET() {
  try {
    return Response.json(await prisma.referral.findMany({ include: { patient: true }, orderBy: { updatedAt: "desc" } }));
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const referral = await prisma.referral.create({
      data: { externalId: "REF-" + randomUUID().slice(0, 8).toUpperCase(), ...parsed.data },
      include: { patient: true }
    });
    await writeAudit("Referral created", "Referral", referral.id, referral.patient.name + " referred to " + referral.specialty);
    return Response.json(referral, { status: 201 });
  } catch (error) { return serverError(error); }
}
