import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  title: z.string().trim().min(3),
  patientId: z.string().min(1),
  category: z.string().min(2),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional()
});

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({ include: { patient: true, assignee: true }, orderBy: { updatedAt: "desc" } });
    return Response.json(tasks);
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const task = await prisma.task.create({
      data: {
        externalId: "TSK-" + randomUUID().slice(0, 8).toUpperCase(),
        title: data.title, patientId: data.patientId, category: data.category,
        priority: data.priority, assigneeId: data.assigneeId || null,
        description: data.description || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      },
      include: { patient: true, assignee: true }
    });
    await writeAudit("Task created", "Task", task.id, task.title + " created for " + task.patient.name);
    return Response.json(task, { status: 201 });
  } catch (error) { return serverError(error); }
}
