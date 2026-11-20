import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  patientId: z.string().min(1),
  amount: z.coerce.number().positive(),
  kind: z.enum(["Payment"]).default("Payment"),
  reference: z.string().min(1).default("SIMULATED")
});

export async function GET() {
  try {
    return Response.json(await prisma.financialTransaction.findMany({ include: { patient: true }, orderBy: { createdAt: "desc" } }));
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const result = await prisma.$transaction(async (db) => {
      const patient = await db.patient.findUnique({ where: { id: data.patientId } });
      if (!patient) return { error: "Patient not found" as const };
      if (data.amount > patient.balance) return { error: "Payment cannot exceed the outstanding balance" as const };
      const transaction = await db.financialTransaction.create({ data: { ...data, status: "Posted" }, include: { patient: true } });
      await db.patient.update({ where: { id: data.patientId }, data: { balance: { decrement: data.amount } } });
      return { transaction };
    });
    if (result.error) return badRequest(result.error, result.error === "Patient not found" ? 404 : 400);
    await writeAudit("Payment posted", "FinancialTransaction", result.transaction.id, "$" + result.transaction.amount.toFixed(2) + " posted for " + result.transaction.patient.name);
    return Response.json(result.transaction, { status: 201 });
  } catch (error) { return serverError(error); }
}
