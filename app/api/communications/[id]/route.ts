import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  channel: z.enum(["SMS", "Voice"]).optional(),
  template: z.string().min(2).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["Draft", "Queued", "Sent", "Delivered", "Failed"]).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const item = await prisma.communication.update({ where: { id }, data: parsed.data, include: { patient: true } });
    await writeAudit("Communication updated", "Communication", id, item.channel + " outreach updated for " + item.patient.name);
    return Response.json(item);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const item = await prisma.communication.findUnique({ where: { id }, include: { patient: true } });
    if (!item) return badRequest("Communication not found", 404);
    await prisma.communication.delete({ where: { id } });
    await writeAudit("Communication deleted", "Communication", id, item.channel + " outreach removed for " + item.patient.name);
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
