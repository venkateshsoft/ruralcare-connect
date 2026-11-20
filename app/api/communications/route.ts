import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  patientId: z.string().min(1),
  channel: z.enum(["SMS", "Voice"]),
  template: z.string().min(2),
  content: z.string().trim().min(1)
});

export async function GET() {
  try {
    return Response.json(await prisma.communication.findMany({ include: { patient: true }, orderBy: { createdAt: "desc" } }));
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const communication = await prisma.communication.create({
      data: { ...parsed.data, status: "Sent" },
      include: { patient: true }
    });
    await writeAudit("Patient outreach sent", "Communication", communication.id, communication.channel + " simulation sent to " + communication.patient.name);
    return Response.json(communication, { status: 201 });
  } catch (error) { return serverError(error); }
}
