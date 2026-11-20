import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { badRequest, serverError } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(2),
  age: z.coerce.number().int().min(0).max(125),
  zip: z.string().trim().min(3),
  phone: z.string().trim().min(7),
  email: z.string().email().optional().or(z.literal("")),
  conditions: z.array(z.string()).default([]),
  risk: z.enum(["High", "Moderate", "Low"]).default("Low"),
  preferredChannel: z.enum(["SMS", "Voice"]).default("SMS"),
  consent: z.boolean().default(true),
  balance: z.coerce.number().nonnegative().default(0),
  lastEncounter: z.string().optional(),
  nextAppointment: z.string().optional()
});

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { updatedAt: "desc" } });
    return Response.json(patients);
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join(", "));
    const data = parsed.data;
    const patient = await prisma.patient.create({
      data: {
        ...data,
        email: data.email || null,
        externalId: "RC-" + randomUUID().slice(0, 8).toUpperCase(),
        initials: data.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        conditions: JSON.stringify(data.conditions)
      }
    });
    await writeAudit("Patient created", "Patient", patient.id, patient.name + " registered in the patient registry");
    return Response.json(patient, { status: 201 });
  } catch (error) { return serverError(error); }
}
