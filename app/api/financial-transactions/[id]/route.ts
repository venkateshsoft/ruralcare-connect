import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({ status: z.enum(["Posted", "Pending", "Reversed"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest("Invalid transaction status");
    const result = await prisma.$transaction(async (db) => {
      const prior = await db.financialTransaction.findUnique({ where: { id }, include: { patient: true } });
      if (!prior) return { error: "Transaction not found" as const };
      const wasPosted = prior.status === "Posted" && prior.kind === "Payment";
      const willBePosted = parsed.data.status === "Posted" && prior.kind === "Payment";
      if (!wasPosted && willBePosted && prior.amount > prior.patient.balance) {
        return { error: "Insufficient outstanding balance to repost this payment" as const };
      }
      const updated = await db.financialTransaction.update({ where: { id }, data: { status: parsed.data.status }, include: { patient: true } });
      if (wasPosted && !willBePosted) await db.patient.update({ where: { id: prior.patientId }, data: { balance: { increment: prior.amount } } });
      if (!wasPosted && willBePosted) await db.patient.update({ where: { id: prior.patientId }, data: { balance: { decrement: prior.amount } } });
      return { transaction: updated };
    });
    if (result.error) return badRequest(result.error, result.error === "Transaction not found" ? 404 : 400);
    await writeAudit("Payment status updated", "FinancialTransaction", id, "Transaction status changed to " + result.transaction.status);
    return Response.json(result.transaction);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await prisma.$transaction(async (db) => {
      const item = await db.financialTransaction.findUnique({ where: { id } });
      if (!item) return { error: "Transaction not found" as const };
      if (item.status === "Posted" && item.kind === "Payment") {
        await db.patient.update({ where: { id: item.patientId }, data: { balance: { increment: item.amount } } });
      }
      await db.financialTransaction.delete({ where: { id } });
      return { item };
    });
    if (result.error) return badRequest(result.error, 404);
    await writeAudit("Transaction deleted", "FinancialTransaction", id, "Transaction " + result.item.reference + " deleted");
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
