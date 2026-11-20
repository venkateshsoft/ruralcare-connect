import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const demoUsers = [
  ["Priya Anand", "Practice Administrator"],
  ["Dr. Sarah Kim", "Physician"],
  ["Maya Patel", "Care Coordinator"],
  ["Jordan Lee", "Nurse"],
  ["Dr. Michael Ross", "Referral Partner"],
  ["System Admin", "System Administrator"]
] as const;

const demoPatients = [
  ["RC-10482", "Evelyn Carter", 72, "59047", "(406) 555-0142", ["Diabetes", "Hypertension", "CKD"], "High", 284],
  ["RC-10931", "James Williams", 67, "59068", "(406) 555-0190", ["COPD", "Hypertension"], "High", 0],
  ["RC-10077", "Maria Rodriguez", 58, "59034", "(406) 555-0127", ["Diabetes"], "Moderate", 96],
  ["RC-10244", "Robert Johnson", 81, "59011", "(406) 555-0181", ["Heart failure", "Diabetes"], "High", 412],
  ["RC-10712", "Linda Nguyen", 49, "59001", "(406) 555-0165", ["Behavioral health"], "Moderate", 0],
  ["RC-11103", "Thomas Brown", 39, "59083", "(406) 555-0108", ["Hypertension"], "Low", 32]
] as const;

export async function seedDemoData(reset = false) {
  await prisma.$transaction(async (tx) => {
    // Serialize first-run initialization across concurrent serverless requests.
    await tx.$queryRaw`SELECT 'locked'::text AS lock_result FROM (SELECT pg_advisory_xact_lock(22112233)) AS lock_guard`;

    if (!reset && await tx.patient.count() > 0) return;

    if (reset) {
      await tx.auditEvent.deleteMany();
      await tx.financialTransaction.deleteMany();
      await tx.communication.deleteMany();
      await tx.carePlan.deleteMany();
      await tx.referral.deleteMany();
      await tx.task.deleteMany();
      await tx.patient.deleteMany();
      await tx.user.deleteMany();
    }

    // Use bulk inserts instead of dozens of sequential round trips. This keeps
    // the interactive transaction comfortably inside serverless DB timeouts.
    await tx.user.createMany({
      data: demoUsers.map(([name, role]) => ({ name, role }))
    });
    const users = await tx.user.findMany({ where: { role: { in: demoUsers.map(([, role]) => role) } } });
    const userByRole = new Map(users.map((user) => [user.role, user]));

    await tx.patient.createMany({
      data: demoPatients.map(([externalId, name, age, zip, phone, conditions, risk, balance]) => ({
        externalId, name, age, zip, phone, risk, balance,
        initials: name.split(" ").map((part) => part[0]).join(""),
        conditions: JSON.stringify(conditions),
        lastEncounter: "Nov 12, 2026",
        nextAppointment: risk === "High" ? "Overdue" : "Dec 12, 2026"
      }))
    });
    const patients = await tx.patient.findMany({ orderBy: { externalId: "asc" } });
    const patientByExternalId = new Map(patients.map((patient) => [patient.externalId, patient]));

    const tasks = [
      ["Review overdue A1c and renal labs", "Chronic disease follow-up", "High", "In Progress", "RC-10482", "Care Coordinator"],
      ["Confirm cardiology appointment", "Referral coordination", "High", "Waiting for Specialist", "RC-10244", "Nurse"],
      ["Missed appointment outreach", "Patient outreach", "Medium", "New", "RC-10931", "Care Coordinator"],
      ["Review behavioral health feedback", "Specialist feedback", "Medium", "Assigned", "RC-10712", "Physician"],
      ["Patient responsibility follow-up", "Administrative follow-up", "Low", "New", "RC-10077", "Nurse"]
    ] as const;
    await tx.task.createMany({
      data: tasks.map(([title, category, priority, status, patientExternalId, role]) => ({
        externalId: "TSK-" + randomUUID().slice(0, 8).toUpperCase(),
        title, category, priority, status,
        patientId: patientByExternalId.get(patientExternalId)!.id,
        assigneeId: userByRole.get(role)!.id
      }))
    });

    const referrals = [
      ["Cardiology", "Complex chronic disease follow-up", "Urgent", "Sent", "RC-10482", "Care Coordinator"],
      ["Cardiology", "Heart failure review", "Routine", "Feedback Received", "RC-10244", "Nurse"],
      ["Endocrinology", "Diabetes management", "Routine", "Appointment Scheduled", "RC-10077", "Care Coordinator"],
      ["Behavioral Health", "Continuity of behavioral health care", "Routine", "Received", "RC-10712", "Nurse"],
      ["Pulmonology", "COPD assessment", "Urgent", "Patient Unreachable", "RC-10931", "Care Coordinator"]
    ] as const;
    await tx.referral.createMany({
      data: referrals.map(([specialty, reason, priority, status, patientExternalId, role]) => ({
        externalId: "REF-" + randomUUID().slice(0, 8).toUpperCase(),
        specialty, reason, priority, status,
        owner: userByRole.get(role)!.name,
        patientId: patientByExternalId.get(patientExternalId)!.id
      }))
    });

    const plans = [
      ["Diabetes", "RC-10482", ["Improve A1c monitoring", "Review medication adherence"], ["Record A1c every 90 days", "Monthly care coordinator check-in"]],
      ["COPD", "RC-10931", ["Reduce exacerbation risk"], ["Confirm inhaler technique", "Schedule pulmonary review"]],
      ["Diabetes", "RC-10077", ["Maintain glycemic control"], ["Quarterly A1c", "Nutrition counseling"]],
      ["Heart failure", "RC-10244", ["Monitor weight and symptoms"], ["Daily weight education", "Cardiology follow-up"]],
      ["Behavioral health", "RC-10712", ["Maintain continuity of care"], ["Monthly outreach", "Specialist feedback review"]]
    ] as const;
    await tx.carePlan.createMany({
      data: plans.map(([condition, patientExternalId, goals, activities]) => ({
        condition,
        patientId: patientByExternalId.get(patientExternalId)!.id,
        goals: JSON.stringify(goals),
        activities: JSON.stringify(activities)
      }))
    });

    await tx.communication.createMany({
      data: [
        {
          channel: "SMS", template: "Care follow-up reminder", status: "Sent",
          content: "Synthetic reminder: please contact the practice to arrange your follow-up.",
          patientId: patientByExternalId.get("RC-10077")!.id
        },
        {
          channel: "Voice", template: "Appointment reminder", status: "Delivered",
          content: "Synthetic appointment reminder for a routine follow-up.",
          patientId: patientByExternalId.get("RC-10931")!.id
        }
      ]
    });

    await tx.auditEvent.create({
      data: {
        action: reset ? "Demo data reset" : "Demo data initialized",
        entity: "System", entityId: "seed",
        detail: "Initialized a synthetic RuralCare Connect demonstration dataset.",
        actorId: userByRole.get("System Administrator")!.id
      }
    });
  }, {
    maxWait: 10000,
    timeout: 30000
  });
}
