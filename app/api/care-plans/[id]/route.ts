import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  condition: z.string().min(2).optional(),
  status: z.enum(["Active", "On Hold", "Completed", "Discontinued"]).optional(),
  goals: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  reviewDate: z.string().nullable().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const plan = await prisma.carePlan.update({
      where: { id },
      data: {
        condition: data.condition,
        status: data.status,
        goals: data.goals ? JSON.stringify(data.goals) : undefined,
        activities: data.activities ? JSON.stringify(data.activities) : undefined,
        reviewDate: data.reviewDate === null ? null : data.reviewDate ? new Date(data.reviewDate) : undefined
      },
      include: { patient: true }
    });
    await writeAudit("Care plan updated", "CarePlan", id, plan.patient.name + " care plan updated for " + plan.condition);
    return Response.json(plan);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const plan = await prisma.carePlan.findUnique({ where: { id }, include: { patient: true } });
    if (!plan) return badRequest("Care plan not found", 404);
    await prisma.carePlan.delete({ where: { id } });
    await writeAudit("Care plan deleted", "CarePlan", id, plan.patient.name + " care plan deleted");
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
