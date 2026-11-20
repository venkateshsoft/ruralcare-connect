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

    const users = [];
    for (const [name, role] of demoUsers) {
      users.push(await tx.user.create({ data: { name, role } }));
    }

    const patients = [];
    for (const [externalId, name, age, zip, phone, conditions, risk, balance] of demoPatients) {
      patients.push(await tx.patient.create({
        data: {
          externalId, name, age, zip, phone, risk, balance,
          initials: name.split(" ").map((part) => part[0]).join(""),
          conditions: JSON.stringify(conditions),
          lastEncounter: "Nov 12, 2026",
          nextAppointment: risk === "High" ? "Overdue" : "Dec 12, 2026"
        }
      }));
    }

    const tasks = [
      ["Review overdue A1c and renal labs", "Chronic disease follow-up", "High", "In Progress", 0, 2],
      ["Confirm cardiology appointment", "Referral coordination", "High", "Waiting for Specialist", 3, 3],
      ["Missed appointment outreach", "Patient outreach", "Medium", "New", 1, 2],
      ["Review behavioral health feedback", "Specialist feedback", "Medium", "Assigned", 4, 1],
      ["Patient responsibility follow-up", "Administrative follow-up", "Low", "New", 2, 3]
    ] as const;
    for (const [title, category, priority, status, patientIndex, userIndex] of tasks) {
      await tx.task.create({
        data: {
          externalId: "TSK-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
          title, category, priority, status,
          patientId: patients[patientIndex].id,
          assigneeId: users[userIndex].id
        }
      });
    }

    const referrals = [
      ["Cardiology", "Complex chronic disease follow-up", "Urgent", "Sent", 0, users[2].name],
      ["Cardiology", "Heart failure review", "Routine", "Feedback Received", 3, users[3].name],
      ["Endocrinology", "Diabetes management", "Routine", "Appointment Scheduled", 2, users[2].name],
      ["Behavioral Health", "Continuity of behavioral health care", "Routine", "Received", 4, users[3].name],
      ["Pulmonology", "COPD assessment", "Urgent", "Patient Unreachable", 1, users[2].name]
    ] as const;
    for (const [specialty, reason, priority, status, patientIndex, owner] of referrals) {
      await tx.referral.create({
        data: {
          externalId: "REF-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
          specialty, reason, priority, status, owner,
          patientId: patients[patientIndex].id
        }
      });
    }

    const plans = [
      ["Diabetes", 0, ["Improve A1c monitoring", "Review medication adherence"], ["Record A1c every 90 days", "Monthly care coordinator check-in"]],
      ["COPD", 1, ["Reduce exacerbation risk"], ["Confirm inhaler technique", "Schedule pulmonary review"]],
      ["Diabetes", 2, ["Maintain glycemic control"], ["Quarterly A1c", "Nutrition counseling"]],
      ["Heart failure", 3, ["Monitor weight and symptoms"], ["Daily weight education", "Cardiology follow-up"]],
      ["Behavioral health", 4, ["Maintain continuity of care"], ["Monthly outreach", "Specialist feedback review"]]
    ] as const;
    for (const [condition, patientIndex, goals, activities] of plans) {
      await tx.carePlan.create({
        data: {
          condition, patientId: patients[patientIndex].id,
          goals: JSON.stringify(goals), activities: JSON.stringify(activities)
        }
      });
    }

    await tx.communication.create({
      data: {
        channel: "SMS", template: "Care follow-up reminder", status: "Sent",
        content: "Synthetic reminder: please contact the practice to arrange your follow-up.",
        patientId: patients[2].id
      }
    });
    await tx.communication.create({
      data: {
        channel: "Voice", template: "Appointment reminder", status: "Delivered",
        content: "Synthetic appointment reminder for a routine follow-up.",
        patientId: patients[1].id
      }
    });
    await tx.auditEvent.create({
      data: {
        action: reset ? "Demo data reset" : "Demo data initialized",
        entity: "System", entityId: "seed",
        detail: "Initialized a synthetic RuralCare Connect demonstration dataset.",
        actorId: users[5].id
      }
    });
  });
}
