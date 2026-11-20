import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(2).optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  status: z.enum(["New", "Assigned", "In Progress", "Waiting for Specialist", "Completed", "Cancelled"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  escalation: z.boolean().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined
      },
      include: { patient: true, assignee: true }
    });
    await writeAudit("Task updated", "Task", id, task.patient.name + " task is now " + task.status);
    return Response.json(task);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const task = await prisma.task.findUnique({ where: { id }, include: { patient: true } });
    if (!task) return badRequest("Task not found", 404);
    await prisma.task.delete({ where: { id } });
    await writeAudit("Task deleted", "Task", id, task.title + " removed for " + task.patient.name);
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
