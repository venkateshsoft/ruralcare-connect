import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  patientId: z.string().min(1),
  condition: z.string().trim().min(2),
  goals: z.array(z.string()).default([]),
  activities: z.array(z.string()).default([]),
  reviewDate: z.string().optional()
});

export async function GET() {
  try {
    return Response.json(await prisma.carePlan.findMany({ include: { patient: true }, orderBy: { updatedAt: "desc" } }));
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const plan = await prisma.carePlan.create({
      data: {
        patientId: data.patientId, condition: data.condition,
        goals: JSON.stringify(data.goals), activities: JSON.stringify(data.activities),
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : null
      },
      include: { patient: true }
    });
    await writeAudit("Care plan created", "CarePlan", plan.id, plan.patient.name + " care plan created for " + plan.condition);
    return Response.json(plan, { status: 201 });
  } catch (error) { return serverError(error); }
}
